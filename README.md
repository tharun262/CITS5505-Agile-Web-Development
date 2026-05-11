# KeepLite — CITS5505 Agile Web Development

KeepLite is a web-based note-taking application that allows users to capture, organise, and share their notes efficiently. Users can create text and checklist notes, colour and label them, and share them publicly for others to view.

---

## 👥 Group Members

| UWA ID | Name | GitHub Username |
|--------|------|----------------|
| 24239318 | Ayden Pan | Pixy-greenhand |
| 24740212 | Zhihao Zhou | 天罡BladeSpiritEndures |
| 24476259 | Tharunkumar Jayaraj Sivakumar | tharun262 , Tharunkumar J S |
| 24183891 | Rohan Varghese Jacob | RohanJacob67 |

---

## 📌 Purpose

KeepLite provides individuals with a simple, intuitive tool to capture thoughts, tasks, and reminders. Users can organise notes with labels and colours, archive completed notes, and share notes publicly to collaborate with others on the platform.

---

## 🏗️ System Architecture

KeepLite uses a client-server architecture:

- **Frontend:** HTML, CSS, JavaScript, Bootstrap
- **Backend:** Python with Flask
- **Database:** SQLite via SQLAlchemy
- **Communication:** AJAX (fetch API)

---

## ⭐ Key Features

- User registration, login and logout
- Create, edit, delete text notes and checklist notes
- Pin, colour and label notes
- Archive completed notes
- Search and filter notes by keyword or label
- Share notes publicly and view other users' shared notes
- Comment on shared posts
- Reminders with due dates

---

## 🚀 How to Launch the Application

### 1. Clone the repository

```bash
git clone https://github.com/tharun262/CITS5505-Agile-Web-Development.git
cd CITS5505-Agile-Web-Development
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Set up environment variables

Create a `.env` file inside the `backend/` folder:

```
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///app.db
```

### 4. Set up the database

```bash
flask db upgrade
```

### 5. Run the Flask server

```bash
python app.py
```

The backend will be running at `http://127.0.0.1:5000`

### 6. Open the frontend

Open `index.html` in your browser directly, or use the Live Server extension in VS Code (right-click `index.html` → Open with Live Server).

---

## 🧪 How to Run the Tests

```bash
cd backend
python -m pytest tests/
```

---

## 🔄 Agile Development

- GitHub Issues used to track bugs and features
- GitHub Pull Requests used for all feature branches
- Regular checkpoint meetings with facilitator
