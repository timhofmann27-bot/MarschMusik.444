# 444.HEIMAT-FUNK Music - PRD

## Original Problem Statement
Private Spotify-aehnliche Musikstreaming-Plattform (444.HEIMAT-FUNK Music / 444HF Music). Dezentralisiert, datenschutzkonform, ressourcenschonend. Deutsche Sprache, dunkles Design mit Deutschland-Vibe (Navy + Gold).

## Architecture
- **Frontend**: React 19, Tailwind CSS (dark navy #050810 + Heimat Gold #C5A059), Framer Motion, HTML5 Audio API
- **Backend**: FastAPI, Motor (Async MongoDB), `mutagen` fuer Audio-Metadaten, `bcrypt` + `PyJWT` fuer Auth
- **Storage**: Lokaler Dateispeicher `/app/backend/uploads/`, MongoDB fuer Metadaten
- **Auth**: JWT (httpOnly Cookies) + bcrypt, Brute-Force-Schutz
- **DB Collections**: users, songs, playlists, likes, history, play_log, login_attempts

## Implemented Features
- [x] Phase 1: Auth, UI-Redesign, Dashboard, Bibliothek, Upload, Playlists, Favoriten, Suche, Profil, Player
- [x] Phase 2: Kuenstler-/Album-Detailseiten, Wiedergabeverlauf, Queue-Ansicht, navigierbare Bibliothek
- [x] Deployment-Fixes: Health-Check, CORS, .gitignore
- [x] Code Quality: useAudioPlayer hook, refactored extract_metadata, fixed React hook deps, removed hardcoded secrets
- [x] Metadata-Fix: extract_metadata uses original filename, auto-migration, admin endpoint, rounded duration, orphan fix
- [x] Cover-Art-Placeholder: Vinyl Disc icon across all pages
- [x] PWA Icons: Custom logo as favicon, apple-touch-icon, manifest icons
- [x] Pre-Launch Audit Report: /app/memory/AUDIT_REPORT.md (Score 8.13/10, GO fuer MVP)
- [x] Security Hardening: 50MB upload limit, CORS restricted, pagination (page/limit)
- [x] "Jetzt hoeren" Weekly Stats: WeeklyStatsCard with animated counters, progress rings, top songs/artists
- [x] Mobile-Responsive Optimization: All views optimized for 375px
- [x] P2 Playlist-Sharing: Toggle sharing, generate share_id, shareable link, SharedPlaylistPage at /shared/:shareId
- [x] P2 Collaborative Playlists: Add/remove collaborators by email, collaborators can modify songs, Mitwirkende modal

## Upcoming Tasks
- [ ] P3: Aktivitaetsstream, Hoerstatistiken, Genre-Browser, Empfehlungen
- [ ] P3: HLS-Streaming, Offline-Modus, Direct Messages
- [ ] P3: Object Storage statt lokalem Dateispeicher
- [ ] P3: Service Worker fuer PWA Offline-Support
- [ ] P4: Keyboard Shortcuts, Code-Splitting, Jahresrueckblick
