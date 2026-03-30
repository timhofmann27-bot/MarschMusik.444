"""
444.HEIMAT-FUNK Music API Tests
Tests for auth, songs, playlists, search, stats, artists, and user profile endpoints
"""
import pytest
import requests
import os
import time
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@444hf.de"
ADMIN_PASSWORD = "HeimatFunk444!"

# Test user for registration tests
TEST_USER_EMAIL = f"test_{int(time.time())}@444hf.de"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_NAME = "TestUser"


class TestHealthAndBasics:
    """Basic connectivity tests"""
    
    def test_api_reachable(self):
        """Verify API is reachable"""
        response = requests.get(f"{BASE_URL}/api/stats", timeout=10)
        # Should return 401 without auth, which means API is reachable
        assert response.status_code in [200, 401], f"API not reachable: {response.status_code}"
        print(f"API reachable at {BASE_URL}")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_login_success(self):
        """Test login with admin credentials"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "user" in data, "Response missing 'user' field"
        assert "token" in data, "Response missing 'token' field"
        
        # Verify user data
        user = data["user"]
        assert user["email"] == ADMIN_EMAIL
        assert "id" in user
        assert "username" in user
        assert user["role"] == "admin"
        
        # Verify cookies are set
        assert "access_token" in session.cookies, "access_token cookie not set"
        assert "refresh_token" in session.cookies, "refresh_token cookie not set"
        print(f"Login successful for {ADMIN_EMAIL}")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        print("Invalid credentials correctly rejected")
    
    def test_register_new_user(self):
        """Test user registration"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": TEST_USER_NAME,
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
        )
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        assert "user" in data
        assert "token" in data
        assert data["user"]["email"] == TEST_USER_EMAIL.lower()
        assert data["user"]["username"] == TEST_USER_NAME
        print(f"Registration successful for {TEST_USER_EMAIL}")
    
    def test_register_duplicate_email(self):
        """Test registration with existing email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "username": "AnotherUser",
                "email": ADMIN_EMAIL,  # Already exists
                "password": "SomePass123!"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Duplicate email correctly rejected")
    
    def test_get_me_authenticated(self):
        """Test GET /api/auth/me with valid session"""
        session = requests.Session()
        # Login first
        login_resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_resp.status_code == 200
        
        # Get current user
        response = session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"GET /me failed: {response.text}"
        data = response.json()
        
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print("GET /api/auth/me successful")
    
    def test_get_me_unauthenticated(self):
        """Test GET /api/auth/me without auth"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Unauthenticated /me correctly rejected")
    
    def test_logout(self):
        """Test logout clears cookies"""
        session = requests.Session()
        # Login first
        session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        # Logout
        response = session.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200, f"Logout failed: {response.text}"
        
        # Verify can't access protected endpoint
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 401, "Should be logged out"
        print("Logout successful")
    
    def test_refresh_token(self):
        """Test token refresh"""
        session = requests.Session()
        # Login first
        session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        # Refresh token
        response = session.post(f"{BASE_URL}/api/auth/refresh")
        assert response.status_code == 200, f"Refresh failed: {response.text}"
        data = response.json()
        
        assert "user" in data
        assert "token" in data
        print("Token refresh successful")


class TestBruteForceProtection:
    """Test brute force protection (5 failed attempts = 15min lockout)"""
    
    def test_brute_force_lockout(self):
        """Test that 5 failed attempts trigger lockout"""
        test_email = f"bruteforce_{int(time.time())}@test.de"
        
        # Make 5 failed login attempts
        for i in range(5):
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": test_email, "password": "wrongpass"}
            )
            assert response.status_code == 401, f"Attempt {i+1} should fail with 401"
        
        # 6th attempt should be rate limited
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": test_email, "password": "wrongpass"}
        )
        assert response.status_code == 429, f"Expected 429 (rate limited), got {response.status_code}"
        print("Brute force protection working - locked after 5 attempts")


class TestSongsEndpoints:
    """Song CRUD and streaming tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return session
    
    def test_get_songs_authenticated(self, auth_session):
        """Test GET /api/songs with auth"""
        response = auth_session.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200, f"GET songs failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/songs returned {len(data)} songs")
    
    def test_get_songs_unauthenticated(self):
        """Test GET /api/songs without auth"""
        response = requests.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 401
        print("Unauthenticated songs access correctly rejected")
    
    def test_upload_song(self, auth_session):
        """Test song upload with multipart/form-data"""
        # Create a minimal valid WAV file (44 bytes header + some data)
        wav_header = bytes([
            0x52, 0x49, 0x46, 0x46,  # "RIFF"
            0x24, 0x00, 0x00, 0x00,  # File size - 8
            0x57, 0x41, 0x56, 0x45,  # "WAVE"
            0x66, 0x6D, 0x74, 0x20,  # "fmt "
            0x10, 0x00, 0x00, 0x00,  # Subchunk1Size (16)
            0x01, 0x00,              # AudioFormat (1 = PCM)
            0x01, 0x00,              # NumChannels (1)
            0x44, 0xAC, 0x00, 0x00,  # SampleRate (44100)
            0x88, 0x58, 0x01, 0x00,  # ByteRate
            0x02, 0x00,              # BlockAlign
            0x10, 0x00,              # BitsPerSample (16)
            0x64, 0x61, 0x74, 0x61,  # "data"
            0x00, 0x00, 0x00, 0x00,  # Subchunk2Size
        ])
        
        files = {
            'file': ('test_song.wav', io.BytesIO(wav_header), 'audio/wav')
        }
        data = {
            'title': 'Test Song Upload',
            'artist': 'Test Artist',
            'album': 'Test Album',
            'genre': 'Test Genre'
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/songs/upload",
            files=files,
            data=data
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        song_data = response.json()
        
        assert "id" in song_data
        assert song_data["title"] == "Test Song Upload"
        assert song_data["artist"] == "Test Artist"
        print(f"Song uploaded successfully with ID: {song_data['id']}")
        
        # Cleanup - delete the test song
        auth_session.delete(f"{BASE_URL}/api/songs/{song_data['id']}")
        return song_data["id"]
    
    def test_toggle_like(self, auth_session):
        """Test song like toggle"""
        # First get songs to find one to like
        songs_resp = auth_session.get(f"{BASE_URL}/api/songs")
        songs = songs_resp.json()
        
        if not songs:
            pytest.skip("No songs available to test like functionality")
        
        song_id = songs[0]["id"]
        
        # Toggle like
        response = auth_session.post(f"{BASE_URL}/api/songs/{song_id}/like")
        assert response.status_code == 200, f"Like toggle failed: {response.text}"
        data = response.json()
        assert "is_liked" in data
        print(f"Like toggled for song {song_id}: is_liked={data['is_liked']}")
    
    def test_get_liked_songs(self, auth_session):
        """Test GET /api/songs/liked/all"""
        response = auth_session.get(f"{BASE_URL}/api/songs/liked/all")
        assert response.status_code == 200, f"GET liked songs failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/songs/liked/all returned {len(data)} liked songs")
    
    def test_stream_nonexistent_song(self):
        """Test streaming non-existent song returns 404"""
        response = requests.get(f"{BASE_URL}/api/songs/nonexistent-id-12345/stream")
        assert response.status_code == 404
        print("Non-existent song stream correctly returns 404")


class TestPlaylistsEndpoints:
    """Playlist CRUD tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return session
    
    def test_create_playlist(self, auth_session):
        """Test playlist creation"""
        response = auth_session.post(
            f"{BASE_URL}/api/playlists",
            json={
                "name": "Test Playlist",
                "description": "Test Description",
                "is_public": False
            }
        )
        assert response.status_code == 200, f"Create playlist failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data["name"] == "Test Playlist"
        assert data["description"] == "Test Description"
        assert data["is_public"] == False
        print(f"Playlist created with ID: {data['id']}")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/playlists/{data['id']}")
        return data["id"]
    
    def test_get_playlists(self, auth_session):
        """Test GET /api/playlists"""
        response = auth_session.get(f"{BASE_URL}/api/playlists")
        assert response.status_code == 200, f"GET playlists failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"GET /api/playlists returned {len(data)} playlists")
    
    def test_get_playlist_by_id(self, auth_session):
        """Test GET /api/playlists/{id}"""
        # Create a playlist first
        create_resp = auth_session.post(
            f"{BASE_URL}/api/playlists",
            json={"name": "Test Get Playlist", "description": ""}
        )
        playlist_id = create_resp.json()["id"]
        
        # Get the playlist
        response = auth_session.get(f"{BASE_URL}/api/playlists/{playlist_id}")
        assert response.status_code == 200, f"GET playlist failed: {response.text}"
        data = response.json()
        
        assert data["id"] == playlist_id
        assert data["name"] == "Test Get Playlist"
        assert "songs" in data  # Should include songs array
        print(f"GET /api/playlists/{playlist_id} successful")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_add_song_to_playlist(self, auth_session):
        """Test adding song to playlist"""
        # Get songs
        songs_resp = auth_session.get(f"{BASE_URL}/api/songs")
        songs = songs_resp.json()
        
        if not songs:
            pytest.skip("No songs available to add to playlist")
        
        song_id = songs[0]["id"]
        
        # Create playlist
        create_resp = auth_session.post(
            f"{BASE_URL}/api/playlists",
            json={"name": "Test Add Song Playlist", "description": ""}
        )
        playlist_id = create_resp.json()["id"]
        
        # Add song to playlist
        response = auth_session.post(f"{BASE_URL}/api/playlists/{playlist_id}/songs/{song_id}")
        assert response.status_code == 200, f"Add song to playlist failed: {response.text}"
        
        # Verify song is in playlist
        get_resp = auth_session.get(f"{BASE_URL}/api/playlists/{playlist_id}")
        playlist_data = get_resp.json()
        assert song_id in playlist_data.get("song_ids", [])
        print(f"Song {song_id} added to playlist {playlist_id}")
        
        # Cleanup
        auth_session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_delete_playlist(self, auth_session):
        """Test playlist deletion"""
        # Create playlist
        create_resp = auth_session.post(
            f"{BASE_URL}/api/playlists",
            json={"name": "Test Delete Playlist", "description": ""}
        )
        playlist_id = create_resp.json()["id"]
        
        # Delete playlist
        response = auth_session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
        assert response.status_code == 200, f"Delete playlist failed: {response.text}"
        
        # Verify deleted
        get_resp = auth_session.get(f"{BASE_URL}/api/playlists/{playlist_id}")
        assert get_resp.status_code == 404
        print(f"Playlist {playlist_id} deleted successfully")


class TestSearchEndpoint:
    """Search functionality tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return session
    
    def test_search(self, auth_session):
        """Test GET /api/search?q=test"""
        response = auth_session.get(f"{BASE_URL}/api/search", params={"q": "test"})
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        
        assert "songs" in data
        assert "playlists" in data
        assert "artists" in data
        assert isinstance(data["songs"], list)
        assert isinstance(data["playlists"], list)
        assert isinstance(data["artists"], list)
        print(f"Search returned: {len(data['songs'])} songs, {len(data['playlists'])} playlists, {len(data['artists'])} artists")


class TestStatsEndpoint:
    """Stats endpoint tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return session
    
    def test_get_stats(self, auth_session):
        """Test GET /api/stats"""
        response = auth_session.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200, f"GET stats failed: {response.text}"
        data = response.json()
        
        assert "total_songs" in data
        assert "total_playlists" in data
        assert "total_storage_bytes" in data
        assert "total_storage_mb" in data
        assert "liked_songs" in data
        print(f"Stats: {data['total_songs']} songs, {data['total_playlists']} playlists, {data['total_storage_mb']} MB")


class TestArtistsEndpoint:
    """Artists aggregation tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return session
    
    def test_get_artists(self, auth_session):
        """Test GET /api/artists"""
        response = auth_session.get(f"{BASE_URL}/api/artists")
        assert response.status_code == 200, f"GET artists failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        if data:
            assert "name" in data[0]
            assert "song_count" in data[0]
        print(f"GET /api/artists returned {len(data)} artists")


class TestUserProfileEndpoints:
    """User profile tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        return session
    
    def test_get_user_profile(self, auth_session):
        """Test GET /api/users/me"""
        response = auth_session.get(f"{BASE_URL}/api/users/me")
        assert response.status_code == 200, f"GET profile failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "username" in data
        assert "email" in data
        assert "followers_count" in data
        assert "following_count" in data
        assert "songs_count" in data
        print(f"Profile: {data['username']} ({data['email']})")
    
    def test_update_user_profile(self, auth_session):
        """Test PUT /api/users/me"""
        # Get current profile
        current = auth_session.get(f"{BASE_URL}/api/users/me").json()
        original_bio = current.get("bio", "")
        
        # Update bio
        new_bio = f"Test bio updated at {int(time.time())}"
        response = auth_session.put(
            f"{BASE_URL}/api/users/me",
            json={"bio": new_bio}
        )
        assert response.status_code == 200, f"Update profile failed: {response.text}"
        data = response.json()
        
        assert data["bio"] == new_bio
        print(f"Profile bio updated to: {new_bio}")
        
        # Restore original bio
        auth_session.put(f"{BASE_URL}/api/users/me", json={"bio": original_bio})


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
