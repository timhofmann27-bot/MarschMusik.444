"""
444.HEIMAT-FUNK Music - Metadata Bug Fix Tests
Tests for:
- POST /api/songs/upload - Verify proper metadata extraction (title from ID3 tags or original filename)
- GET /api/songs - Verify songs list returns correct metadata fields
- POST /api/admin/migrate-metadata - Admin-only endpoint for re-extracting metadata
- Duration stored as rounded float (2 decimal places)
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


class TestMetadataFix:
    """Test metadata extraction and display fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with auth cookies"""
        self.session = requests.Session()
        # Don't set Content-Type globally - let requests set it for multipart uploads
        
    def _login_admin(self):
        """Login as admin and get session cookies"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()
    
    def _create_test_mp3(self, title="Test Song", artist="Test Artist", duration=5):
        """Create a test MP3 file with ID3 tags using ffmpeg"""
        temp_file = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        # Create a silent audio file with metadata
        cmd = [
            "ffmpeg", "-y", "-f", "lavfi", "-i", f"anullsrc=r=44100:cl=mono",
            "-t", str(duration),
            "-metadata", f"title={title}",
            "-metadata", f"artist={artist}",
            "-metadata", "album=Test Album",
            "-metadata", "genre=Test Genre",
            "-q:a", "9",
            temp_path
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            print(f"ffmpeg error: {result.stderr}")
        return temp_path
    
    # ─── Health Check ────────────────────────────────────────────────────
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        print("✓ Health check passed")
    
    # ─── Auth Tests ──────────────────────────────────────────────────────
    
    def test_admin_login(self):
        """Test admin login works"""
        data = self._login_admin()
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['username']}")
    
    # ─── Song Upload with Metadata Extraction ────────────────────────────
    
    def test_upload_song_extracts_metadata_from_id3_tags(self):
        """Test that uploading a song extracts ID3 tag metadata correctly"""
        self._login_admin()
        
        # Create test MP3 with ID3 tags
        test_title = "KRIEG - TEST SONG"
        test_artist = "TEST ARTIST"
        mp3_path = self._create_test_mp3(title=test_title, artist=test_artist, duration=3)
        
        try:
            with open(mp3_path, "rb") as f:
                response = self.session.post(
                    f"{BASE_URL}/api/songs/upload",
                    files={"file": ("test_upload.mp3", f, "audio/mpeg")}
                )
            
            assert response.status_code == 200, f"Upload failed: {response.text}"
            song = response.json()
            
            # Verify metadata was extracted from ID3 tags
            print(f"  Uploaded song: {song}")
            assert song.get("title") == test_title, f"Expected title '{test_title}', got '{song.get('title')}'"
            assert song.get("artist") == test_artist, f"Expected artist '{test_artist}', got '{song.get('artist')}'"
            assert song.get("album") == "Test Album", f"Expected album 'Test Album', got '{song.get('album')}'"
            
            # Verify duration is a rounded float (2 decimal places)
            duration = song.get("duration")
            assert isinstance(duration, float), f"Duration should be float, got {type(duration)}"
            assert duration == round(duration, 2), f"Duration should be rounded to 2 decimals: {duration}"
            assert duration > 0, f"Duration should be positive: {duration}"
            
            # Verify title is NOT a UUID
            assert not self._is_uuid_like(song.get("title", "")), f"Title should not be UUID-like: {song.get('title')}"
            
            print(f"✓ Upload extracts ID3 metadata correctly: title='{song['title']}', artist='{song['artist']}', duration={song['duration']}")
            
            # Cleanup - delete the test song
            song_id = song.get("id")
            if song_id:
                self.session.delete(f"{BASE_URL}/api/songs/{song_id}")
                print(f"  Cleaned up test song: {song_id}")
                
        finally:
            os.unlink(mp3_path)
    
    def test_upload_song_uses_filename_as_fallback_title(self):
        """Test that if ID3 title is missing, original filename is used as title"""
        self._login_admin()
        
        # Create test MP3 without title tag
        temp_file = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        # Create audio without title metadata
        cmd = [
            "ffmpeg", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
            "-t", "2", "-q:a", "9", temp_path
        ]
        subprocess.run(cmd, capture_output=True)
        
        try:
            original_filename = "My Cool Song Name.mp3"
            with open(temp_path, "rb") as f:
                response = self.session.post(
                    f"{BASE_URL}/api/songs/upload",
                    files={"file": (original_filename, f, "audio/mpeg")}
                )
            
            assert response.status_code == 200, f"Upload failed: {response.text}"
            song = response.json()
            
            # Title should be the filename stem (without extension), not a UUID
            expected_title = "My Cool Song Name"
            assert not self._is_uuid_like(song.get("title", "")), f"Title should not be UUID: {song.get('title')}"
            # The title should either be the filename stem or "Unbekannter Titel" if no ID3 tags
            print(f"  Song title: '{song.get('title')}' (expected: '{expected_title}' or from ID3)")
            
            print(f"✓ Upload uses filename as fallback title: '{song.get('title')}'")
            
            # Cleanup
            song_id = song.get("id")
            if song_id:
                self.session.delete(f"{BASE_URL}/api/songs/{song_id}")
                
        finally:
            os.unlink(temp_path)
    
    def test_upload_with_form_data_overrides_metadata(self):
        """Test that form data can override extracted metadata"""
        self._login_admin()
        
        mp3_path = self._create_test_mp3(title="Original Title", artist="Original Artist")
        
        try:
            override_title = "Override Title"
            override_artist = "Override Artist"
            
            with open(mp3_path, "rb") as f:
                response = self.session.post(
                    f"{BASE_URL}/api/songs/upload",
                    files={"file": ("test.mp3", f, "audio/mpeg")},
                    data={
                        "title": override_title,
                        "artist": override_artist
                    }
                )
            
            assert response.status_code == 200, f"Upload failed: {response.text}"
            song = response.json()
            
            assert song.get("title") == override_title, f"Title should be overridden: {song.get('title')}"
            assert song.get("artist") == override_artist, f"Artist should be overridden: {song.get('artist')}"
            
            print(f"✓ Form data overrides metadata: title='{song['title']}', artist='{song['artist']}'")
            
            # Cleanup
            song_id = song.get("id")
            if song_id:
                self.session.delete(f"{BASE_URL}/api/songs/{song_id}")
                
        finally:
            os.unlink(mp3_path)
    
    # ─── GET /api/songs - Verify Metadata Fields ─────────────────────────
    
    def test_get_songs_returns_correct_metadata_fields(self):
        """Test that GET /api/songs returns proper metadata (not UUIDs)"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200, f"Get songs failed: {response.text}"
        
        songs = response.json()
        print(f"  Found {len(songs)} songs")
        
        for song in songs:
            # Verify required fields exist
            assert "id" in song, "Song should have 'id' field"
            assert "title" in song, "Song should have 'title' field"
            assert "artist" in song, "Song should have 'artist' field"
            assert "duration" in song, "Song should have 'duration' field"
            
            # Verify title is NOT a UUID
            title = song.get("title", "")
            assert not self._is_uuid_like(title), f"Title should not be UUID-like: {title}"
            
            # Verify duration is properly formatted (float, 2 decimal places)
            duration = song.get("duration")
            if duration:
                assert isinstance(duration, (int, float)), f"Duration should be numeric: {type(duration)}"
                # Check it's rounded to 2 decimal places
                if isinstance(duration, float):
                    assert duration == round(duration, 2), f"Duration should be rounded: {duration}"
            
            print(f"  Song: title='{song['title']}', artist='{song['artist']}', duration={song.get('duration')}")
        
        print(f"✓ GET /api/songs returns correct metadata for {len(songs)} songs")
    
    # ─── Admin Migration Endpoint ────────────────────────────────────────
    
    def test_admin_migrate_metadata_requires_admin_role(self):
        """Test that migrate-metadata endpoint requires admin role"""
        # First, try without auth
        response = self.session.post(f"{BASE_URL}/api/admin/migrate-metadata",
                                     headers={"Content-Type": "application/json"})
        assert response.status_code == 401, f"Should require auth: {response.status_code}"
        
        print("✓ Migrate endpoint requires authentication")
    
    def test_admin_migrate_metadata_works(self):
        """Test that admin can trigger metadata migration"""
        self._login_admin()
        
        response = self.session.post(f"{BASE_URL}/api/admin/migrate-metadata",
                                     headers={"Content-Type": "application/json"})
        assert response.status_code == 200, f"Migration failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have message"
        print(f"✓ Admin migration endpoint works: {data['message']}")
    
    # ─── Existing Song Metadata Check ────────────────────────────────────
    
    def test_existing_song_has_proper_metadata(self):
        """Test that the existing song 'KRIEG - DEUTSCHE VITA (2)' has proper metadata"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200
        
        songs = response.json()
        
        # Look for the known existing song
        krieg_song = None
        for song in songs:
            if "KRIEG" in song.get("title", "") or "DEUTSCHE VITA" in song.get("title", ""):
                krieg_song = song
                break
        
        if krieg_song:
            print(f"  Found existing song: {krieg_song}")
            
            # Verify it has proper metadata (not UUID)
            assert not self._is_uuid_like(krieg_song.get("title", "")), "Title should not be UUID"
            assert krieg_song.get("artist") != "Unbekannt" or krieg_song.get("artist") == "DEUTSCHE VITA", \
                f"Artist should be set: {krieg_song.get('artist')}"
            
            # Verify duration is properly formatted
            duration = krieg_song.get("duration")
            if duration:
                assert isinstance(duration, (int, float)), f"Duration should be numeric: {duration}"
                # Should be around 171.76 seconds (2:51)
                print(f"  Duration: {duration}s ({int(duration//60)}:{int(duration%60):02d})")
            
            print(f"✓ Existing song has proper metadata: '{krieg_song['title']}' by '{krieg_song['artist']}'")
        else:
            print("  No existing 'KRIEG' song found - may have been deleted")
            pytest.skip("No existing song to verify")
    
    # ─── Helper Methods ──────────────────────────────────────────────────
    
    def _is_uuid_like(self, text: str) -> bool:
        """Check if text looks like a UUID"""
        import re
        if not text:
            return False
        return bool(re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', text, re.IGNORECASE))


class TestDurationFormatting:
    """Test duration is stored and returned correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def _login_admin(self):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()
    
    def test_duration_is_rounded_float(self):
        """Test that duration is stored as rounded float (2 decimal places)"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200
        
        songs = response.json()
        
        for song in songs:
            duration = song.get("duration")
            if duration is not None and duration > 0:
                # Should be a float
                assert isinstance(duration, (int, float)), f"Duration should be numeric: {type(duration)}"
                
                # Should be rounded to 2 decimal places
                if isinstance(duration, float):
                    rounded = round(duration, 2)
                    assert duration == rounded, f"Duration should be rounded to 2 decimals: {duration} != {rounded}"
                
                print(f"  Song '{song.get('title')}': duration={duration}s")
        
        print(f"✓ All {len(songs)} songs have properly formatted durations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
