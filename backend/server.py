from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import aiofiles
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.oggvorbis import OggVorbis
from mutagen.wave import WAVE
from mutagen.mp4 import MP4
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TDRC, TCON
import mimetypes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Upload directories
UPLOAD_DIR = ROOT_DIR / "uploads"
AUDIO_DIR = UPLOAD_DIR / "audio"
COVERS_DIR = UPLOAD_DIR / "covers"

# Ensure directories exist
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
COVERS_DIR.mkdir(parents=True, exist_ok=True)


# Models
class Song(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    title: str
    artist: str = "Unbekannt"
    album: str = "Unbekannt"
    genre: str = "Unbekannt"
    year: Optional[int] = None
    duration: float = 0.0  # in seconds
    file_path: str
    cover_path: Optional[str] = None
    file_size: int
    likes: int = 0
    upload_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SongCreate(BaseModel):
    title: str
    artist: str = "Unbekannt"
    album: str = "Unbekannt"
    genre: str = "Unbekannt"
    year: Optional[int] = None


class SongUpdate(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    genre: Optional[str] = None
    year: Optional[int] = None


class Playlist(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    song_ids: List[str] = []
    created_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PlaylistCreate(BaseModel):
    name: str
    description: str = ""


class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


# Helper Functions
def extract_metadata(file_path: Path) -> dict:
    """Extract metadata from audio file"""
    metadata = {
        "title": file_path.stem,
        "artist": "Unbekannt",
        "album": "Unbekannt",
        "genre": "Unbekannt",
        "year": None,
        "duration": 0.0
    }
    
    try:
        ext = file_path.suffix.lower()
        audio = None
        
        if ext == '.mp3':
            audio = MP3(file_path)
            if audio.tags:
                metadata["title"] = str(audio.tags.get('TIT2', metadata["title"]))
                metadata["artist"] = str(audio.tags.get('TPE1', metadata["artist"]))
                metadata["album"] = str(audio.tags.get('TALB', metadata["album"]))
                metadata["genre"] = str(audio.tags.get('TCON', metadata["genre"]))
                year_tag = audio.tags.get('TDRC')
                if year_tag:
                    metadata["year"] = int(str(year_tag).split('-')[0]) if str(year_tag) else None
        elif ext == '.flac':
            audio = FLAC(file_path)
            if audio.tags:
                metadata["title"] = audio.tags.get('title', [metadata["title"]])[0]
                metadata["artist"] = audio.tags.get('artist', [metadata["artist"]])[0]
                metadata["album"] = audio.tags.get('album', [metadata["album"]])[0]
                metadata["genre"] = audio.tags.get('genre', [metadata["genre"]])[0]
                year = audio.tags.get('date', [None])[0]
                if year:
                    metadata["year"] = int(year.split('-')[0])
        elif ext == '.ogg':
            audio = OggVorbis(file_path)
            if audio.tags:
                metadata["title"] = audio.tags.get('title', [metadata["title"]])[0]
                metadata["artist"] = audio.tags.get('artist', [metadata["artist"]])[0]
                metadata["album"] = audio.tags.get('album', [metadata["album"]])[0]
                metadata["genre"] = audio.tags.get('genre', [metadata["genre"]])[0]
                year = audio.tags.get('date', [None])[0]
                if year:
                    metadata["year"] = int(year.split('-')[0])
        elif ext == '.wav':
            audio = WAVE(file_path)
        elif ext in ['.m4a', '.mp4']:
            audio = MP4(file_path)
            if audio.tags:
                metadata["title"] = audio.tags.get('\xa9nam', [metadata["title"]])[0]
                metadata["artist"] = audio.tags.get('\xa9ART', [metadata["artist"]])[0]
                metadata["album"] = audio.tags.get('\xa9alb', [metadata["album"]])[0]
                metadata["genre"] = audio.tags.get('\xa9gen', [metadata["genre"]])[0]
                year = audio.tags.get('\xa9day', [None])[0]
                if year:
                    metadata["year"] = int(year.split('-')[0])
        
        if audio:
            metadata["duration"] = audio.info.length
            
    except Exception as e:
        logger.error(f"Error extracting metadata: {e}")
    
    return metadata


# Song Endpoints
@api_router.post("/songs/upload", response_model=Song)
async def upload_song(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    artist: Optional[str] = Form(None),
    album: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    year: Optional[int] = Form(None)
):
    """Upload a new song with optional metadata"""
    
    # Validate file type
    allowed_extensions = ['.mp3', '.flac', '.ogg', '.wav', '.m4a', '.mp4']
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Ungültiges Dateiformat. Erlaubt: MP3, FLAC, OGG, WAV, M4A")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = AUDIO_DIR / filename
    
    # Save file
    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fehler beim Speichern: {str(e)}")
    
    # Extract metadata
    metadata = extract_metadata(file_path)
    
    # Override with user-provided metadata
    if title:
        metadata["title"] = title
    if artist:
        metadata["artist"] = artist
    if album:
        metadata["album"] = album
    if genre:
        metadata["genre"] = genre
    if year:
        metadata["year"] = year
    
    # Get file size
    file_size = file_path.stat().st_size
    
    # Create song object
    song = Song(
        filename=file.filename,
        file_path=str(file_path),
        file_size=file_size,
        **metadata
    )
    
    # Save to database
    doc = song.model_dump()
    doc['upload_date'] = doc['upload_date'].isoformat()
    await db.songs.insert_one(doc)
    
    return song


@api_router.get("/songs", response_model=List[Song])
async def get_songs(search: Optional[str] = None):
    """Get all songs or search by title/artist/album"""
    query = {}
    if search:
        query = {
            "$or": [
                {"title": {"$regex": search, "$options": "i"}},
                {"artist": {"$regex": search, "$options": "i"}},
                {"album": {"$regex": search, "$options": "i"}},
                {"genre": {"$regex": search, "$options": "i"}}
            ]
        }
    
    songs = await db.songs.find(query, {"_id": 0}).to_list(1000)
    
    # Convert timestamps
    for song in songs:
        if isinstance(song['upload_date'], str):
            song['upload_date'] = datetime.fromisoformat(song['upload_date'])
    
    return songs


@api_router.get("/songs/{song_id}", response_model=Song)
async def get_song(song_id: str):
    """Get a specific song by ID"""
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    
    if isinstance(song['upload_date'], str):
        song['upload_date'] = datetime.fromisoformat(song['upload_date'])
    
    return song


@api_router.put("/songs/{song_id}", response_model=Song)
async def update_song(song_id: str, update_data: SongUpdate):
    """Update song metadata"""
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    
    # Update fields
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.songs.update_one({"id": song_id}, {"$set": update_dict})
        song.update(update_dict)
    
    if isinstance(song['upload_date'], str):
        song['upload_date'] = datetime.fromisoformat(song['upload_date'])
    
    return song


@api_router.delete("/songs/{song_id}")
async def delete_song(song_id: str):
    """Delete a song and its file"""
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    
    # Delete file
    file_path = Path(song['file_path'])
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.songs.delete_one({"id": song_id})
    
    # Remove from all playlists
    await db.playlists.update_many(
        {"song_ids": song_id},
        {"$pull": {"song_ids": song_id}}
    )
    
    return {"message": "Song erfolgreich gelöscht"}


@api_router.get("/songs/{song_id}/stream")
async def stream_song(song_id: str):
    """Stream a song for playback"""
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    
    file_path = Path(song['file_path'])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    
    # Get media type
    media_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    
    return FileResponse(file_path, media_type=media_type)


@api_router.get("/songs/{song_id}/download")
async def download_song(song_id: str):
    """Download a song"""
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    
    file_path = Path(song['file_path'])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    
    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=song['filename']
    )


@api_router.post("/songs/{song_id}/like")
async def toggle_like(song_id: str):
    """Toggle like for a song"""
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    
    # For simplicity, just increment likes (in real app, track per user)
    new_likes = song.get('likes', 0) + 1
    await db.songs.update_one({"id": song_id}, {"$set": {"likes": new_likes}})
    
    return {"likes": new_likes}


# Playlist Endpoints
@api_router.post("/playlists", response_model=Playlist)
async def create_playlist(playlist_data: PlaylistCreate):
    """Create a new playlist"""
    playlist = Playlist(**playlist_data.model_dump())
    
    doc = playlist.model_dump()
    doc['created_date'] = doc['created_date'].isoformat()
    await db.playlists.insert_one(doc)
    
    return playlist


@api_router.get("/playlists", response_model=List[Playlist])
async def get_playlists():
    """Get all playlists"""
    playlists = await db.playlists.find({}, {"_id": 0}).to_list(1000)
    
    for playlist in playlists:
        if isinstance(playlist['created_date'], str):
            playlist['created_date'] = datetime.fromisoformat(playlist['created_date'])
    
    return playlists


@api_router.get("/playlists/{playlist_id}", response_model=Playlist)
async def get_playlist(playlist_id: str):
    """Get a specific playlist"""
    playlist = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist nicht gefunden")
    
    if isinstance(playlist['created_date'], str):
        playlist['created_date'] = datetime.fromisoformat(playlist['created_date'])
    
    return playlist


@api_router.put("/playlists/{playlist_id}", response_model=Playlist)
async def update_playlist(playlist_id: str, update_data: PlaylistUpdate):
    """Update playlist metadata"""
    playlist = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist nicht gefunden")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.playlists.update_one({"id": playlist_id}, {"$set": update_dict})
        playlist.update(update_dict)
    
    if isinstance(playlist['created_date'], str):
        playlist['created_date'] = datetime.fromisoformat(playlist['created_date'])
    
    return playlist


@api_router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str):
    """Delete a playlist"""
    result = await db.playlists.delete_one({"id": playlist_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Playlist nicht gefunden")
    
    return {"message": "Playlist erfolgreich gelöscht"}


@api_router.post("/playlists/{playlist_id}/songs/{song_id}")
async def add_song_to_playlist(playlist_id: str, song_id: str):
    """Add a song to a playlist"""
    # Check if playlist exists
    playlist = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist nicht gefunden")
    
    # Check if song exists
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    
    # Check if already in playlist
    if song_id in playlist.get('song_ids', []):
        raise HTTPException(status_code=400, detail="Song bereits in Playlist")
    
    # Add song
    await db.playlists.update_one(
        {"id": playlist_id},
        {"$push": {"song_ids": song_id}}
    )
    
    return {"message": "Song zur Playlist hinzugefügt"}


@api_router.delete("/playlists/{playlist_id}/songs/{song_id}")
async def remove_song_from_playlist(playlist_id: str, song_id: str):
    """Remove a song from a playlist"""
    playlist = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist nicht gefunden")
    
    # Remove song
    await db.playlists.update_one(
        {"id": playlist_id},
        {"$pull": {"song_ids": song_id}}
    )
    
    return {"message": "Song aus Playlist entfernt"}


# Stats endpoint
@api_router.get("/stats")
async def get_stats():
    """Get overall statistics"""
    total_songs = await db.songs.count_documents({})
    total_playlists = await db.playlists.count_documents({})
    
    # Get total storage used
    songs = await db.songs.find({}, {"_id": 0, "file_size": 1}).to_list(1000)
    total_size = sum(song.get('file_size', 0) for song in songs)
    
    return {
        "total_songs": total_songs,
        "total_playlists": total_playlists,
        "total_storage_bytes": total_size,
        "total_storage_mb": round(total_size / (1024 * 1024), 2)
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
