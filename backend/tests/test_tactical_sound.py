"""
Tactical Sound Station - Backend API Tests
Tests PWA assets, song upload/list/stream, and playlist endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPWAAssets:
    """PWA manifest and icon accessibility tests"""
    
    def test_manifest_json_accessible(self):
        """Verify manifest.json is accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"manifest.json not accessible: {response.status_code}"
        
        data = response.json()
        assert data["name"] == "Tactical Sound Station"
        assert data["short_name"] == "TSS"
        assert data["display"] == "standalone"
        assert data["lang"] == "de"
        assert data["theme_color"] == "#1a1a1a"
        assert data["background_color"] == "#0a0a0a"
        print("✓ manifest.json accessible with correct content")
    
    def test_manifest_icons_array(self):
        """Verify manifest.json contains all required icon sizes"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        data = response.json()
        icons = data.get("icons", [])
        
        # Check for required sizes
        sizes_found = []
        for icon in icons:
            sizes_found.append(icon.get("sizes", ""))
        
        # Verify key sizes are present
        assert any("16x16" in s for s in sizes_found), "16x16 icon missing"
        assert any("32x32" in s for s in sizes_found), "32x32 icon missing"
        assert any("76x76" in s for s in sizes_found), "76x76 icon missing"
        assert any("120x120" in s for s in sizes_found), "120x120 icon missing"
        assert any("152x152" in s for s in sizes_found), "152x152 icon missing"
        assert any("192x192" in s for s in sizes_found), "192x192 icon missing"
        assert any("512x512" in s for s in sizes_found), "512x512 icon missing"
        print("✓ All required icon sizes present in manifest")
    
    def test_favicon_accessible(self):
        """Verify favicon.ico is accessible"""
        response = requests.get(f"{BASE_URL}/favicon.ico")
        assert response.status_code == 200, f"favicon.ico not accessible: {response.status_code}"
        assert len(response.content) > 0, "favicon.ico is empty"
        print("✓ favicon.ico accessible")
    
    def test_icon_192_accessible(self):
        """Verify icon-192x192.png is accessible"""
        response = requests.get(f"{BASE_URL}/icon-192x192.png")
        assert response.status_code == 200, f"icon-192x192.png not accessible: {response.status_code}"
        assert len(response.content) > 0, "icon-192x192.png is empty"
        print("✓ icon-192x192.png accessible")
    
    def test_icon_512_accessible(self):
        """Verify icon-512x512.png is accessible"""
        response = requests.get(f"{BASE_URL}/icon-512x512.png")
        assert response.status_code == 200, f"icon-512x512.png not accessible: {response.status_code}"
        assert len(response.content) > 0, "icon-512x512.png is empty"
        print("✓ icon-512x512.png accessible")
    
    def test_apple_touch_icon_accessible(self):
        """Verify apple-touch-icon.png is accessible"""
        response = requests.get(f"{BASE_URL}/apple-touch-icon.png")
        assert response.status_code == 200, f"apple-touch-icon.png not accessible: {response.status_code}"
        assert len(response.content) > 0, "apple-touch-icon.png is empty"
        print("✓ apple-touch-icon.png accessible")
    
    def test_favicon_16_accessible(self):
        """Verify favicon-16x16.png is accessible"""
        response = requests.get(f"{BASE_URL}/favicon-16x16.png")
        assert response.status_code == 200, f"favicon-16x16.png not accessible: {response.status_code}"
        print("✓ favicon-16x16.png accessible")
    
    def test_favicon_32_accessible(self):
        """Verify favicon-32x32.png is accessible"""
        response = requests.get(f"{BASE_URL}/favicon-32x32.png")
        assert response.status_code == 200, f"favicon-32x32.png not accessible: {response.status_code}"
        print("✓ favicon-32x32.png accessible")


class TestSongEndpoints:
    """Song CRUD and streaming endpoint tests"""
    
    def test_get_songs_list(self):
        """Verify GET /api/songs returns list"""
        response = requests.get(f"{BASE_URL}/api/songs")
        assert response.status_code == 200, f"GET /api/songs failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/songs returns {len(data)} songs")
        return data
    
    def test_get_songs_with_search(self):
        """Verify GET /api/songs with search parameter"""
        response = requests.get(f"{BASE_URL}/api/songs", params={"search": "test"})
        assert response.status_code == 200, f"GET /api/songs with search failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/songs with search works")
    
    def test_get_nonexistent_song(self):
        """Verify GET /api/songs/{id} returns 404 for nonexistent song"""
        response = requests.get(f"{BASE_URL}/api/songs/nonexistent-id-12345")
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print("✓ GET /api/songs/{id} returns 404 for nonexistent song")
    
    def test_stream_nonexistent_song(self):
        """Verify GET /api/songs/{id}/stream returns 404 for nonexistent song"""
        response = requests.get(f"{BASE_URL}/api/songs/nonexistent-id-12345/stream")
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print("✓ GET /api/songs/{id}/stream returns 404 for nonexistent song")
    
    def test_like_nonexistent_song(self):
        """Verify POST /api/songs/{id}/like returns 404 for nonexistent song"""
        response = requests.post(f"{BASE_URL}/api/songs/nonexistent-id-12345/like")
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print("✓ POST /api/songs/{id}/like returns 404 for nonexistent song")


class TestPlaylistEndpoints:
    """Playlist CRUD endpoint tests"""
    
    def test_get_playlists_list(self):
        """Verify GET /api/playlists returns list"""
        response = requests.get(f"{BASE_URL}/api/playlists")
        assert response.status_code == 200, f"GET /api/playlists failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/playlists returns {len(data)} playlists")
    
    def test_create_and_delete_playlist(self):
        """Verify POST /api/playlists creates playlist and DELETE removes it"""
        # Create playlist
        create_response = requests.post(
            f"{BASE_URL}/api/playlists",
            json={"name": "TEST_Playlist", "description": "Test playlist for testing"}
        )
        assert create_response.status_code == 200, f"POST /api/playlists failed: {create_response.status_code}"
        
        playlist = create_response.json()
        assert playlist["name"] == "TEST_Playlist"
        assert "id" in playlist
        playlist_id = playlist["id"]
        print(f"✓ Created playlist with id: {playlist_id}")
        
        # Verify it exists
        get_response = requests.get(f"{BASE_URL}/api/playlists/{playlist_id}")
        assert get_response.status_code == 200, f"GET /api/playlists/{playlist_id} failed"
        print("✓ Playlist exists after creation")
        
        # Delete playlist
        delete_response = requests.delete(f"{BASE_URL}/api/playlists/{playlist_id}")
        assert delete_response.status_code == 200, f"DELETE /api/playlists/{playlist_id} failed: {delete_response.status_code}"
        print("✓ Playlist deleted successfully")
        
        # Verify it's gone
        verify_response = requests.get(f"{BASE_URL}/api/playlists/{playlist_id}")
        assert verify_response.status_code == 404, "Playlist should be deleted"
        print("✓ Playlist no longer exists after deletion")
    
    def test_get_nonexistent_playlist(self):
        """Verify GET /api/playlists/{id} returns 404 for nonexistent playlist"""
        response = requests.get(f"{BASE_URL}/api/playlists/nonexistent-id-12345")
        assert response.status_code == 404, f"Expected 404, got: {response.status_code}"
        print("✓ GET /api/playlists/{id} returns 404 for nonexistent playlist")


class TestStatsEndpoint:
    """Stats endpoint tests"""
    
    def test_get_stats(self):
        """Verify GET /api/stats returns statistics"""
        response = requests.get(f"{BASE_URL}/api/stats")
        assert response.status_code == 200, f"GET /api/stats failed: {response.status_code}"
        
        data = response.json()
        assert "total_songs" in data, "Missing total_songs"
        assert "total_playlists" in data, "Missing total_playlists"
        assert "total_storage_bytes" in data, "Missing total_storage_bytes"
        assert "total_storage_mb" in data, "Missing total_storage_mb"
        print(f"✓ GET /api/stats returns: {data}")


class TestFrontendPage:
    """Frontend page accessibility tests"""
    
    def test_homepage_loads(self):
        """Verify homepage loads correctly"""
        response = requests.get(BASE_URL)
        assert response.status_code == 200, f"Homepage failed to load: {response.status_code}"
        
        # Check for key elements in HTML
        html = response.text
        assert "Tactical Sound Station" in html, "Title not found in HTML"
        assert "manifest.json" in html, "manifest.json link not found"
        print("✓ Homepage loads with correct title and manifest link")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
