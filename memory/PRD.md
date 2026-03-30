# 444.HEIMAT-FUNK Music - PRD

## Original Problem Statement
Private Spotify-ähnliche Musikstreaming-Plattform (444.HEIMAT-FUNK Music / 444HF Music). Dezentralisiert, datenschutzkonform, ressourcenschonend. Deutsche Sprache, dunkles Design mit Deutschland-Vibe (Navy + Gold).

## Core Values
- Privatsphäre: Keine Nutzerdaten-Sammlung, lokale Speicherung
- Dezentralisiert: Self-Hosted oder Cloud
- Spotify-ähnlich: Volle Funktionalität
- Ressourcenschonend: Standard-Hardware
- Deutsche Infrastruktur (optional EU/Deutschland)

## Architecture
- **Frontend**: React 19, Tailwind CSS (dark navy #050810 + Heimat Gold #C5A059), Framer Motion, HTML5 Audio API
- **Backend**: FastAPI, Motor (Async MongoDB), `mutagen` für Audio-Metadaten, `bcrypt` + `PyJWT` für Auth
- **Storage**: Lokaler Dateispeicher `/app/backend/uploads/`, MongoDB für Metadaten
- **Auth**: JWT (httpOnly Cookies) + bcrypt, Brute-Force-Schutz

## DB Collections
- `users`: { _id, username, email, password_hash, bio, avatar_url, is_public, role, created_at }
- `songs`: { id (UUID), owner_id, filename, title, artist, album, genre, year, duration, file_path, file_size, likes_count, upload_date }
- `playlists`: { id (UUID), owner_id, name, description, is_public, cover_url, song_ids[], created_date }
- `likes`: { user_id, music_id, created_at }
- `login_attempts`: { identifier, count, locked_until }
- `followers`: { follower_id, following_id, created_at } (schema ready, feature Phase 4)

## Key API Endpoints
### Auth
- POST /api/auth/register, /api/auth/login, /api/auth/logout, GET /api/auth/me, POST /api/auth/refresh

### Songs
- POST /api/songs/upload, GET /api/songs, GET /api/songs/{id}, PUT /api/songs/{id}, DELETE /api/songs/{id}
- GET /api/songs/{id}/stream, GET /api/songs/{id}/download
- POST /api/songs/{id}/like, GET /api/songs/liked/all

### Playlists
- POST /api/playlists, GET /api/playlists, GET /api/playlists/{id}, PUT /api/playlists/{id}, DELETE /api/playlists/{id}
- POST /api/playlists/{id}/songs/{songId}, DELETE /api/playlists/{id}/songs/{songId}

### Other
- GET /api/stats, GET /api/search?q=, GET /api/artists, GET /api/albums
- GET /api/users/me, PUT /api/users/me, POST /api/users/me/avatar

## Implemented Features (Phase 1 - Completed 30. March 2026)
- [x] JWT Auth (Register, Login, Logout, Refresh, Brute-Force-Schutz)
- [x] Admin Seeding
- [x] Complete UI Redesign: Dark Navy + Heimat Gold theme
- [x] Sidebar Navigation (Desktop) + Bottom Nav (Mobile)
- [x] Dashboard with Stats, Recently Added, Playlists
- [x] Music Library with Songs/Artists/Albums tabs
- [x] Upload with Drag-and-Drop, multi-file, progress
- [x] Playlists CRUD with add/remove songs
- [x] Favorites (Like/Unlike per user)
- [x] Global Search (Songs, Artists, Playlists)
- [x] User Profile with Avatar Upload, Bio edit
- [x] Advanced Audio Player: Shuffle, Repeat (off/all/one), Queue, Scrubbing, Volume
- [x] PWA manifest + icons from custom logo
- [x] German language throughout

## Upcoming Tasks (Phase 2)
- [ ] P1: Erweiterter Upload: Drag-and-Drop Sortierung, Batch-Metadaten
- [ ] P1: Erweiterte Künstler-/Albumansichten (navigierbar)
- [ ] P1: Wiedergabeverlauf (zuletzt gehört)

## Future Tasks (Phase 3+)
- [ ] P2: Playlist-Sharing (View/Edit/Download-Rechte)
- [ ] P2: Collaborative Playlists
- [ ] P2: Follow/Unfollow System
- [ ] P2: Aktivitätsstream
- [ ] P3: Hörstatistiken (Top Songs, Artists, Genres)
- [ ] P3: Genre-Browser & Empfehlungen
- [ ] P3: HLS-Streaming mit adaptiver Bitrate
- [ ] P3: Offline-Modus/Download
- [ ] P3: Direct Messages
- [ ] P3: Jahresrückblick (Wrapped)
- [ ] P3: Equalizer
- [ ] P4: Service Worker für PWA Offline-Support
- [ ] P4: Mobile App (React Native)
