"""
444.HEIMAT-FUNK Music - P2 Features Tests (Iteration 7)
Tests for:
- Playlist Sharing: POST /api/playlists/{id}/share, GET /api/shared/{share_id}
- Collaborative Playlists: POST/DELETE /api/playlists/{id}/collaborators/{email}
- Collaborator permissions: add/remove songs from collaborative playlists
"""
import os
import pytest
import requests
import uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://tactical-sound.preview.emergentagent.com")

# Admin credentials
ADMIN_EMAIL = "admin@444hf.de"
ADMIN_PASSWORD = "HeimatFunk444!"

# Test user for collaborator testing
TEST_USER_EMAIL = f"testuser_{uuid.uuid4().hex[:8]}@test.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_NAME = "TestCollaborator"


class TestPlaylistSharing:
    """Test playlist sharing features: toggle share, get shared playlist"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        
    def _login_admin(self):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()
    
    def _create_test_playlist(self, name="TEST_SharePlaylist"):
        """Create a test playlist for sharing tests"""
        response = self.session.post(
            f"{BASE_URL}/api/playlists",
            json={"name": name, "description": "Test playlist for sharing", "is_public": False}
        )
        assert response.status_code == 200, f"Create playlist failed: {response.text}"
        return response.json()
    
    def test_toggle_share_enables_sharing(self):
        """Test POST /api/playlists/{id}/share enables sharing and generates share_id"""
        self._login_admin()
        
        # Create a test playlist
        playlist = self._create_test_playlist("TEST_ShareToggle")
        playlist_id = playlist["id"]
        
        try:
            # Initially not shared
            assert playlist.get("is_shared") == False, "New playlist should not be shared"
            assert playlist.get("share_id") is None, "New playlist should not have share_id"
            
            # Toggle share ON
            response = self.session.post(f"{BASE_URL}/api/playlists/{playlist_id}/share")
            assert response.status_code == 200, f"Toggle share failed: {response.text}"
            
            data = response.json()
            assert data.get("is_shared") == True, "Playlist should be shared after toggle"
            assert data.get("share_id") is not None, "Playlist should have share_id after sharing"
            assert len(data.get("share_id", "")) == 8, f"share_id should be 8 chars: {data.get('share_id')}"
            
            print(f"PASS: Toggle share ON - share_id={data['share_id']}")
            
            # Toggle share OFF
            response = self.session.post(f"{BASE_URL}/api/playlists/{playlist_id}/share")
            assert response.status_code == 200
            
            data = response.json()
            assert data.get("is_shared") == False, "Playlist should not be shared after second toggle"
            # share_id should still exist (not deleted)
            assert data.get("share_id") is not None, "share_id should persist after unsharing"
            
            print("PASS: Toggle share OFF - share_id persists")
            
        finally:
            # Cleanup
            self.session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_get_shared_playlist_requires_auth(self):
        """Test GET /api/shared/{share_id} requires authentication"""
        # Use a fresh session without auth
        fresh_session = requests.Session()
        
        response = fresh_session.get(f"{BASE_URL}/api/shared/559169e2")
        assert response.status_code == 401, f"Should require auth: {response.status_code}"
        print("PASS: GET /api/shared requires authentication")
    
    def test_get_shared_playlist_returns_data(self):
        """Test GET /api/shared/{share_id} returns playlist with songs and owner_name"""
        self._login_admin()
        
        # Use the existing shared playlist from context
        share_id = "559169e2"
        
        response = self.session.get(f"{BASE_URL}/api/shared/{share_id}")
        assert response.status_code == 200, f"Get shared playlist failed: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "name" in data, "Should have name"
        assert "songs" in data, "Should have songs array"
        assert "owner_name" in data, "Should have owner_name"
        assert "is_shared" in data, "Should have is_shared"
        
        print(f"PASS: GET /api/shared/{share_id} returns playlist")
        print(f"  Name: {data['name']}")
        print(f"  Owner: {data['owner_name']}")
        print(f"  Songs: {len(data.get('songs', []))}")
    
    def test_get_shared_invalid_returns_404(self):
        """Test GET /api/shared/invalid returns 404"""
        self._login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/shared/invalid123")
        assert response.status_code == 404, f"Should return 404 for invalid share_id: {response.status_code}"
        print("PASS: GET /api/shared/invalid returns 404")
    
    def test_share_only_owner_can_toggle(self):
        """Test that only owner can toggle sharing"""
        self._login_admin()
        
        # Create playlist as admin
        playlist = self._create_test_playlist("TEST_OwnerOnlyShare")
        playlist_id = playlist["id"]
        
        try:
            # Register a second user
            second_session = requests.Session()
            reg_response = second_session.post(
                f"{BASE_URL}/api/auth/register",
                json={"username": "NonOwner", "email": f"nonowner_{uuid.uuid4().hex[:8]}@test.com", "password": "TestPass123!"}
            )
            
            if reg_response.status_code == 200:
                # Try to toggle share as non-owner
                response = second_session.post(f"{BASE_URL}/api/playlists/{playlist_id}/share")
                assert response.status_code in [403, 404], f"Non-owner should not be able to toggle share: {response.status_code}"
                print("PASS: Non-owner cannot toggle share (403/404)")
            else:
                print("INFO: Could not create second user for owner-only test")
                
        finally:
            self.session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")


class TestCollaborativePlaylist:
    """Test collaborative playlist features: add/remove collaborators"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.second_session = requests.Session()
        self.test_user_id = None
        
    def _login_admin(self):
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()
    
    def _register_test_user(self):
        """Register a test user for collaborator testing"""
        email = f"collab_{uuid.uuid4().hex[:8]}@test.com"
        response = self.second_session.post(
            f"{BASE_URL}/api/auth/register",
            json={"username": "CollabUser", "email": email, "password": "TestPass123!"}
        )
        if response.status_code == 200:
            data = response.json()
            return email, data.get("user", {}).get("id")
        return None, None
    
    def _create_test_playlist(self, name="TEST_CollabPlaylist"):
        response = self.session.post(
            f"{BASE_URL}/api/playlists",
            json={"name": name, "description": "Test collaborative playlist", "is_public": False}
        )
        assert response.status_code == 200, f"Create playlist failed: {response.text}"
        return response.json()
    
    def test_add_collaborator_by_email(self):
        """Test POST /api/playlists/{id}/collaborators/{email} adds collaborator"""
        self._login_admin()
        
        # Register a test user
        collab_email, collab_id = self._register_test_user()
        if not collab_email:
            pytest.skip("Could not register test user")
        
        # Create playlist as admin
        playlist = self._create_test_playlist("TEST_AddCollab")
        playlist_id = playlist["id"]
        
        try:
            # Add collaborator
            response = self.session.post(
                f"{BASE_URL}/api/playlists/{playlist_id}/collaborators/{collab_email}"
            )
            assert response.status_code == 200, f"Add collaborator failed: {response.text}"
            
            data = response.json()
            assert "message" in data, "Should return success message"
            print(f"PASS: Add collaborator - {data['message']}")
            
            # Verify playlist is now collaborative
            response = self.session.get(f"{BASE_URL}/api/playlists/{playlist_id}")
            assert response.status_code == 200
            
            pl_data = response.json()
            assert pl_data.get("is_collaborative") == True, "Playlist should be collaborative after adding collaborator"
            print("PASS: Playlist is_collaborative=true after adding collaborator")
            
        finally:
            self.session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_get_collaborators_list(self):
        """Test GET /api/playlists/{id}/collaborators returns collaborator list"""
        self._login_admin()
        
        # Register a test user
        collab_email, _ = self._register_test_user()
        if not collab_email:
            pytest.skip("Could not register test user")
        
        # Create playlist and add collaborator
        playlist = self._create_test_playlist("TEST_GetCollabs")
        playlist_id = playlist["id"]
        
        try:
            # Add collaborator
            self.session.post(f"{BASE_URL}/api/playlists/{playlist_id}/collaborators/{collab_email}")
            
            # Get collaborators
            response = self.session.get(f"{BASE_URL}/api/playlists/{playlist_id}/collaborators")
            assert response.status_code == 200, f"Get collaborators failed: {response.text}"
            
            collabs = response.json()
            assert isinstance(collabs, list), "Should return list"
            assert len(collabs) >= 1, "Should have at least 1 collaborator"
            
            # Verify structure
            for c in collabs:
                assert "id" in c, "Collaborator should have id"
                assert "username" in c, "Collaborator should have username"
                assert "email" in c, "Collaborator should have email"
            
            print(f"PASS: GET collaborators returns {len(collabs)} collaborators")
            
        finally:
            self.session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_remove_collaborator(self):
        """Test DELETE /api/playlists/{id}/collaborators/{email} removes collaborator"""
        self._login_admin()
        
        # Register a test user
        collab_email, _ = self._register_test_user()
        if not collab_email:
            pytest.skip("Could not register test user")
        
        # Create playlist and add collaborator
        playlist = self._create_test_playlist("TEST_RemoveCollab")
        playlist_id = playlist["id"]
        
        try:
            # Add collaborator
            self.session.post(f"{BASE_URL}/api/playlists/{playlist_id}/collaborators/{collab_email}")
            
            # Remove collaborator
            response = self.session.delete(
                f"{BASE_URL}/api/playlists/{playlist_id}/collaborators/{collab_email}"
            )
            assert response.status_code == 200, f"Remove collaborator failed: {response.text}"
            
            data = response.json()
            assert "message" in data, "Should return success message"
            print(f"PASS: Remove collaborator - {data['message']}")
            
            # Verify collaborator is removed
            response = self.session.get(f"{BASE_URL}/api/playlists/{playlist_id}/collaborators")
            collabs = response.json()
            
            collab_emails = [c["email"] for c in collabs]
            assert collab_email not in collab_emails, "Collaborator should be removed"
            print("PASS: Collaborator removed from list")
            
        finally:
            self.session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_cannot_add_self_as_collaborator(self):
        """Test that owner cannot add themselves as collaborator"""
        self._login_admin()
        
        playlist = self._create_test_playlist("TEST_NoSelfCollab")
        playlist_id = playlist["id"]
        
        try:
            # Try to add self
            response = self.session.post(
                f"{BASE_URL}/api/playlists/{playlist_id}/collaborators/{ADMIN_EMAIL}"
            )
            assert response.status_code == 400, f"Should not allow adding self: {response.status_code}"
            print("PASS: Cannot add self as collaborator (400)")
            
        finally:
            self.session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_add_nonexistent_user_returns_404(self):
        """Test adding non-existent user as collaborator returns 404"""
        self._login_admin()
        
        playlist = self._create_test_playlist("TEST_NonexistentCollab")
        playlist_id = playlist["id"]
        
        try:
            response = self.session.post(
                f"{BASE_URL}/api/playlists/{playlist_id}/collaborators/nonexistent@fake.com"
            )
            assert response.status_code == 404, f"Should return 404 for non-existent user: {response.status_code}"
            print("PASS: Add non-existent user returns 404")
            
        finally:
            self.session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")


class TestCollaboratorPermissions:
    """Test collaborator permissions: add/remove songs from collaborative playlists"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_session = requests.Session()
        self.collab_session = requests.Session()
        self.non_collab_session = requests.Session()
        
    def _login_admin(self):
        response = self.admin_session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()
    
    def _register_and_login_user(self, session, prefix="user"):
        """Register a new user and return their email"""
        email = f"{prefix}_{uuid.uuid4().hex[:8]}@test.com"
        response = session.post(
            f"{BASE_URL}/api/auth/register",
            json={"username": f"{prefix.title()}User", "email": email, "password": "TestPass123!"}
        )
        if response.status_code == 200:
            return email
        return None
    
    def test_collaborator_can_add_song(self):
        """Test that collaborator can add songs to collaborative playlist"""
        self._login_admin()
        
        # Register collaborator
        collab_email = self._register_and_login_user(self.collab_session, "collab")
        if not collab_email:
            pytest.skip("Could not register collaborator")
        
        # Create playlist as admin
        response = self.admin_session.post(
            f"{BASE_URL}/api/playlists",
            json={"name": "TEST_CollabAddSong", "description": "Test", "is_public": False}
        )
        playlist = response.json()
        playlist_id = playlist["id"]
        
        try:
            # Add collaborator
            self.admin_session.post(f"{BASE_URL}/api/playlists/{playlist_id}/collaborators/{collab_email}")
            
            # Get a song to add (from admin's library)
            response = self.admin_session.get(f"{BASE_URL}/api/songs")
            songs = response.json()
            
            if not songs:
                pytest.skip("No songs available for testing")
            
            song_id = songs[0]["id"]
            
            # Collaborator adds song
            response = self.collab_session.post(
                f"{BASE_URL}/api/playlists/{playlist_id}/songs/{song_id}"
            )
            assert response.status_code == 200, f"Collaborator should be able to add song: {response.text}"
            print(f"PASS: Collaborator can add song to collaborative playlist")
            
        finally:
            self.admin_session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_collaborator_can_remove_song(self):
        """Test that collaborator can remove songs from collaborative playlist"""
        self._login_admin()
        
        # Register collaborator
        collab_email = self._register_and_login_user(self.collab_session, "collab")
        if not collab_email:
            pytest.skip("Could not register collaborator")
        
        # Create playlist as admin
        response = self.admin_session.post(
            f"{BASE_URL}/api/playlists",
            json={"name": "TEST_CollabRemoveSong", "description": "Test", "is_public": False}
        )
        playlist = response.json()
        playlist_id = playlist["id"]
        
        try:
            # Add collaborator
            self.admin_session.post(f"{BASE_URL}/api/playlists/{playlist_id}/collaborators/{collab_email}")
            
            # Get a song and add it first
            response = self.admin_session.get(f"{BASE_URL}/api/songs")
            songs = response.json()
            
            if not songs:
                pytest.skip("No songs available for testing")
            
            song_id = songs[0]["id"]
            
            # Admin adds song
            self.admin_session.post(f"{BASE_URL}/api/playlists/{playlist_id}/songs/{song_id}")
            
            # Collaborator removes song
            response = self.collab_session.delete(
                f"{BASE_URL}/api/playlists/{playlist_id}/songs/{song_id}"
            )
            assert response.status_code == 200, f"Collaborator should be able to remove song: {response.text}"
            print(f"PASS: Collaborator can remove song from collaborative playlist")
            
        finally:
            self.admin_session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_non_collaborator_cannot_add_song(self):
        """Test that non-collaborator cannot add songs to playlist (403)"""
        self._login_admin()
        
        # Register non-collaborator
        non_collab_email = self._register_and_login_user(self.non_collab_session, "noncollab")
        if not non_collab_email:
            pytest.skip("Could not register non-collaborator")
        
        # Create playlist as admin (NOT collaborative)
        response = self.admin_session.post(
            f"{BASE_URL}/api/playlists",
            json={"name": "TEST_NonCollabAddSong", "description": "Test", "is_public": False}
        )
        playlist = response.json()
        playlist_id = playlist["id"]
        
        try:
            # Get a song
            response = self.admin_session.get(f"{BASE_URL}/api/songs")
            songs = response.json()
            
            if not songs:
                pytest.skip("No songs available for testing")
            
            song_id = songs[0]["id"]
            
            # Non-collaborator tries to add song
            response = self.non_collab_session.post(
                f"{BASE_URL}/api/playlists/{playlist_id}/songs/{song_id}"
            )
            assert response.status_code in [403, 404], f"Non-collaborator should not be able to add song: {response.status_code}"
            print(f"PASS: Non-collaborator cannot add song (403/404)")
            
        finally:
            self.admin_session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_non_collaborator_cannot_remove_song(self):
        """Test that non-collaborator cannot remove songs from playlist (403)"""
        self._login_admin()
        
        # Register non-collaborator
        non_collab_email = self._register_and_login_user(self.non_collab_session, "noncollab")
        if not non_collab_email:
            pytest.skip("Could not register non-collaborator")
        
        # Create playlist as admin
        response = self.admin_session.post(
            f"{BASE_URL}/api/playlists",
            json={"name": "TEST_NonCollabRemoveSong", "description": "Test", "is_public": False}
        )
        playlist = response.json()
        playlist_id = playlist["id"]
        
        try:
            # Get a song and add it
            response = self.admin_session.get(f"{BASE_URL}/api/songs")
            songs = response.json()
            
            if not songs:
                pytest.skip("No songs available for testing")
            
            song_id = songs[0]["id"]
            self.admin_session.post(f"{BASE_URL}/api/playlists/{playlist_id}/songs/{song_id}")
            
            # Non-collaborator tries to remove song
            response = self.non_collab_session.delete(
                f"{BASE_URL}/api/playlists/{playlist_id}/songs/{song_id}"
            )
            assert response.status_code in [403, 404], f"Non-collaborator should not be able to remove song: {response.status_code}"
            print(f"PASS: Non-collaborator cannot remove song (403/404)")
            
        finally:
            self.admin_session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
    
    def test_collaborator_sees_playlist_in_list(self):
        """Test that collaborator sees collaborative playlist in their playlist list"""
        self._login_admin()
        
        # Register collaborator
        collab_email = self._register_and_login_user(self.collab_session, "collab")
        if not collab_email:
            pytest.skip("Could not register collaborator")
        
        # Create playlist as admin
        response = self.admin_session.post(
            f"{BASE_URL}/api/playlists",
            json={"name": "TEST_CollabSeesPlaylist", "description": "Test", "is_public": False}
        )
        playlist = response.json()
        playlist_id = playlist["id"]
        
        try:
            # Add collaborator
            self.admin_session.post(f"{BASE_URL}/api/playlists/{playlist_id}/collaborators/{collab_email}")
            
            # Collaborator gets their playlists
            response = self.collab_session.get(f"{BASE_URL}/api/playlists")
            assert response.status_code == 200
            
            playlists = response.json()
            playlist_ids = [p["id"] for p in playlists]
            
            assert playlist_id in playlist_ids, "Collaborator should see collaborative playlist in their list"
            print("PASS: Collaborator sees collaborative playlist in their list")
            
        finally:
            self.admin_session.delete(f"{BASE_URL}/api/playlists/{playlist_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
