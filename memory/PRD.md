# Tactical Sound Station - PRD

## Original Problem Statement
Musik-App (Tactical Sound Station) zum Hochladen und Herunterladen eigener Musikdateien mit:
- Audio Streaming & Upload/Download
- Playlist-Verwaltung, Favoriten (Like/Unlike), Metadaten-Bearbeitung
- Militärisches UI-Design (Tactical Theme)
- Deutsche Sprache
- Mobile-Optimierung und PWA ("Zum Startbildschirm hinzufügen") mit benutzerdefiniertem Logo

## Architecture
- **Frontend**: React 19, Tailwind CSS (dark/military theme), Framer Motion, HTML5 Audio API
- **Backend**: FastAPI, Motor (Async MongoDB), `mutagen` für MP3-Metadaten, `aiofiles`
- **Storage**: Lokaler Dateispeicher `/app/backend/uploads/audio/`, MongoDB für Metadaten

## DB Schema
- `songs`: {id (UUID), filename, title, artist, album, genre, duration, file_path, file_size, likes, upload_date}
- `playlists`: {id (UUID), name, description, songs (array), created_date}

## Key API Endpoints
- `POST /api/upload` - Audio-Datei hochladen
- `GET /api/songs` - Alle Songs auflisten
- `GET /api/songs/{id}/stream` - Audio streamen
- `POST /api/songs/{id}/like` - Favoriten-Toggle
- `GET /api/playlists` - Playlists auflisten
- `POST /api/playlists` - Playlist erstellen

## Implemented Features (Completed)
- [x] FastAPI & MongoDB Setup mit Mutagen Metadaten-Extraktion
- [x] React Frontend mit militärischem UI-Design (Tailwind)
- [x] Core Features: Upload, Play, Download, Playlists, Likes
- [x] Mobile UX: Bottom Navigation, Framer Motion Animationen, responsive Layouts
- [x] Audio Player: HTML5 Audio mit Autoplay-Block Handling
- [x] Code Quality Refactoring (React hooks, Python best practices)
- [x] PWA Icon-Generierung aus benutzerdefiniertem Logo
- [x] **PWA Integration**: manifest.json, index.html Meta-Tags, Favicon, Apple Touch Icons (30. März 2026)

## Backlog
- [ ] P1: Service Worker für Offline-Support/Caching
- [ ] P2: Benutzer-Authentifizierung (Multi-User)
