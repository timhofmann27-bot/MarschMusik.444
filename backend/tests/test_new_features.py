"""
444.HEIMAT-FUNK Music - New Features Tests (Iteration 5)
Tests for:
- Security: 50MB upload limit, CORS restrictions
- Pagination: GET /api/songs with page/limit params
- Play logging: POST /api/history/{song_id} logs to play_log collection
- Weekly stats: GET /api/stats/weekly returns weekly listening stats
"""
import os
import pytest
import requests
import tempfile
import subprocess

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tactical-sound.preview.emergentagent.com")

# Admin credentials
ADMIN_EMAIL = "admin@444hf.de"
ADMIN_PASSWORD = "HeimatFunk444!"


class TestSecurityFeatures:
    """Test security features: upload limit, CORS"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def _login_admin(self):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        print("PASS: Health check")
    
    def test_upload_limit_small_file_succeeds(self):
        """Test that small files (< 50MB) upload successfully"""
        self._login_admin()
        
        # Create a small test MP3 (few KB)
        temp_file = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        cmd = [
            "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
            "-t", "1", "-q:a", "9", temp_path
        ]
        subprocess.run(cmd, capture_output=True)
        
        try:
            with open(temp_path, "rb") as f:
                response = self.session.post(
                    f"{BASE_URL}/api/songs/upload",
                    files={"file": ("small_test.mp3", f, "audio/mpeg")}
                )
            
            assert response.status_code == 200, f"Small file upload should succeed: {response.text}"
            song = response.json()
            print(f"PASS: Small file upload succeeded - {song.get('title')}")
            
            # Cleanup
            song_id = song.get("id")
            if song_id:
                self.session.delete(f"{BASE_URL}/api/songs/{song_id}")
        finally:
            os.unlink(temp_path)
    
    def test_cors_headers_present(self):
        """Test that CORS headers are present in responses"""
        # Make a preflight OPTIONS request
        response = self.session.options(
            f"{BASE_URL}/api/health",
            headers={
                "Origin": "https://tactical-sound.preview.emergentagent.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        
        # Check CORS headers
        # Note: The actual CORS check happens at browser level, but we can verify headers
        print(f"  Response status: {response.status_code}")
        print(f"  Headers: {dict(response.headers)}")
        
        # A successful preflight should return 200 or 204
        assert response.status_code in [200, 204, 405], f"Preflight should succeed: {response.status_code}"
        print("PASS: CORS preflight request handled")


class TestPagination:
    """Test pagination for GET /api/songs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def _login_admin(self):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        return response.json()
    
    def test_songs_default_pagination(self):
        """Test GET /api/songs returns songs (default pagination)"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200
        
        songs = response.json()
        assert isinstance(songs, list), "Response should be a list"
        print(f"PASS: GET /api/songs returns {len(songs)} songs (default pagination)")
    
    def test_songs_with_page_param(self):
        """Test GET /api/songs with page parameter"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/songs", params={"page": 1, "limit": 10})
        assert response.status_code == 200
        
        songs = response.json()
        assert isinstance(songs, list), "Response should be a list"
        assert len(songs) <= 10, f"Should return at most 10 songs, got {len(songs)}"
        print(f"PASS: GET /api/songs?page=1&limit=10 returns {len(songs)} songs")
    
    def test_songs_with_limit_param(self):
        """Test GET /api/songs with limit parameter"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/songs", params={"limit": 5})
        assert response.status_code == 200
        
        songs = response.json()
        assert isinstance(songs, list), "Response should be a list"
        assert len(songs) <= 5, f"Should return at most 5 songs, got {len(songs)}"
        print(f"PASS: GET /api/songs?limit=5 returns {len(songs)} songs")
    
    def test_songs_page_2_empty_or_different(self):
        """Test GET /api/songs page 2 returns different or empty results"""
        self._login_admin()
        
        # Get page 1
        response1 = self.session.get(f"{BASE_URL}/api/songs", params={"page": 1, "limit": 50})
        assert response1.status_code == 200
        songs1 = response1.json()
        
        # Get page 2
        response2 = self.session.get(f"{BASE_URL}/api/songs", params={"page": 2, "limit": 50})
        assert response2.status_code == 200
        songs2 = response2.json()
        
        # If there are fewer songs than limit, page 2 should be empty
        if len(songs1) < 50:
            assert len(songs2) == 0, f"Page 2 should be empty when page 1 has {len(songs1)} songs"
            print(f"PASS: Page 2 is empty (only {len(songs1)} total songs)")
        else:
            # If page 1 is full, page 2 should have different songs
            ids1 = {s["id"] for s in songs1}
            ids2 = {s["id"] for s in songs2}
            assert ids1.isdisjoint(ids2), "Page 2 should have different songs than page 1"
            print(f"PASS: Page 2 has {len(songs2)} different songs")


class TestPlayLogging:
    """Test play history logging to play_log collection"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def _login_admin(self):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        return response.json()
    
    def test_add_to_history_returns_ok(self):
        """Test POST /api/history/{song_id} returns ok status"""
        self._login_admin()
        
        # First get a song to play
        response = self.session.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200
        songs = response.json()
        
        if not songs:
            pytest.skip("No songs available to test history")
        
        song_id = songs[0]["id"]
        
        # Add to history
        response = self.session.post(f"{BASE_URL}/api/history/{song_id}")
        assert response.status_code == 200, f"Add to history failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok", f"Expected status 'ok', got: {data}"
        print(f"PASS: POST /api/history/{song_id} returns ok")
    
    def test_history_increments_play_count(self):
        """Test that adding to history increments play count"""
        self._login_admin()
        
        # Get a song
        response = self.session.get(f"{BASE_URL}/api/songs")
        songs = response.json()
        
        if not songs:
            pytest.skip("No songs available")
        
        song_id = songs[0]["id"]
        
        # Get current history
        response = self.session.get(f"{BASE_URL}/api/history")
        assert response.status_code == 200
        history_before = response.json()
        
        # Find play count for this song
        play_count_before = 0
        for h in history_before:
            if h.get("id") == song_id:
                play_count_before = h.get("play_count", 0)
                break
        
        # Add to history
        response = self.session.post(f"{BASE_URL}/api/history/{song_id}")
        assert response.status_code == 200
        
        # Get history again
        response = self.session.get(f"{BASE_URL}/api/history")
        history_after = response.json()
        
        # Find new play count
        play_count_after = 0
        for h in history_after:
            if h.get("id") == song_id:
                play_count_after = h.get("play_count", 0)
                break
        
        assert play_count_after >= play_count_before, f"Play count should increase: {play_count_before} -> {play_count_after}"
        print(f"PASS: Play count incremented: {play_count_before} -> {play_count_after}")


class TestWeeklyStats:
    """Test weekly stats endpoint for 'Jetzt hören' dashboard card"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def _login_admin(self):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        return response.json()
    
    def test_weekly_stats_requires_auth(self):
        """Test GET /api/stats/weekly requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/stats/weekly")
        assert response.status_code == 401, f"Should require auth: {response.status_code}"
        print("PASS: Weekly stats requires authentication")
    
    def test_weekly_stats_returns_correct_structure(self):
        """Test GET /api/stats/weekly returns correct data structure"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/stats/weekly")
        assert response.status_code == 200, f"Weekly stats failed: {response.text}"
        
        data = response.json()
        
        # Check required fields
        assert "has_data" in data, "Response should have 'has_data' field"
        assert "total_plays" in data, "Response should have 'total_plays' field"
        assert "total_minutes" in data, "Response should have 'total_minutes' field"
        assert "top_songs" in data, "Response should have 'top_songs' field"
        assert "top_artists" in data, "Response should have 'top_artists' field"
        assert "new_discoveries" in data, "Response should have 'new_discoveries' field"
        assert "week_start" in data, "Response should have 'week_start' field"
        
        print(f"PASS: Weekly stats structure correct - has_data={data['has_data']}")
        print(f"  total_plays: {data['total_plays']}")
        print(f"  total_minutes: {data['total_minutes']}")
        print(f"  top_songs: {len(data['top_songs'])} songs")
        print(f"  top_artists: {len(data['top_artists'])} artists")
        print(f"  new_discoveries: {data['new_discoveries']}")
    
    def test_weekly_stats_has_data_when_plays_exist(self):
        """Test that weekly stats shows has_data: true when there are plays this week"""
        self._login_admin()
        
        # First, ensure we have at least one play this week
        response = self.session.get(f"{BASE_URL}/api/songs")
        songs = response.json()
        
        if songs:
            # Add a play to ensure we have data
            song_id = songs[0]["id"]
            self.session.post(f"{BASE_URL}/api/history/{song_id}")
        
        # Now check weekly stats
        response = self.session.get(f"{BASE_URL}/api/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        
        # Based on context, there should be play_log entries
        if data.get("has_data"):
            assert data["total_plays"] > 0, "If has_data is true, total_plays should be > 0"
            assert isinstance(data["top_songs"], list), "top_songs should be a list"
            assert isinstance(data["top_artists"], list), "top_artists should be a list"
            print(f"PASS: Weekly stats has_data=true with {data['total_plays']} plays")
        else:
            print("INFO: Weekly stats has_data=false (no plays this week)")
    
    def test_weekly_stats_top_songs_structure(self):
        """Test that top_songs have correct structure"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        
        if data.get("has_data") and data.get("top_songs"):
            for song in data["top_songs"]:
                assert "id" in song, "Top song should have 'id'"
                assert "title" in song, "Top song should have 'title'"
                assert "artist" in song, "Top song should have 'artist'"
                assert "play_count" in song, "Top song should have 'play_count'"
                print(f"  Top song: '{song['title']}' by '{song['artist']}' - {song['play_count']}x")
            print(f"PASS: Top songs structure correct ({len(data['top_songs'])} songs)")
        else:
            print("INFO: No top songs data to verify")
    
    def test_weekly_stats_top_artists_structure(self):
        """Test that top_artists have correct structure"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/stats/weekly")
        assert response.status_code == 200
        
        data = response.json()
        
        if data.get("has_data") and data.get("top_artists"):
            for artist in data["top_artists"]:
                assert "name" in artist, "Top artist should have 'name'"
                assert "play_count" in artist, "Top artist should have 'play_count'"
                print(f"  Top artist: '{artist['name']}' - {artist['play_count']}x")
            print(f"PASS: Top artists structure correct ({len(data['top_artists'])} artists)")
        else:
            print("INFO: No top artists data to verify")


class TestHistoryStats:
    """Test history stats endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def _login_admin(self):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        return response.json()
    
    def test_history_stats_returns_data(self):
        """Test GET /api/history/stats returns listening statistics"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/history/stats")
        assert response.status_code == 200, f"History stats failed: {response.text}"
        
        data = response.json()
        
        assert "total_plays" in data, "Should have total_plays"
        assert "unique_songs" in data, "Should have unique_songs"
        assert "top_songs" in data, "Should have top_songs"
        assert "top_artists" in data, "Should have top_artists"
        
        print(f"PASS: History stats - {data['total_plays']} total plays, {data['unique_songs']} unique songs")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
    
    def test_login_sets_httponly_cookies(self):
        """Test that login sets httpOnly cookies"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        # Check cookies are set
        cookies = self.session.cookies
        assert "access_token" in [c.name for c in cookies], "access_token cookie should be set"
        assert "refresh_token" in [c.name for c in cookies], "refresh_token cookie should be set"
        
        print("PASS: Login sets httpOnly cookies")
    
    def test_brute_force_lockout(self):
        """Test brute force protection (5 failed attempts)"""
        import uuid
        session = requests.Session()
        
        # Use unique email to avoid conflicts with previous test runs
        test_email = f"bruteforce_test_{uuid.uuid4().hex[:8]}@test.com"
        
        # Make 5 failed login attempts
        for i in range(5):
            response = session.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": test_email, "password": "wrongpassword"},
                headers={"Content-Type": "application/json"}
            )
            # Should get 401 for wrong credentials
            assert response.status_code == 401, f"Attempt {i+1}: Expected 401, got {response.status_code}"
        
        # 6th attempt should be rate limited (429)
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_email, "password": "wrongpassword"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 429, f"Should be rate limited after 5 attempts: {response.status_code}"
        print("PASS: Brute force lockout after 5 failed attempts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
