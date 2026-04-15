import os
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, render_template
from google import genai
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)

# ── Gemini Client ────────────────────────────────────────
api_key = os.getenv("GEMINI_API_KEY")
try:
    client = genai.Client(api_key=api_key)
except Exception as e:
    client = None
    print(f"Warning: Failed to initialize Gemini Client: {e}")

# ── In-Memory Session Store ──────────────────────────────
# { session_id: { "chat": <obj>, "title": str, "history": [], "model": str } }
chat_sessions = {}

ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"]
DEFAULT_MODEL  = "gemini-2.5-flash"
SYSTEM_PROMPT  = (
    "You are Nova, a highly capable, friendly, and knowledgeable AI assistant. "
    "You give clear, well-structured, and concise answers. "
    "When writing code, always use fenced code blocks with the correct language tag."
)

# ── Pages ────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

# ── Chat ─────────────────────────────────────────────────
@app.route("/chat", methods=["POST"])
def chat():
    if not client:
        return jsonify({"error": "Gemini Client not initialized. Check your GEMINI_API_KEY in .env"}), 500

    data       = request.json or {}
    message    = data.get("message", "").strip()
    session_id = data.get("session_id", "")
    model      = data.get("model", DEFAULT_MODEL)

    if model not in ALLOWED_MODELS:
        model = DEFAULT_MODEL
    if not message:
        return jsonify({"error": "Message is required"}), 400

    # Determine if we need a fresh Gemini chat object
    existing = chat_sessions.get(session_id) if session_id else None
    needs_new = (
        existing is None or
        existing.get("model") != model
    )

    if needs_new:
        old_history = existing.get("history", []) if existing else []
        session_id  = str(uuid.uuid4())
        config      = {"system_instruction": SYSTEM_PROMPT}
        chat_sessions[session_id] = {
            "chat":    client.chats.create(model=model, config=config),
            "title":   "New Chat",
            "history": old_history,
            "model":   model,
        }

    session_data = chat_sessions[session_id]
    now = datetime.now().strftime("%H:%M")

    # Auto-title on first user message
    if not any(h["sender"] == "user" for h in session_data["history"]):
        session_data["title"] = (message[:30] + "...") if len(message) > 30 else message

    # Append user message to history
    session_data["history"].append({"sender": "user", "text": message, "time": now})

    try:
        response = session_data["chat"].send_message(message)
        reply    = response.text
    except Exception as e:
        print(f"Gemini error: {e}")
        # Remove the user message we just added since the call failed
        session_data["history"].pop()
        return jsonify({"error": str(e)}), 500

    # Append AI reply to history
    session_data["history"].append({"sender": "ai", "text": reply, "time": now})

    return jsonify({
        "response":   reply,
        "session_id": session_id,
        "title":      session_data["title"],
    })

# ── Sessions: Clear ALL (must be defined before /<session_id>) ──
@app.route("/api/sessions/clear", methods=["POST"])
def clear_all_sessions():
    chat_sessions.clear()
    return jsonify({"success": True})

# ── Sessions: List ───────────────────────────────────────
@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    sessions = [
        {"id": sid, "title": data["title"], "model": data.get("model", DEFAULT_MODEL)}
        for sid, data in reversed(list(chat_sessions.items()))
    ]
    return jsonify({"sessions": sessions})

# ── Sessions: Get (history) ──────────────────────────────
@app.route("/api/sessions/<session_id>", methods=["GET"])
def get_session(session_id):
    s = chat_sessions.get(session_id)
    if not s:
        return jsonify({"error": "Session not found"}), 404
    return jsonify({"id": session_id, "title": s["title"], "history": s["history"], "model": s.get("model", DEFAULT_MODEL)})

# ── Sessions: Delete ─────────────────────────────────────
@app.route("/api/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    if session_id not in chat_sessions:
        return jsonify({"error": "Session not found"}), 404
    del chat_sessions[session_id]
    return jsonify({"success": True})

# ── Sessions: Rename ─────────────────────────────────────
@app.route("/api/sessions/<session_id>/rename", methods=["POST"])
def rename_session(session_id):
    s = chat_sessions.get(session_id)
    if not s:
        return jsonify({"error": "Session not found"}), 404
    title = (request.json or {}).get("title", "").strip()
    if not title:
        return jsonify({"error": "Title required"}), 400
    s["title"] = title[:50]
    return jsonify({"success": True, "title": s["title"]})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
