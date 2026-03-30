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
- [x] Code Quality: Refactored AudioPlayer (extracted useAudioPlayer hook), refactored extract_metadata, fixed all React hook deps, removed hardcoded secrets, extracted constants (30. Maerz 2026)
- [x] Metadata-Fix: extract_metadata uses original filename as fallback (not UUID), auto-migration on startup, admin migration endpoint, rounded duration, orphaned song owner_id fix (30. Maerz 2026)
- [x] Cover-Art-Placeholder: Vinyl Disc icon (lucide-react Disc) across all pages (30. Maerz 2026)
- [x] PWA Icons: Custom logo integrated as favicon, apple-touch-icon, manifest icons (30. Maerz 2026)
- [x] Pre-Launch Audit Report: Security, Performance, UX, Emergent-Kompatibilitaet (/app/memory/AUDIT_REPORT.md) (30. Maerz 2026)

## Upcoming Tasks
- [ ] P1: Upload-Dateigroessen-Limit (50MB)
- [ ] P1: CORS auf spezifische Domain einschraenken
- [ ] P1: Pagination fuer grosse Bibliotheken
- [ ] P1: Mobile-Responsive-Test (alle Views auf 375px)

## Backlog
- [ ] P2: Playlist-Sharing (View/Edit/Download-Rechte)
- [ ] P2: Collaborative Playlists
- [ ] P2: Follow/Unfollow System
- [ ] P3: Aktivitaetsstream, Hoerstatistiken, Genre-Browser, Empfehlungen
- [ ] P3: HLS-Streaming, Offline-Modus, Direct Messages
- [ ] P3: Object Storage statt lokalem Dateispeicher
- [ ] P3: Service Worker fuer PWA Offline-Support
- [ ] P4: Keyboard Shortcuts, Code-Splitting, Jahresrueckblick
