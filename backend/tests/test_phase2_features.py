"""
444.HEIMAT-FUNK Music Phase 2 API Tests
Tests for play history, history stats, artist detail, album detail endpoints
"""
import pytest
import requests
import os
import time
import io
import subprocess

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@444hf.de"
ADMIN_PASSWORD = "HeimatFunk444!"


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Test GET /api/health returns 200"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        data = response.json()
        assert data.get("status") == "ok"
        print("Health check passed")


class TestHistoryEndpoints:
    """Play history endpoint tests - Phase 2 feature"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        return session
    
    def test_get_history_authenticated(self, auth_session):
        """Test GET /api/history returns play history array"""
        response = auth_session.get(f"{BASE_URL}/api/history")
        assert response.status_code == 200, f"GET history failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "History should be a list"
        print(f"GET /api/history returned {len(data)} items")
    
    def test_get_history_unauthenticated(self):
        """Test GET /api/history without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/history")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated history access correctly rejected")
    
    def test_get_history_stats_authenticated(self, auth_session):
        """Test GET /api/history/stats returns stats object"""
        response = auth_session.get(f"{BASE_URL}/api/history/stats")
        assert response.status_code == 200, f"GET history stats failed: {response.text}"
        data = response.json()
        
        # Verify required fields
        assert "total_plays" in data, "Missing total_plays"
        assert "unique_songs" in data, "Missing unique_songs"
        assert "top_songs" in data, "Missing top_songs"
        assert "top_artists" in data, "Missing top_artists"
        
        assert isinstance(data["total_plays"], int)
        assert isinstance(data["unique_songs"], int)
        assert isinstance(data["top_songs"], list)
        assert isinstance(data["top_artists"], list)
        
        print(f"History stats: {data['total_plays']} plays, {data['unique_songs']} unique songs")
    
    def test_get_history_stats_unauthenticated(self):
        """Test GET /api/history/stats without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/history/stats")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated history stats access correctly rejected")


class TestArtistDetailEndpoints:
    """Artist detail endpoint tests - Phase 2 feature"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        return session
    
    def test_get_artists_list(self, auth_session):
        """Test GET /api/artists returns aggregated artists list"""
        response = auth_session.get(f"{BASE_URL}/api/artists")
        assert response.status_code == 200, f"GET artists failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        if data:
            artist = data[0]
            assert "name" in artist, "Artist missing 'name'"
            assert "song_count" in artist, "Artist missing 'song_count'"
            assert "total_duration" in artist, "Artist missing 'total_duration'"
        print(f"GET /api/artists returned {len(data)} artists")
    
    def test_get_artists_unauthenticated(self):
        """Test GET /api/artists without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/artists")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated artists access correctly rejected")
    
    def test_get_artist_songs(self, auth_session):
        """Test GET /api/artists/{artist_name}/songs returns songs by artist"""
        # First get artists list
        artists_resp = auth_session.get(f"{BASE_URL}/api/artists")
        artists = artists_resp.json()
        
        if not artists:
            pytest.skip("No artists available to test")
        
        artist_name = artists[0]["name"]
        
        # Get songs by artist
        response = auth_session.get(f"{BASE_URL}/api/artists/{artist_name}/songs")
        assert response.status_code == 200, f"GET artist songs failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        if data:
            song = data[0]
            assert "id" in song
            assert "title" in song
            assert "artist" in song
        print(f"GET /api/artists/{artist_name}/songs returned {len(data)} songs")
    
    def test_get_artist_songs_unauthenticated(self):
        """Test GET /api/artists/{name}/songs without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/artists/TestArtist/songs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated artist songs access correctly rejected")


class TestAlbumDetailEndpoints:
    """Album detail endpoint tests - Phase 2 feature"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        return session
    
    def test_get_albums_list(self, auth_session):
        """Test GET /api/albums returns aggregated albums list"""
        response = auth_session.get(f"{BASE_URL}/api/albums")
        assert response.status_code == 200, f"GET albums failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        if data:
            album = data[0]
            assert "name" in album, "Album missing 'name'"
            assert "artist" in album, "Album missing 'artist'"
            assert "song_count" in album, "Album missing 'song_count'"
            assert "total_duration" in album, "Album missing 'total_duration'"
        print(f"GET /api/albums returned {len(data)} albums")
    
    def test_get_albums_unauthenticated(self):
        """Test GET /api/albums without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/albums")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated albums access correctly rejected")
    
    def test_get_album_songs(self, auth_session):
        """Test GET /api/albums/{album_name}/songs returns songs by album"""
        # First get albums list
        albums_resp = auth_session.get(f"{BASE_URL}/api/albums")
        albums = albums_resp.json()
        
        if not albums:
            pytest.skip("No albums available to test")
        
        album_name = albums[0]["name"]
        
        # Get songs by album
        response = auth_session.get(f"{BASE_URL}/api/albums/{album_name}/songs")
        assert response.status_code == 200, f"GET album songs failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        if data:
            song = data[0]
            assert "id" in song
            assert "title" in song
            assert "album" in song
        print(f"GET /api/albums/{album_name}/songs returned {len(data)} songs")
    
    def test_get_album_songs_unauthenticated(self):
        """Test GET /api/albums/{name}/songs without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/albums/TestAlbum/songs")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated album songs access correctly rejected")


class TestUploadAndHistoryIntegration:
    """Integration test: Upload song, add to history, verify history and stats"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        return session
    
    def test_full_history_flow(self, auth_session):
        """Test: Upload song -> Add to history -> Verify history -> Verify stats"""
        
        # Step 1: Create a test MP3 file using ffmpeg
        test_mp3_path = "/tmp/test_phase2.mp3"
        try:
            subprocess.run([
                "ffmpeg", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=2",
                "-b:a", "128k", test_mp3_path
            ], capture_output=True, timeout=30)
        except Exception as e:
            pytest.skip(f"Could not create test MP3: {e}")
        
        # Step 2: Upload the song
        with open(test_mp3_path, 'rb') as f:
            files = {'file': ('test_phase2.mp3', f, 'audio/mpeg')}
            data = {
                'title': 'Phase2 Test Song',
                'artist': 'Phase2 Test Artist',
                'album': 'Phase2 Test Album',
                'genre': 'Test'
            }
            upload_resp = auth_session.post(
                f"{BASE_URL}/api/songs/upload",
                files=files,
                data=data
            )
        
        assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
        song_data = upload_resp.json()
        song_id = song_data["id"]
        print(f"Uploaded song with ID: {song_id}")
        
        # Step 3: Verify song appears in GET /api/songs
        songs_resp = auth_session.get(f"{BASE_URL}/api/songs")
        assert songs_resp.status_code == 200
        songs = songs_resp.json()
        song_ids = [s["id"] for s in songs]
        assert song_id in song_ids, "Uploaded song not found in songs list"
        print("Song verified in songs list")
        
        # Step 4: Add song to history
        history_add_resp = auth_session.post(f"{BASE_URL}/api/history/{song_id}")
        assert history_add_resp.status_code == 200, f"Add to history failed: {history_add_resp.text}"
        history_data = history_add_resp.json()
        assert history_data.get("status") == "ok"
        print("Song added to history")
        
        # Step 5: Verify song appears in GET /api/history
        history_resp = auth_session.get(f"{BASE_URL}/api/history")
        assert history_resp.status_code == 200
        history = history_resp.json()
        history_song_ids = [h["id"] for h in history]
        assert song_id in history_song_ids, "Song not found in history"
        print("Song verified in history")
        
        # Step 6: Verify GET /api/history/stats shows correct counts
        stats_resp = auth_session.get(f"{BASE_URL}/api/history/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["total_plays"] >= 1, "total_plays should be at least 1"
        assert stats["unique_songs"] >= 1, "unique_songs should be at least 1"
        print(f"History stats verified: {stats['total_plays']} plays, {stats['unique_songs']} unique songs")
        
        # Step 7: Add to history again to test play_count increment
        auth_session.post(f"{BASE_URL}/api/history/{song_id}")
        history_resp2 = auth_session.get(f"{BASE_URL}/api/history")
        history2 = history_resp2.json()
        for h in history2:
            if h["id"] == song_id:
                assert h.get("play_count", 1) >= 2, "play_count should be at least 2 after second play"
                print(f"Play count verified: {h.get('play_count')}")
                break
        
        # Cleanup: Delete the test song
        delete_resp = auth_session.delete(f"{BASE_URL}/api/songs/{song_id}")
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        print("Test song cleaned up")
    
    def test_add_history_nonexistent_song(self, auth_session):
        """Test POST /api/history/{song_id} with non-existent song returns 404"""
        response = auth_session.post(f"{BASE_URL}/api/history/nonexistent-song-id-12345")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Non-existent song history add correctly returns 404")
    
    def test_add_history_unauthenticated(self):
        """Test POST /api/history/{song_id} without auth returns 401"""
        response = requests.post(f"{BASE_URL}/api/history/some-song-id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated history add correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
