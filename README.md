<div align="center">

<img src="https://img.shields.io/badge/Nova%20AI-Intelligent%20Assistant-7c5cfc?style=for-the-badge&logo=bolt&logoColor=white" alt="Nova AI">

# ⚡ Nova AI — Intelligent Chat Assistant

**A sleek, full-featured AI chatbot powered by Google Gemini, built with Flask.**

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-API-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[🚀 Features](#-features) · [📸 Screenshots](#-screenshots) · [⚙️ Installation](#️-installation) · [🗂️ Project Structure](#️-project-structure)

</div>

---

## 📖 About

**Nova AI** is a modern, production-ready AI chat assistant built on top of Google's **Gemini 2.5 Flash** model. It features a premium dark-mode UI, multi-session management, markdown rendering, and a suite of productivity tools — all packaged into a lightweight Python + Flask app.

---

## ✨ Features

### 💬 Core Chat
- **Multi-turn conversations** with full context memory per session
- **Markdown rendering** — responses support bold, tables, lists, code blocks, and more
- **Syntax-highlighted code blocks** with one-click **Copy Code** button
- **Typing indicator** animation while waiting for a response
- **Retry / Regenerate** — re-ask the last question with one click
- **Copy message** — copy any message bubble to your clipboard

### 🗂️ Session Management
- **Multiple chat sessions** — switch between conversations freely
- **Rename chats** — give any conversation a custom name
- **Delete chats** — remove individual sessions
- **Clear All** — wipe all history at once
- **Auto-title** — session is automatically named from your first message

### 🔍 Productivity Tools
- **Search** — highlight keywords across the current conversation
- **Export Chat** — download any conversation as a `.txt` file
- **Prompt Library** — pre-built prompt templates (email, code debug, summarize, translate, etc.)
- **Model Switcher** — toggle between `gemini-2.5-flash` and `gemini-2.0-flash` on the fly
- **Share** — copy a session link to your clipboard

### 🎨 UI/UX
- **Premium dark mode** with ambient glow effects (default)
- **Light mode** toggle — preference saved in `localStorage`
- **Collapsible sidebar** — works on desktop and mobile
- **Responsive layout** — optimized for all screen sizes
- **Auto-resize textarea** — grows as you type
- **Character counter** with color warnings (orange → red near limit)
- **Toast notifications** for all user actions
- **Scroll-to-bottom** floating button when scrolled up

---

## 📸 Screenshots

> *Dark Mode — Welcome Screen*

![Nova AI Welcome Screen](https://via.placeholder.com/900x500/0f0f12/7c5cfc?text=Nova+AI+Welcome+Screen)

> *Chat in progress with code block*

![Nova AI Chat](https://via.placeholder.com/900x500/0f0f12/4facfe?text=Nova+AI+Chat+View)

---

## ⚙️ Installation

### Prerequisites
- Python 3.10 or higher
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey) (free tier available)

### 1 — Clone the repository

```bash
git clone https://github.com/K4izox/HACKTIV8-Project.git
cd HACKTIV8-Project
```

### 2 — Create a virtual environment *(recommended)*

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### 4 — Set up your API Key

Copy the example environment file and fill in your key:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and replace the placeholder:

```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY_HERE"
```

> 🔑 Get your free API key at [Google AI Studio](https://aistudio.google.com/app/apikey)

### 5 — Run the app

```bash
python app.py
```

Open your browser and go to:

```
http://127.0.0.1:5000
```

---

## 🗂️ Project Structure

```
HACKTIV8-Project/
│
├── app.py                  # Flask backend + Gemini API integration
│
├── templates/
│   └── index.html          # Main HTML page (Nova AI UI)
│
├── static/
│   ├── css/
│   │   └── style.css       # Premium dark/light mode styles
│   └── js/
│       └── main.js         # Frontend logic (all features)
│
├── .env                    # 🔒 Your secret API key (NOT committed)
├── .env.example            # Template for .env
├── .gitignore              # Excludes .env and cache files
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/` | Serve the main chat UI |
| `POST` | `/chat` | Send a message, get AI response |
| `GET`  | `/api/sessions` | List all chat sessions |
| `GET`  | `/api/sessions/<id>` | Get full history of a session |
| `DELETE` | `/api/sessions/<id>` | Delete a session |
| `POST` | `/api/sessions/<id>/rename` | Rename a session |
| `POST` | `/api/sessions/clear` | Clear all sessions |

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `flask` | Web framework & routing |
| `google-genai` | Official Google Gemini SDK |
| `python-dotenv` | Loads `.env` variables |

---

## 🔒 Security Notes

- Your `.env` file is listed in `.gitignore` and will **never** be pushed to GitHub.
- Chat sessions are stored **in memory only** — they reset when the server restarts.
- This app uses Flask's development server. For production, use **Gunicorn** or **uWSGI** behind a reverse proxy like **Nginx**.

---

## 🚀 Deployment (Optional)

To run in production with Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by [K4izox](https://github.com/K4izox)

⭐ **Star this repo if you found it useful!**

</div>
