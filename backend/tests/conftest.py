"""
444.HEIMAT-FUNK Music - Test Configuration
Credentials loaded from environment variables.
"""
import os
import pytest

@pytest.fixture
def api_url():
    return os.environ.get("TEST_API_URL", "http://localhost:8001")

@pytest.fixture
def admin_email():
    return os.environ.get("ADMIN_EMAIL", "admin@444hf.de")

@pytest.fixture
def admin_password():
    return os.environ.get("ADMIN_PASSWORD")
