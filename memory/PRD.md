# 444.HEIMAT-FUNK Music - PRD

## Original Problem Statement
Private Spotify-aehnliche Musikstreaming-Plattform (444.HEIMAT-FUNK Music / 444HF Music). Dezentralisiert, datenschutzkonform, ressourcenschonend. Deutsche Sprache, dunkles Design mit Deutschland-Vibe (Navy + Gold).

## Architecture
- **Frontend**: React 19, Tailwind CSS (dark navy #050810 + Heimat Gold #C5A059), Framer Motion, HTML5 Audio API
- **Backend**: FastAPI, Motor (Async MongoDB), `mutagen` fuer Audio-Metadaten, `bcrypt` + `PyJWT` fuer Auth
- **Storage**: Lokaler Dateispeicher `/app/backend/uploads/`, MongoDB fuer Metadaten
- **Auth**: JWT (httpOnly Cookies) + bcrypt, Brute-Force-Schutz

## Implemented Features
- [x] Phase 1: Auth, UI-Redesign, Dashboard, Bibliothek, Upload, Playlists, Favoriten, Suche, Profil, Player (30. Maerz 2026)
- [x] Phase 2: Kuenstler-/Album-Detailseiten, Wiedergabeverlauf mit Statistiken, Queue-Ansicht, navigierbare Bibliothek (30. Maerz 2026)
- [x] Deployment-Fixes: Health-Check, CORS, .gitignore (30. Maerz 2026)
- [x] Code Quality: Refactored AudioPlayer (extracted useAudioPlayer hook), refactored extract_metadata, fixed all React hook deps, removed hardcoded secrets, fixed list keys, extracted constants (30. Maerz 2026)

## Upcoming Tasks
- [ ] P2: Playlist-Sharing (View/Edit/Download-Rechte)
- [ ] P2: Collaborative Playlists
- [ ] P2: Follow/Unfollow System

## Backlog
- [ ] P3: Aktivitaetsstream, Hoerstatistiken, Genre-Browser, Empfehlungen
- [ ] P3: HLS-Streaming, Offline-Modus, Direct Messages
- [ ] P4: Service Worker, Mobile App (React Native), Jahresrueckblick
