import pytest
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from extensions import db
from models import User, Task, Post

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SECRET_KEY'] = 'test-secret'
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.drop_all()


# Test 1: Home route returns 200
def test_home(client):
    res = client.get('/')
    assert res.status_code == 200


# Test 2: Signup with valid data
def test_signup(client):
    res = client.post('/auth/signup', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert res.status_code == 201
    assert b'testuser' in res.data


# Test 3: Signup with missing fields
def test_signup_missing_fields(client):
    res = client.post('/auth/signup', json={
        'username': 'testuser'
    })
    assert res.status_code == 400


# Test 4: Login with valid credentials
def test_login(client):
    client.post('/auth/signup', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    res = client.post('/auth/login', json={
        'username': 'testuser',
        'password': 'password123'
    })
    assert res.status_code == 200
    assert b'Logged in' in res.data


# Test 5: Login with wrong password
def test_login_wrong_password(client):
    client.post('/auth/signup', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    res = client.post('/auth/login', json={
        'username': 'testuser',
        'password': 'wrongpassword'
    })
    assert res.status_code == 401


# Test 6: Access protected route without login
def test_get_tasks_unauthenticated(client):
    res = client.get('/api/v1/tasks')
    assert res.status_code == 401


# Test 7: Create task when logged in
def test_create_task(client):
    client.post('/auth/signup', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    client.post('/auth/login', json={
        'username': 'testuser',
        'password': 'password123'
    })
    res = client.post('/api/v1/tasks', json={
        'title': 'My first task'
    })
    assert res.status_code == 201
    assert b'My first task' in res.data


# Test 8: Duplicate signup rejected
def test_duplicate_signup(client):
    client.post('/auth/signup', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    res = client.post('/auth/signup', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert res.status_code == 409


# Test 9: Logout
def test_logout(client):
    client.post('/auth/signup', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    client.post('/auth/login', json={
        'username': 'testuser',
        'password': 'password123'
    })
    res = client.post('/auth/logout')
    assert res.status_code == 200


# Test 10: Password is stored as hash not plaintext
def test_password_hashed(client):
    client.post('/auth/signup', json={
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'password123'
    })
    with app.app_context():
        user = User.query.filter_by(username='testuser').first()
        assert user.password_hash != 'password123'
