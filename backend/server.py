from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, Request, Response, Depends
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import aiofiles
from mutagen.mp3 import MP3
from mutagen.flac import FLAC
from mutagen.oggvorbis import OggVorbis
from mutagen.wave import WAVE
from mutagen.mp4 import MP4
import mimetypes

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
AVATARS_DIR = UPLOAD_DIR / "avatars"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
COVERS_DIR.mkdir(parents=True, exist_ok=True)
AVATARS_DIR.mkdir(parents=True, exist_ok=True)

JWT_ALGORITHM = "HS256"
MAX_UPLOAD_SIZE_MB = 50
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024

# ─── Password Hashing ────────────────────────────────────────────────

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(minutes=15), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")

# ─── Auth Helper ─────────────────────────────────────────────────────

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Nicht authentifiziert")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Ungültiger Token-Typ")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token abgelaufen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ungültiger Token")

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# ─── Pydantic Models ─────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    is_public: Optional[bool] = None

class SongUpdate(BaseModel):
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    genre: Optional[str] = None
    year: Optional[int] = None

class PlaylistCreate(BaseModel):
    name: str
    description: str = ""
    is_public: bool = False

class PlaylistUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None

# ─── Helper: format user for response ────────────────────────────────

def format_user(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "bio": user.get("bio", ""),
        "avatar_url": user.get("avatar_url", ""),
        "is_public": user.get("is_public", True),
        "role": user.get("role", "user"),
        "created_at": user.get("created_at", ""),
    }

# ─── Helper: extract audio metadata ──────────────────────────────────

TAG_MAP_VORBIS = {'title': 'title', 'artist': 'artist', 'album': 'album', 'genre': 'genre'}
TAG_MAP_MP4 = {'\xa9nam': 'title', '\xa9ART': 'artist', '\xa9alb': 'album', '\xa9gen': 'genre'}
YEAR_TAG_VORBIS = 'date'
YEAR_TAG_MP4 = '\xa9day'

AUDIO_LOADERS = {
    '.mp3': lambda p: MP3(p),
    '.flac': lambda p: FLAC(p),
    '.ogg': lambda p: OggVorbis(p),
    '.wav': lambda p: WAVE(p),
    '.m4a': lambda p: MP4(p),
    '.mp4': lambda p: MP4(p),
}


def _parse_year(raw: str) -> Optional[int]:
    if not raw:
        return None
    try:
        return int(str(raw).split('-')[0])
    except (ValueError, IndexError):
        return None


def _extract_mp3_tags(audio, metadata: dict) -> None:
    tags = audio.tags
    if not tags:
        return
    metadata["title"] = str(tags.get('TIT2', metadata["title"]))
    metadata["artist"] = str(tags.get('TPE1', metadata["artist"]))
    metadata["album"] = str(tags.get('TALB', metadata["album"]))
    metadata["genre"] = str(tags.get('TCON', metadata["genre"]))
    metadata["year"] = _parse_year(tags.get('TDRC'))


def _extract_vorbis_tags(audio, metadata: dict) -> None:
    tags = audio.tags
    if not tags:
        return
    for src_key, dest_key in TAG_MAP_VORBIS.items():
        val = tags.get(src_key)
        if val:
            metadata[dest_key] = val[0]
    metadata["year"] = _parse_year(tags.get(YEAR_TAG_VORBIS, [None])[0])


def _extract_mp4_tags(audio, metadata: dict) -> None:
    tags = audio.tags
    if not tags:
        return
    for src_key, dest_key in TAG_MAP_MP4.items():
        val = tags.get(src_key)
        if val:
            metadata[dest_key] = val[0]
    metadata["year"] = _parse_year(tags.get(YEAR_TAG_MP4, [None])[0])


TAG_EXTRACTORS = {
    '.mp3': _extract_mp3_tags,
    '.flac': _extract_vorbis_tags,
    '.ogg': _extract_vorbis_tags,
    '.m4a': _extract_mp4_tags,
    '.mp4': _extract_mp4_tags,
}


def _is_uuid_like(text: str) -> bool:
    """Check if text looks like a UUID (used as filename on disk)."""
    import re
    return bool(re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', text, re.IGNORECASE))


def extract_metadata(file_path: Path, original_filename: str = None) -> dict:
    """Extract audio metadata. Uses original_filename as title fallback instead of UUID disk name."""
    if original_filename:
        fallback_title = Path(original_filename).stem
    else:
        fallback_title = file_path.stem

    # If fallback is still UUID-like, clean it up
    if _is_uuid_like(fallback_title):
        fallback_title = "Unbekannter Titel"

    metadata = {
        "title": fallback_title,
        "artist": "Unbekannt",
        "album": "Unbekannt",
        "genre": "Unbekannt",
        "year": None,
        "duration": 0.0,
    }
    ext = file_path.suffix.lower()
    loader = AUDIO_LOADERS.get(ext)
    if not loader:
        return metadata
    try:
        audio = loader(file_path)
        extractor = TAG_EXTRACTORS.get(ext)
        if extractor:
            extractor(audio, metadata)
        metadata["duration"] = round(audio.info.length, 2)
    except Exception as e:
        logger.error(f"Error extracting metadata from {file_path.name}: {e}")
    return metadata

# ─── Helper: format song for response ────────────────────────────────

def format_song(song: dict) -> dict:
    s = {k: v for k, v in song.items() if k != "_id"}
    if isinstance(s.get("upload_date"), str):
        pass  # already string
    elif isinstance(s.get("upload_date"), datetime):
        s["upload_date"] = s["upload_date"].isoformat()
    return s

def format_playlist(pl: dict) -> dict:
    p = {k: v for k, v in pl.items() if k != "_id"}
    if isinstance(p.get("created_date"), datetime):
        p["created_date"] = p["created_date"].isoformat()
    return p

# ═══════════════════════════════════════════════════════════════════════
# AUTH ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    email = data.email.strip().lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Passwort muss mindestens 6 Zeichen haben")
    if len(data.username.strip()) < 2:
        raise HTTPException(status_code=400, detail="Benutzername muss mindestens 2 Zeichen haben")

    user_doc = {
        "username": data.username.strip(),
        "email": email,
        "password_hash": hash_password(data.password),
        "bio": "",
        "avatar_url": "",
        "is_public": True,
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    user_doc["_id"] = user_id
    return {"user": format_user(user_doc), "token": access_token}


@api_router.post("/auth/login")
async def login(data: LoginRequest, request: Request, response: Response):
    email = data.email.strip().lower()
    identifier = email  # Use email only (IP unreliable behind load balancers)

    # Brute force check
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = attempt.get("locked_until")
        if locked_until and datetime.now(timezone.utc) < datetime.fromisoformat(locked_until):
            raise HTTPException(status_code=429, detail="Zu viele Versuche. Bitte 15 Minuten warten.")
        else:
            await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        # Increment failed attempts
        current = await db.login_attempts.find_one({"identifier": identifier})
        new_count = (current.get("count", 0) if current else 0) + 1
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$set": {"count": new_count, "locked_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")

    # Clear failed attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return {"user": format_user(user), "token": access_token}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Erfolgreich abgemeldet"}


@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {"user": format_user(user)}


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Kein Refresh-Token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Ungültiger Token-Typ")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
        user_id = str(user["_id"])
        new_access = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=new_access, httponly=True, secure=False, samesite="lax", max_age=900, path="/")
        return {"user": format_user(user), "token": new_access}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh-Token abgelaufen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ungültiger Refresh-Token")


# ═══════════════════════════════════════════════════════════════════════
# USER ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

@api_router.get("/users/me")
async def get_user_profile(request: Request):
    user = await get_current_user(request)
    # Count followers/following
    followers_count = await db.followers.count_documents({"following_id": user["_id"]})
    following_count = await db.followers.count_documents({"follower_id": user["_id"]})
    songs_count = await db.songs.count_documents({"owner_id": user["_id"]})
    u = format_user(user)
    u["followers_count"] = followers_count
    u["following_count"] = following_count
    u["songs_count"] = songs_count
    return u

@api_router.put("/users/me")
async def update_user_profile(data: UserUpdate, request: Request):
    user = await get_current_user(request)
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_dict:
        await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": update_dict})
    updated = await db.users.find_one({"_id": ObjectId(user["_id"])})
    return format_user(updated)

@api_router.post("/users/me/avatar")
async def upload_avatar(request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    ext = Path(file.filename).suffix.lower()
    if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
        raise HTTPException(status_code=400, detail="Nur JPG, PNG oder WebP erlaubt")
    filename = f"{user['_id']}{ext}"
    file_path = AVATARS_DIR / filename
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(await file.read())
    avatar_url = f"/api/avatars/{filename}"
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"avatar_url": avatar_url}})
    return {"avatar_url": avatar_url}

@api_router.get("/avatars/{filename}")
async def get_avatar(filename: str):
    file_path = AVATARS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Avatar nicht gefunden")
    return FileResponse(file_path)


# ═══════════════════════════════════════════════════════════════════════
# SONG ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

@api_router.post("/songs/upload")
async def upload_song(
    request: Request,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    artist: Optional[str] = Form(None),
    album: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    year: Optional[int] = Form(None)
):
    user = await get_current_user(request)
    allowed_extensions = ['.mp3', '.flac', '.ogg', '.wav', '.m4a', '.mp4']
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Ungültiges Dateiformat. Erlaubt: MP3, FLAC, OGG, WAV, M4A")

    # Early size check via Content-Length header
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"Datei zu gross. Maximum: {MAX_UPLOAD_SIZE_MB} MB")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}{file_ext}"
    file_path = AUDIO_DIR / filename

    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"Datei zu gross. Maximum: {MAX_UPLOAD_SIZE_MB} MB")

    async with aiofiles.open(file_path, 'wb') as out_file:
        await out_file.write(content)

    metadata = extract_metadata(file_path, original_filename=file.filename)
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

    file_size = file_path.stat().st_size

    song_doc = {
        "id": file_id,
        "owner_id": user["_id"],
        "filename": file.filename,
        "file_path": str(file_path),
        "file_size": file_size,
        "likes_count": 0,
        "upload_date": datetime.now(timezone.utc).isoformat(),
        **metadata,
    }
    await db.songs.insert_one(song_doc)
    return format_song(song_doc)


@api_router.get("/songs")
async def get_songs(request: Request, search: Optional[str] = None, page: int = 1, limit: int = 50):
    user = await get_current_user(request)
    query = {"owner_id": user["_id"]}
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"artist": {"$regex": search, "$options": "i"}},
            {"album": {"$regex": search, "$options": "i"}},
            {"genre": {"$regex": search, "$options": "i"}},
        ]
    limit = min(limit, 200)
    skip = (max(page, 1) - 1) * limit
    songs = await db.songs.find(query, {"_id": 0}).sort("upload_date", -1).skip(skip).limit(limit).to_list(limit)
    # Check which songs the user has liked
    song_ids = [s["id"] for s in songs]
    user_likes = await db.likes.find({"user_id": user["_id"], "music_id": {"$in": song_ids}}, {"music_id": 1}).to_list(len(song_ids))
    liked_ids = {like["music_id"] for like in user_likes}
    for s in songs:
        s["is_liked"] = s["id"] in liked_ids
    return songs


@api_router.get("/songs/{song_id}")
async def get_song(song_id: str, request: Request):
    user = await get_current_user(request)
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    like = await db.likes.find_one({"user_id": user["_id"], "music_id": song_id})
    song["is_liked"] = like is not None
    return format_song(song)


@api_router.put("/songs/{song_id}")
async def update_song(song_id: str, update_data: SongUpdate, request: Request):
    user = await get_current_user(request)
    song = await db.songs.find_one({"id": song_id, "owner_id": user["_id"]})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden oder keine Berechtigung")
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if update_dict:
        await db.songs.update_one({"id": song_id}, {"$set": update_dict})
    updated = await db.songs.find_one({"id": song_id}, {"_id": 0})
    return format_song(updated)


@api_router.delete("/songs/{song_id}")
async def delete_song(song_id: str, request: Request):
    user = await get_current_user(request)
    song = await db.songs.find_one({"id": song_id, "owner_id": user["_id"]})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden oder keine Berechtigung")
    file_path = Path(song['file_path'])
    if file_path.exists():
        file_path.unlink()
    await db.songs.delete_one({"id": song_id})
    await db.playlists.update_many({"song_ids": song_id}, {"$pull": {"song_ids": song_id}})
    await db.likes.delete_many({"music_id": song_id})
    return {"message": "Song erfolgreich gelöscht"}


@api_router.get("/songs/{song_id}/stream")
async def stream_song(song_id: str):
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    file_path = Path(song['file_path'])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    media_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    return FileResponse(file_path, media_type=media_type)


@api_router.get("/songs/{song_id}/download")
async def download_song(song_id: str):
    song = await db.songs.find_one({"id": song_id}, {"_id": 0})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    file_path = Path(song['file_path'])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Datei nicht gefunden")
    return FileResponse(file_path, media_type="application/octet-stream", filename=song['filename'])


# ─── Likes ────────────────────────────────────────────────────────────

@api_router.post("/songs/{song_id}/like")
async def toggle_like(song_id: str, request: Request):
    user = await get_current_user(request)
    song = await db.songs.find_one({"id": song_id})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    existing = await db.likes.find_one({"user_id": user["_id"], "music_id": song_id})
    if existing:
        await db.likes.delete_one({"_id": existing["_id"]})
        await db.songs.update_one({"id": song_id}, {"$inc": {"likes_count": -1}})
        return {"is_liked": False}
    else:
        await db.likes.insert_one({"user_id": user["_id"], "music_id": song_id, "created_at": datetime.now(timezone.utc).isoformat()})
        await db.songs.update_one({"id": song_id}, {"$inc": {"likes_count": 1}})
        return {"is_liked": True}


@api_router.get("/songs/liked/all")
async def get_liked_songs(request: Request):
    user = await get_current_user(request)
    likes = await db.likes.find({"user_id": user["_id"]}).to_list(5000)
    song_ids = [like["music_id"] for like in likes]
    songs = await db.songs.find({"id": {"$in": song_ids}}, {"_id": 0}).to_list(5000)
    for s in songs:
        s["is_liked"] = True
    return songs


# ═══════════════════════════════════════════════════════════════════════
# PLAYLIST ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════

@api_router.post("/playlists")
async def create_playlist(data: PlaylistCreate, request: Request):
    user = await get_current_user(request)
    pl_id = str(uuid.uuid4())
    doc = {
        "id": pl_id,
        "owner_id": user["_id"],
        "name": data.name,
        "description": data.description,
        "is_public": data.is_public,
        "cover_url": "",
        "song_ids": [],
        "created_date": datetime.now(timezone.utc).isoformat(),
    }
    await db.playlists.insert_one(doc)
    return format_playlist(doc)


@api_router.get("/playlists")
async def get_playlists(request: Request):
    user = await get_current_user(request)
    playlists = await db.playlists.find({"owner_id": user["_id"]}, {"_id": 0}).to_list(500)
    return [format_playlist(p) for p in playlists]


@api_router.get("/playlists/{playlist_id}")
async def get_playlist(playlist_id: str, request: Request):
    user = await get_current_user(request)
    pl = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist nicht gefunden")
    # Get songs in playlist
    songs = []
    if pl.get("song_ids"):
        songs_cursor = await db.songs.find({"id": {"$in": pl["song_ids"]}}, {"_id": 0}).to_list(500)
        # Maintain order
        song_map = {s["id"]: format_song(s) for s in songs_cursor}
        songs = [song_map[sid] for sid in pl["song_ids"] if sid in song_map]
        # Check likes
        user_likes = await db.likes.find({"user_id": user["_id"]}, {"music_id": 1}).to_list(5000)
        liked_ids = {like["music_id"] for like in user_likes}
        for s in songs:
            s["is_liked"] = s["id"] in liked_ids
    result = format_playlist(pl)
    result["songs"] = songs
    return result


@api_router.put("/playlists/{playlist_id}")
async def update_playlist(playlist_id: str, data: PlaylistUpdate, request: Request):
    user = await get_current_user(request)
    pl = await db.playlists.find_one({"id": playlist_id, "owner_id": user["_id"]})
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist nicht gefunden oder keine Berechtigung")
    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_dict:
        await db.playlists.update_one({"id": playlist_id}, {"$set": update_dict})
    updated = await db.playlists.find_one({"id": playlist_id}, {"_id": 0})
    return format_playlist(updated)


@api_router.delete("/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.playlists.delete_one({"id": playlist_id, "owner_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Playlist nicht gefunden oder keine Berechtigung")
    return {"message": "Playlist erfolgreich gelöscht"}


@api_router.post("/playlists/{playlist_id}/songs/{song_id}")
async def add_song_to_playlist(playlist_id: str, song_id: str, request: Request):
    user = await get_current_user(request)
    pl = await db.playlists.find_one({"id": playlist_id, "owner_id": user["_id"]})
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist nicht gefunden")
    song = await db.songs.find_one({"id": song_id})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    if song_id in pl.get("song_ids", []):
        raise HTTPException(status_code=400, detail="Song bereits in Playlist")
    await db.playlists.update_one({"id": playlist_id}, {"$push": {"song_ids": song_id}})
    return {"message": "Song zur Playlist hinzugefügt"}


@api_router.delete("/playlists/{playlist_id}/songs/{song_id}")
async def remove_song_from_playlist(playlist_id: str, song_id: str, request: Request):
    user = await get_current_user(request)
    pl = await db.playlists.find_one({"id": playlist_id, "owner_id": user["_id"]})
    if not pl:
        raise HTTPException(status_code=404, detail="Playlist nicht gefunden")
    await db.playlists.update_one({"id": playlist_id}, {"$pull": {"song_ids": song_id}})
    return {"message": "Song aus Playlist entfernt"}


# ═══════════════════════════════════════════════════════════════════════
# STATS & SEARCH
# ═══════════════════════════════════════════════════════════════════════

@api_router.get("/stats")
async def get_stats(request: Request):
    user = await get_current_user(request)
    total_songs = await db.songs.count_documents({"owner_id": user["_id"]})
    total_playlists = await db.playlists.count_documents({"owner_id": user["_id"]})
    songs = await db.songs.find({"owner_id": user["_id"]}, {"_id": 0, "file_size": 1}).to_list(5000)
    total_size = sum(s.get("file_size", 0) for s in songs)
    liked_count = await db.likes.count_documents({"user_id": user["_id"]})
    return {
        "total_songs": total_songs,
        "total_playlists": total_playlists,
        "total_storage_bytes": total_size,
        "total_storage_mb": round(total_size / (1024 * 1024), 2),
        "liked_songs": liked_count,
    }

@api_router.get("/search")
async def search_all(q: str, request: Request):
    user = await get_current_user(request)
    regex = {"$regex": q, "$options": "i"}
    songs = await db.songs.find(
        {"owner_id": user["_id"], "$or": [{"title": regex}, {"artist": regex}, {"album": regex}, {"genre": regex}]},
        {"_id": 0}
    ).to_list(50)
    playlists = await db.playlists.find(
        {"owner_id": user["_id"], "$or": [{"name": regex}, {"description": regex}]},
        {"_id": 0}
    ).to_list(50)
    # Unique artists from user's songs
    artists_pipeline = [
        {"$match": {"owner_id": user["_id"], "artist": regex}},
        {"$group": {"_id": "$artist", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    artists = await db.songs.aggregate(artists_pipeline).to_list(20)
    return {
        "songs": [format_song(s) for s in songs],
        "playlists": [format_playlist(p) for p in playlists],
        "artists": [{"name": a["_id"], "song_count": a["count"]} for a in artists],
    }

# ─── Artists / Albums aggregation ────────────────────────────────────

@api_router.get("/artists")
async def get_artists(request: Request):
    user = await get_current_user(request)
    pipeline = [
        {"$match": {"owner_id": user["_id"]}},
        {"$group": {"_id": "$artist", "song_count": {"$sum": 1}, "total_duration": {"$sum": "$duration"}}},
        {"$sort": {"song_count": -1}},
    ]
    artists = await db.songs.aggregate(pipeline).to_list(500)
    return [{"name": a["_id"], "song_count": a["song_count"], "total_duration": round(a["total_duration"], 1)} for a in artists]


@api_router.get("/artists/{artist_name}/songs")
async def get_artist_songs(artist_name: str, request: Request):
    user = await get_current_user(request)
    songs = await db.songs.find({"owner_id": user["_id"], "artist": {"$regex": f"^{artist_name}$", "$options": "i"}}, {"_id": 0}).to_list(500)
    return [format_song(s) for s in songs]


@api_router.get("/albums")
async def get_albums(request: Request):
    user = await get_current_user(request)
    pipeline = [
        {"$match": {"owner_id": user["_id"], "album": {"$ne": "Unbekannt"}}},
        {"$group": {"_id": {"album": "$album", "artist": "$artist"}, "song_count": {"$sum": 1}, "total_duration": {"$sum": "$duration"}}},
        {"$sort": {"_id.album": 1}},
    ]
    albums = await db.songs.aggregate(pipeline).to_list(500)
    return [{"name": a["_id"]["album"], "artist": a["_id"]["artist"], "song_count": a["song_count"], "total_duration": round(a["total_duration"], 1)} for a in albums]


@api_router.get("/albums/{album_name}/songs")
async def get_album_songs(album_name: str, request: Request):
    user = await get_current_user(request)
    songs = await db.songs.find(
        {"owner_id": user["_id"], "album": {"$regex": f"^{album_name}$", "$options": "i"}},
        {"_id": 0}
    ).to_list(500)
    return [format_song(s) for s in songs]


# ═══════════════════════════════════════════════════════════════════════
# PLAY HISTORY
# ═══════════════════════════════════════════════════════════════════════

@api_router.post("/history/{song_id}")
async def add_to_history(song_id: str, request: Request):
    user = await get_current_user(request)
    song = await db.songs.find_one({"id": song_id})
    if not song:
        raise HTTPException(status_code=404, detail="Song nicht gefunden")
    now = datetime.now(timezone.utc).isoformat()
    await db.history.update_one(
        {"user_id": user["_id"], "song_id": song_id},
        {"$set": {"played_at": now}, "$inc": {"play_count": 1}},
        upsert=True
    )
    # Also log to detailed play_log for weekly stats
    await db.play_log.insert_one({
        "user_id": user["_id"],
        "song_id": song_id,
        "played_at": now,
        "duration": song.get("duration", 0),
    })
    return {"status": "ok"}


@api_router.get("/history")
async def get_history(request: Request, limit: int = 20):
    user = await get_current_user(request)
    history = await db.history.find({"user_id": user["_id"]}).sort("played_at", -1).limit(limit).to_list(limit)
    song_ids = [h["song_id"] for h in history]
    songs = await db.songs.find({"id": {"$in": song_ids}}, {"_id": 0}).to_list(500)
    song_map = {s["id"]: format_song(s) for s in songs}
    result = []
    for h in history:
        s = song_map.get(h["song_id"])
        if s:
            s["played_at"] = h.get("played_at", "")
            s["play_count"] = h.get("play_count", 1)
            result.append(s)
    return result


@api_router.get("/history/stats")
async def get_history_stats(request: Request):
    user = await get_current_user(request)
    total_plays = 0
    history = await db.history.find({"user_id": user["_id"]}).to_list(5000)
    total_plays = sum(h.get("play_count", 1) for h in history)

    # Top songs
    top_songs_pipeline = [
        {"$match": {"user_id": user["_id"]}},
        {"$sort": {"play_count": -1}},
        {"$limit": 10}
    ]
    top_history = await db.history.aggregate(top_songs_pipeline).to_list(10)
    top_song_ids = [h["song_id"] for h in top_history]
    top_songs_data = await db.songs.find({"id": {"$in": top_song_ids}}, {"_id": 0}).to_list(10)
    song_map = {s["id"]: s for s in top_songs_data}
    top_songs = []
    for h in top_history:
        s = song_map.get(h["song_id"])
        if s:
            top_songs.append({"title": s["title"], "artist": s["artist"], "play_count": h.get("play_count", 1)})

    # Top artists
    top_artists_pipeline = [
        {"$match": {"user_id": user["_id"]}},
        {"$lookup": {"from": "songs", "localField": "song_id", "foreignField": "id", "as": "song"}},
        {"$unwind": "$song"},
        {"$group": {"_id": "$song.artist", "total_plays": {"$sum": "$play_count"}}},
        {"$sort": {"total_plays": -1}},
        {"$limit": 5}
    ]
    top_artists = await db.history.aggregate(top_artists_pipeline).to_list(5)

    return {
        "total_plays": total_plays,
        "unique_songs": len(history),
        "top_songs": top_songs,
        "top_artists": [{"name": a["_id"], "plays": a["total_plays"]} for a in top_artists],
    }


# ═══════════════════════════════════════════════════════════════════════
# WEEKLY STATS ("Jetzt hören")
# ═══════════════════════════════════════════════════════════════════════

def _get_week_start() -> str:
    """Get ISO string of the start of the current week (Monday 00:00 UTC)."""
    now = datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()


@api_router.get("/stats/weekly")
async def get_weekly_stats(request: Request):
    """Personal weekly listening stats for 'Jetzt hören' dashboard card."""
    user = await get_current_user(request)
    week_start = _get_week_start()

    # Get all play_log entries this week
    week_logs = await db.play_log.find({
        "user_id": user["_id"],
        "played_at": {"$gte": week_start}
    }).to_list(5000)

    if not week_logs:
        return {
            "has_data": False,
            "total_plays": 0,
            "total_minutes": 0,
            "top_songs": [],
            "top_artists": [],
            "new_discoveries": 0,
            "week_start": week_start,
        }

    total_plays = len(week_logs)
    total_seconds = sum(log.get("duration", 0) for log in week_logs)
    total_minutes = round(total_seconds / 60, 1)

    # Get unique song_ids played this week
    week_song_ids = list({log["song_id"] for log in week_logs})

    # Count plays per song
    song_play_counts = {}
    song_total_time = {}
    for log in week_logs:
        sid = log["song_id"]
        song_play_counts[sid] = song_play_counts.get(sid, 0) + 1
        song_total_time[sid] = song_total_time.get(sid, 0) + log.get("duration", 0)

    # Get song details
    songs_data = await db.songs.find({"id": {"$in": week_song_ids}}, {"_id": 0}).to_list(len(week_song_ids))
    song_map = {s["id"]: s for s in songs_data}

    # Top 5 songs
    sorted_songs = sorted(song_play_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    top_songs = []
    for sid, count in sorted_songs:
        s = song_map.get(sid)
        if s:
            top_songs.append({
                "id": sid,
                "title": s["title"],
                "artist": s["artist"],
                "play_count": count,
                "total_seconds": round(song_total_time.get(sid, 0), 1),
            })

    # Top 3 artists
    artist_plays = {}
    artist_time = {}
    for log in week_logs:
        s = song_map.get(log["song_id"])
        if s:
            artist = s.get("artist", "Unbekannt")
            artist_plays[artist] = artist_plays.get(artist, 0) + 1
            artist_time[artist] = artist_time.get(artist, 0) + log.get("duration", 0)
    sorted_artists = sorted(artist_plays.items(), key=lambda x: x[1], reverse=True)[:3]
    top_artists = [{"name": name, "play_count": count, "total_minutes": round(artist_time.get(name, 0) / 60, 1)} for name, count in sorted_artists]

    # New discoveries (songs first played this week that weren't played before)
    pre_week_songs = await db.play_log.distinct("song_id", {
        "user_id": user["_id"],
        "played_at": {"$lt": week_start}
    })
    new_discoveries = len(set(week_song_ids) - set(pre_week_songs))

    return {
        "has_data": True,
        "total_plays": total_plays,
        "total_minutes": total_minutes,
        "total_hours": round(total_seconds / 3600, 1),
        "top_songs": top_songs,
        "top_artists": top_artists,
        "new_discoveries": new_discoveries,
        "unique_songs": len(week_song_ids),
        "week_start": week_start,
    }


# ═══════════════════════════════════════════════════════════════════════
# ADMIN: METADATA MIGRATION
# ═══════════════════════════════════════════════════════════════════════

@api_router.post("/admin/migrate-metadata")
async def migrate_metadata(request: Request):
    """Re-extract metadata for all songs with UUID-like titles or missing durations."""
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Nur Admins erlaubt")
    count = await _run_metadata_migration()
    return {"message": f"{count} Songs aktualisiert"}


async def _run_metadata_migration() -> int:
    """Internal migration: fix UUID titles, missing durations, 'Unbekannt' artists, and orphaned songs."""
    songs = await db.songs.find({}, {"_id": 0}).to_list(None)
    updated = 0

    # Get admin user for assigning orphaned songs
    admin = await db.users.find_one({"role": "admin"})
    admin_id = str(admin["_id"]) if admin else None

    for song in songs:
        file_path = Path(song.get("file_path", ""))
        if not file_path.exists():
            continue
        original_filename = song.get("filename", "")
        new_meta = extract_metadata(file_path, original_filename=original_filename)

        update_fields = {}
        current_title = song.get("title", "")
        # Fix UUID-like titles
        if _is_uuid_like(current_title) or current_title == file_path.stem:
            update_fields["title"] = new_meta["title"]
        # Fix missing/zero durations or unrounded durations
        current_dur = song.get("duration", 0)
        if not current_dur or current_dur == 0:
            update_fields["duration"] = new_meta["duration"]
        elif current_dur != round(current_dur, 2):
            update_fields["duration"] = round(current_dur, 2)
        # Fix 'Unbekannt' artist if better data available
        if song.get("artist") == "Unbekannt" and new_meta["artist"] != "Unbekannt":
            update_fields["artist"] = new_meta["artist"]
        if song.get("album") == "Unbekannt" and new_meta["album"] != "Unbekannt":
            update_fields["album"] = new_meta["album"]
        if song.get("genre") == "Unbekannt" and new_meta["genre"] != "Unbekannt":
            update_fields["genre"] = new_meta["genre"]
        # Fix orphaned songs (no owner_id)
        if not song.get("owner_id") and admin_id:
            update_fields["owner_id"] = admin_id

        if update_fields:
            await db.songs.update_one({"id": song["id"]}, {"$set": update_fields})
            updated += 1
            logger.info(f"Migrated song '{song['id']}': {update_fields}")
    return updated


# ═══════════════════════════════════════════════════════════════════════
# APP SETUP
# ═══════════════════════════════════════════════════════════════════════

app.include_router(api_router)

# Health check endpoint (must respond before MongoDB is ready)
@app.get("/")
async def health_check():
    return {"status": "ok"}

@app.get("/api/health")
async def api_health():
    return {"status": "ok"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    try:
        # Create indexes
        await db.users.create_index("email", unique=True)
        await db.login_attempts.create_index("identifier")
        await db.songs.create_index("owner_id")
        await db.songs.create_index("id", unique=True)
        await db.playlists.create_index("owner_id")
        await db.likes.create_index([("user_id", 1), ("music_id", 1)], unique=True)
        await db.play_log.create_index([("user_id", 1), ("played_at", -1)])
        await db.play_log.create_index("song_id")
        logger.info("Database indexes created")
    except Exception as e:
        logger.warning(f"Index creation issue (may already exist): {e}")

    try:
        # Seed admin
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@444hf.de")
        admin_password = os.environ.get("ADMIN_PASSWORD", "HeimatFunk444!")
        existing = await db.users.find_one({"email": admin_email})
        if existing is None:
            await db.users.insert_one({
                "username": "Admin",
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "bio": "Administrator",
                "avatar_url": "",
                "is_public": True,
                "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat(),
            })
            logger.info(f"Admin user created: {admin_email}")
        elif not verify_password(admin_password, existing["password_hash"]):
            await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
            logger.info("Admin password updated")
    except Exception as e:
        logger.warning(f"Admin seeding issue: {e}")

    # Auto-migrate metadata for songs with UUID titles or missing data
    try:
        migrated = await _run_metadata_migration()
        if migrated > 0:
            logger.info(f"Auto-migrated metadata for {migrated} songs")
    except Exception as e:
        logger.warning(f"Metadata migration issue: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
