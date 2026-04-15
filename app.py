import os
import uuid
import json
import mimetypes
from datetime import datetime
from flask import Flask, request, jsonify, render_template, Response, stream_with_context
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.urandom(24)

# ── Gemini Client ─────────────────────────────────────
api_key = os.getenv("GEMINI_API_KEY")
try:
    client = genai.Client(api_key=api_key)
except Exception as e:
    client = None
    print(f"Warning: Failed to initialize Gemini Client: {e}")

# ── In-Memory Session Store ───────────────────────────
chat_sessions = {}

ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"]
DEFAULT_MODEL  = "gemini-2.5-flash"

# ── Personas ──────────────────────────────────────────
PERSONAS = {
    "assistant": {
        "name": "General Assistant",
        "instruction": (
            "You are Nova, a highly capable, friendly, and knowledgeable AI assistant. "
            "Give clear, well-structured, and concise answers. "
            "When writing code, always use fenced code blocks with the correct language tag."
        )
    },
    "customer_service": {
        "name": "Customer Service",
        "instruction": (
            "You are Nova, a professional and empathetic customer service representative. "
            "Always greet the user warmly, be polite, solution-oriented, and patient. "
            "Help users resolve issues clearly and offer alternatives when needed. "
            "Use a formal but friendly tone."
        )
    },
    "teacher": {
        "name": "Teacher / Tutor",
        "instruction": (
            "You are Nova, an experienced and patient educator and tutor. "
            "Explain concepts step by step, using simple language and real-world examples. "
            "Encourage learning by asking follow-up questions. "
            "Adapt your explanations to the user's level of understanding."
        )
    },
    "travel": {
        "name": "Travel Guide",
        "instruction": (
            "You are Nova, an expert travel guide with deep knowledge of destinations worldwide. "
            "Provide travel tips, itinerary suggestions, cultural insights, local cuisine recommendations, "
            "and safety advice. Be enthusiastic and inspiring about travel."
        )
    },
    "coder": {
        "name": "Code Assistant",
        "instruction": (
            "You are Nova, an expert software engineer and code assistant. "
            "Help with coding, debugging, code review, and explaining technical concepts. "
            "Always provide working code with explanations. Use the best practices for the language. "
            "Always use fenced code blocks with the correct language identifier."
        )
    }
}

# ── Pages ─────────────────────────────────────────────
@app.route("/")
def index():
    return render_template("index.html")

# ── Helper: create session ────────────────────────────
def _create_session(model, persona, temperature, language="auto", old_history=None):
    sid    = str(uuid.uuid4())
    p_data = PERSONAS.get(persona, PERSONAS["assistant"])
    
    instruction = p_data["instruction"]
    if language != "auto":
        instruction += f"\n\nCRITICAL INSTRUCTION: You MUST respond in the {language} language, regardless of the language the user uses."

    config = {
        "system_instruction": instruction,
        "temperature": float(temperature),
    }
    chat_sessions[sid] = {
        "chat":        client.chats.create(model=model, config=config),
        "title":       "New Chat",
        "history":     old_history or [],
        "model":       model,
        "persona":     persona,
        "temperature": float(temperature),
        "language":    language,
    }
    return sid

def _needs_new_session(session_id, model, persona, temperature, language="auto"):
    existing = chat_sessions.get(session_id) if session_id else None
    if existing is None:
        return True
    if existing.get("model") != model:
        return True
    if existing.get("persona") != persona:
        return True
    if existing.get("language", "auto") != language:
        return True
    return False

# ── Chat (Standard) ───────────────────────────────────
@app.route("/chat", methods=["POST"])
def chat():
    if not client:
        return jsonify({"error": "Gemini Client not initialized. Check GEMINI_API_KEY in .env"}), 500

    data        = request.json or {}
    message     = data.get("message", "").strip()
    session_id  = data.get("session_id", "")
    model       = data.get("model", DEFAULT_MODEL)
    persona     = data.get("persona", "assistant")
    temperature = float(data.get("temperature", 0.7))

    if model not in ALLOWED_MODELS:
        model = DEFAULT_MODEL
    if not message:
        return jsonify({"error": "Message is required"}), 400

    if _needs_new_session(session_id, model, persona, temperature):
        old_history = chat_sessions.get(session_id, {}).get("history", []) if session_id else []
        session_id  = _create_session(model, persona, temperature, old_history)

    session_data = chat_sessions[session_id]
    now = datetime.now().strftime("%H:%M")

    if not any(h["sender"] == "user" for h in session_data["history"]):
        session_data["title"] = (message[:30] + "...") if len(message) > 30 else message

    session_data["history"].append({"sender": "user", "text": message, "time": now})

    try:
        response = session_data["chat"].send_message(message)
        reply    = response.text
    except Exception as e:
        session_data["history"].pop()
        print(f"Gemini error: {e}")
        return jsonify({"error": str(e)}), 500

    session_data["history"].append({"sender": "ai", "text": reply, "time": now})

    return jsonify({
        "response":   reply,
        "session_id": session_id,
        "title":      session_data["title"],
    })

# ── Chat (Streaming SSE) ──────────────────────────────
@app.route("/chat/stream", methods=["POST"])
def chat_stream():
    if not client:
        def err():
            yield f"data: {json.dumps({'type':'error','message':'Gemini Client not initialized'})}\n\n"
        return Response(err(), mimetype="text/event-stream")

    data        = request.json or {}
    message     = data.get("message", "").strip()
    session_id  = data.get("session_id", "")
    model       = data.get("model", DEFAULT_MODEL)
    persona     = data.get("persona", "assistant")
    temperature = float(data.get("temperature", 0.7))
    language    = data.get("language", "auto")

    if model not in ALLOWED_MODELS:
        model = DEFAULT_MODEL

    if not message:
        def err():
            yield f"data: {json.dumps({'type':'error','message':'Message required'})}\n\n"
        return Response(err(), mimetype="text/event-stream")

    if _needs_new_session(session_id, model, persona, temperature, language):
        old_history = chat_sessions.get(session_id, {}).get("history", []) if session_id else []
        session_id  = _create_session(model, persona, temperature, language, old_history)

    session_data = chat_sessions[session_id]
    now = datetime.now().strftime("%H:%M")

    if not any(h["sender"] == "user" for h in session_data["history"]):
        session_data["title"] = (message[:30] + "...") if len(message) > 30 else message

    session_data["history"].append({"sender": "user", "text": message, "time": now})

    def generate():
        full_reply = ""
        try:
            # First, yield session metadata
            yield f"data: {json.dumps({'type':'session','session_id':session_id,'title':session_data['title']})}\n\n"

            # Stream chunks from Gemini
            for chunk in session_data["chat"].send_message_stream(message):
                if chunk.text:
                    full_reply_local = chunk.text
                    yield f"data: {json.dumps({'type':'chunk','text':full_reply_local})}\n\n"
                    # accumulate
            # We can't easily accumulate outside due to generator scope,
            # so we'll store after streaming via a closure trick

            yield f"data: {json.dumps({'type':'done'})}\n\n"

        except Exception as e:
            # Remove the user message we added
            if session_data["history"] and session_data["history"][-1]["sender"] == "user":
                session_data["history"].pop()
            yield f"data: {json.dumps({'type':'error','message':str(e)})}\n\n"

    # We need to collect the full reply to store in history.
    # Use a wrapper that intercepts chunks.
    def generate_and_store():
        full_reply = []
        try:
            yield f"data: {json.dumps({'type':'session','session_id':session_id,'title':session_data['title']})}\n\n"
            for chunk in session_data["chat"].send_message_stream(message):
                if chunk.text:
                    full_reply.append(chunk.text)
                    yield f"data: {json.dumps({'type':'chunk','text':chunk.text})}\n\n"
            
            # Store the complete reply
            complete = "".join(full_reply)
            session_data["history"].append({"sender": "ai", "text": complete, "time": now})
            yield f"data: {json.dumps({'type':'done'})}\n\n"

        except Exception as e:
            if session_data["history"] and session_data["history"][-1]["sender"] == "user":
                session_data["history"].pop()
            print(f"Stream error: {e}")
            yield f"data: {json.dumps({'type':'error','message':str(e)})}\n\n"

    return Response(
        stream_with_context(generate_and_store()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control":   "no-cache",
            "X-Accel-Buffering": "no",
        }
    )

# ── Allowed file types ─────────────────────────────────
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'}
ALLOWED_TEXT_EXTS   = {'.txt', '.md', '.csv', '.json', '.py', '.js', '.ts', '.html', '.css', '.xml', '.yaml', '.yml'}
ALLOWED_DOC_TYPES   = {'application/pdf'}
MAX_FILE_MB         = 10

@app.route("/chat/upload", methods=["POST"])
def chat_upload():
    """Multimodal chat: accepts a file (image/text/pdf) + message."""
    if not client:
        def err():
            yield f"data: {json.dumps({'type':'error','message':'Gemini not initialized'})}\n\n"
        return Response(err(), mimetype="text/event-stream")

    message     = request.form.get("message",    "").strip()
    session_id  = request.form.get("session_id", "")
    model       = request.form.get("model",      DEFAULT_MODEL)
    persona     = request.form.get("persona",    "assistant")
    temperature = float(request.form.get("temperature", 0.7))
    language    = request.form.get("language",   "auto")
    uploaded    = request.files.get("file")

    if model not in ALLOWED_MODELS:
        model = DEFAULT_MODEL

    if not uploaded:
        def err():
            yield f"data: {json.dumps({'type':'error','message':'No file provided'})}\n\n"
        return Response(err(), mimetype="text/event-stream")

    # ── Read file ──────────────────────────────────────
    filename  = uploaded.filename or "file"
    ext       = os.path.splitext(filename)[1].lower()
    mime_type = uploaded.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    file_bytes = uploaded.read()

    if len(file_bytes) > MAX_FILE_MB * 1024 * 1024:
        def err():
            yield f"data: {json.dumps({'type':'error','message':f'File too large (max {MAX_FILE_MB}MB)'})}\n\n"
        return Response(err(), mimetype="text/event-stream")

    # ── Build content parts ────────────────────────────
    parts = []
    file_label = ""

    if mime_type in ALLOWED_IMAGE_TYPES:
        # Image → send as bytes part for Gemini Vision
        parts.append(types.Part.from_bytes(data=file_bytes, mime_type=mime_type))
        file_label = f"[Image: {filename}]"
        if not message:
            message = "Please describe this image in detail."

    elif mime_type in ALLOWED_DOC_TYPES or ext == ".pdf":
        # PDF → send as bytes part
        parts.append(types.Part.from_bytes(data=file_bytes, mime_type="application/pdf"))
        file_label = f"[PDF: {filename}]"
        if not message:
            message = "Please summarize the content of this PDF."

    elif ext in ALLOWED_TEXT_EXTS:
        # Text file → read as UTF-8 and prepend to message
        try:
            text_content = file_bytes.decode("utf-8", errors="replace")
            parts = []  # no binary part needed
            if not message:
                message = f"Here is the content of `{filename}`:\n\n```\n{text_content}\n```\n\nPlease analyze it."
            else:
                message = f"Here is the content of `{filename}`:\n\n```\n{text_content}\n```\n\n{message}"
            file_label = f"[File: {filename}]"
        except Exception as e:
            def err():
                yield f"data: {json.dumps({'type':'error','message':'Cannot read file: ' + str(e)})}\n\n"
            return Response(err(), mimetype="text/event-stream")
    else:
        def err():
            yield f"data: {json.dumps({'type':'error','message':'Unsupported file type: ' + mime_type})}\n\n"
        return Response(err(), mimetype="text/event-stream")

    # Add text message to parts
    if message:
        parts.append(message)

    # ── Session management ─────────────────────────────
    if _needs_new_session(session_id, model, persona, temperature, language):
        old_hist  = chat_sessions.get(session_id, {}).get("history", []) if session_id else []
        session_id = _create_session(model, persona, temperature, language, old_hist)

    session_data = chat_sessions[session_id]
    now = datetime.now().strftime("%H:%M")

    # Build user-facing history text
    user_display = f"{file_label} {message}".strip()
    if not any(h["sender"] == "user" for h in session_data["history"]):
        session_data["title"] = (user_display[:30] + "...") if len(user_display) > 30 else user_display

    session_data["history"].append({"sender": "user", "text": user_display, "time": now})

    def stream_file():
        full = []
        try:
            yield f"data: {json.dumps({'type':'session','session_id':session_id,'title':session_data['title']})}\n\n"
            for chunk in session_data["chat"].send_message_stream(parts):
                if chunk.text:
                    full.append(chunk.text)
                    yield f"data: {json.dumps({'type':'chunk','text':chunk.text})}\n\n"
            complete = "".join(full)
            session_data["history"].append({"sender": "ai", "text": complete, "time": now})
            yield f"data: {json.dumps({'type':'done'})}\n\n"
        except Exception as e:
            if session_data["history"] and session_data["history"][-1]["sender"] == "user":
                session_data["history"].pop()
            print(f"Upload stream error: {e}")
            yield f"data: {json.dumps({'type':'error','message':str(e)})}\n\n"

    return Response(
        stream_with_context(stream_file()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

# ── Sessions API ──────────────────────────────────────
@app.route("/api/sessions/clear", methods=["POST"])
def clear_all_sessions():
    chat_sessions.clear()
    return jsonify({"success": True})

@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    return jsonify({"sessions": [
        {"id": sid, "title": d["title"], "model": d.get("model", DEFAULT_MODEL), "persona": d.get("persona", "assistant")}
        for sid, d in reversed(list(chat_sessions.items()))
    ]})

@app.route("/api/sessions/<session_id>", methods=["GET"])
def get_session(session_id):
    s = chat_sessions.get(session_id)
    if not s:
        return jsonify({"error": "Session not found"}), 404
    return jsonify({
        "id":          session_id,
        "title":       s["title"],
        "history":     s["history"],
        "model":       s.get("model", DEFAULT_MODEL),
        "persona":     s.get("persona", "assistant"),
        "temperature": s.get("temperature", 0.7),
    })

@app.route("/api/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    if session_id not in chat_sessions:
        return jsonify({"error": "Session not found"}), 404
    del chat_sessions[session_id]
    return jsonify({"success": True})

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

@app.route("/api/personas", methods=["GET"])
def get_personas():
    return jsonify({"personas": {k: v["name"] for k, v in PERSONAS.items()}})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
