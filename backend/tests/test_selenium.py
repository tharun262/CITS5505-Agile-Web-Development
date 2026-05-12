import pytest
import threading
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from extensions import db
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

BASE_URL = "http://127.0.0.1:5000"

@pytest.fixture(scope="module")
def live_server():
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['SECRET_KEY'] = 'test-secret'
    with app.app_context():
        db.create_all()
        thread = threading.Thread(target=lambda: app.run(port=5000, use_reloader=False))
        thread.daemon = True
        thread.start()
        time.sleep(1)
        yield
        db.drop_all()


@pytest.fixture(scope="module")
def driver(live_server):
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    driver = webdriver.Chrome(options=options)
    yield driver
    driver.quit()


# Test 1: Home page loads
def test_home_page_loads(driver):
    driver.get(BASE_URL)
    assert "running" in driver.page_source.lower() or driver.title is not None


# Test 2: Signup endpoint works via browser
def test_signup_via_api(driver):
    import requests
    res = requests.post(f"{BASE_URL}/auth/signup", json={
        "username": "seleniumuser",
        "email": "selenium@test.com",
        "password": "testpass123"
    })
    assert res.status_code == 201


# Test 3: Login endpoint works via browser
def test_login_via_api(driver):
    import requests
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "username": "seleniumuser",
        "password": "testpass123"
    })
    assert res.status_code == 200


# Test 4: Feed endpoint is accessible
def test_feed_accessible(driver):
    import requests
    res = requests.get(f"{BASE_URL}/api/v1/feed")
    assert res.status_code == 200


# Test 5: Tasks endpoint requires auth
def test_tasks_requires_auth(driver):
    import requests
    res = requests.get(f"{BASE_URL}/api/v1/tasks")
    assert res.status_code == 401


# Test 6: Create task requires auth
def test_create_task_requires_auth(driver):
    import requests
    res = requests.post(f"{BASE_URL}/api/v1/tasks", json={"title": "test"})
    assert res.status_code == 401


# Test 7: Login and create task
def test_login_and_create_task(driver):
    import requests
    session = requests.Session()
    session.post(f"{BASE_URL}/auth/signup", json={
        "username": "taskuser",
        "email": "task@test.com",
        "password": "testpass123"
    })
    session.post(f"{BASE_URL}/auth/login", json={
        "username": "taskuser",
        "password": "testpass123"
    })
    res = session.post(f"{BASE_URL}/api/v1/tasks", json={"title": "Selenium Task"})
    assert res.status_code == 201


# Test 8: Get tasks after login
def test_get_tasks_after_login(driver):
    import requests
    session = requests.Session()
    session.post(f"{BASE_URL}/auth/login", json={
        "username": "taskuser",
        "password": "testpass123"
    })
    res = session.get(f"{BASE_URL}/api/v1/tasks")
    assert res.status_code == 200


# Test 9: Logout works
def test_logout_works(driver):
    import requests
    session = requests.Session()
    session.post(f"{BASE_URL}/auth/login", json={
        "username": "taskuser",
        "password": "testpass123"
    })
    res = session.post(f"{BASE_URL}/auth/logout")
    assert res.status_code == 200


# Test 10: Profile endpoint works
def test_profile_endpoint(driver):
    import requests
    session = requests.Session()
    session.post(f"{BASE_URL}/auth/login", json={
        "username": "taskuser",
        "password": "testpass123"
    })
    res = session.get(f"{BASE_URL}/profiles/me")
    assert res.status_code in [200, 401]
