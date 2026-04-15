/* =====================================================
   Nova AI – Main JavaScript (Full Feature Build)
   Features: Streaming, Persona, Voice Input, Temperature
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* ── DOM Refs ──────────────────────────────────── */
    const messageInput     = document.getElementById('message-input');
    const sendBtn          = document.getElementById('send-btn');
    const chatWindow       = document.getElementById('chat-window');
    const welcomeScreen    = document.getElementById('welcome-screen');
    const themeToggle      = document.getElementById('theme-toggle');
    const chatHistoryList  = document.getElementById('chat-history');
    const newChatBtn       = document.getElementById('new-chat');
    const sidebarToggle    = document.getElementById('sidebar-toggle');
    const sidebar          = document.getElementById('sidebar');
    const exportBtn        = document.getElementById('export-btn');
    const clearAllBtn      = document.getElementById('clear-all-btn');
    const charCount        = document.getElementById('char-count');
    const scrollDownBtn    = document.getElementById('scroll-to-bottom');
    const searchBtn        = document.getElementById('search-btn');
    const searchBar        = document.getElementById('search-bar');
    const searchInput      = document.getElementById('search-input');
    const searchClose      = document.getElementById('search-close');
    const modelBadge       = document.querySelector('.model-badge');
    const modelDropdown    = document.getElementById('model-dropdown');
    const currentModelEl   = document.getElementById('current-model');
    const attachBtn        = document.getElementById('attach-btn');
    const browsePromptsBtn = document.getElementById('browse-prompts-btn');
    const promptsModal     = document.getElementById('prompts-modal');
    const promptsClose     = document.getElementById('prompts-close');
    const renameModal      = document.getElementById('rename-modal');
    const renameInput      = document.getElementById('rename-input');
    const renameConfirm    = document.getElementById('rename-confirm');
    const renameCancel     = document.getElementById('rename-cancel');
    const copySessionBtn   = document.getElementById('copy-session-btn');
    const tempSlider       = document.getElementById('temp-slider');
    const tempValue        = document.getElementById('temp-value');
    const voiceBtn         = document.getElementById('voice-btn');
    const personaGrid      = document.getElementById('persona-grid');

    /* ── State ─────────────────────────────────────── */
    let sessionId       = sessionStorage.getItem('chat_session_id') || null;
    let isWaiting       = false;
    let currentModel    = localStorage.getItem('nova-model')       || 'gemini-2.5-flash';
    let currentPersona  = localStorage.getItem('nova-persona')     || 'assistant';
    let currentTemp     = parseFloat(localStorage.getItem('nova-temperature') || '0.7');
    let renameTargetId  = null;
    let searchActive    = false;
    let isRecording     = false;
    let recognition     = null;

    /* ── Init ──────────────────────────────────────── */
    sendBtn.disabled = true;
    applyModelUI(currentModel);
    applyPersonaUI(currentPersona);
    tempSlider.value = currentTemp;
    tempValue.textContent = currentTemp.toFixed(1);

    if (sessionId) loadSessionHistory(sessionId);
    loadSessions();
    initVoice();

    /* ═══════════════════════════════════════════════
       TOAST
    ════════════════════════════════════════════════ */
    function showToast(msg, ms = 2500) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), ms);
    }

    /* ═══════════════════════════════════════════════
       THEME
    ════════════════════════════════════════════════ */
    const savedTheme = localStorage.getItem('nova-theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.querySelector('i').className = 'fa-regular fa-sun';
    }
    themeToggle.addEventListener('click', () => {
        const light = document.body.classList.toggle('light-theme');
        themeToggle.querySelector('i').className = light ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
        localStorage.setItem('nova-theme', light ? 'light' : 'dark');
        showToast(light ? '☀️  Light mode' : '🌙  Dark mode');
    });

    /* ═══════════════════════════════════════════════
       SIDEBAR TOGGLE
    ════════════════════════════════════════════════ */
    sidebarToggle.addEventListener('click', () => {
        if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-open');
        else                          sidebar.classList.toggle('collapsed');
    });
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            sidebar.classList.contains('mobile-open') &&
            !sidebar.contains(e.target) &&
            e.target !== sidebarToggle) {
            sidebar.classList.remove('mobile-open');
        }
    });

    /* ═══════════════════════════════════════════════
       MODEL PICKER
    ════════════════════════════════════════════════ */
    modelBadge.addEventListener('click', (e) => {
        e.stopPropagation();
        modelDropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => modelDropdown.classList.remove('open'));

    document.querySelectorAll('.model-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            currentModel = opt.dataset.model;
            localStorage.setItem('nova-model', currentModel);
            applyModelUI(currentModel);
            modelDropdown.classList.remove('open');
            showToast(`⚡ Switched to ${currentModel}`);
        });
    });

    function applyModelUI(model) {
        currentModelEl.textContent = model;
        document.querySelectorAll('.model-option').forEach(o => {
            o.classList.toggle('active', o.dataset.model === model);
        });
    }

    /* ═══════════════════════════════════════════════
       PERSONA SELECTOR
    ════════════════════════════════════════════════ */
    personaGrid.querySelectorAll('.persona-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            currentPersona = chip.dataset.persona;
            localStorage.setItem('nova-persona', currentPersona);
            applyPersonaUI(currentPersona);
            showToast(`🎭 Persona: ${chip.querySelector('span').textContent}`);
        });
    });

    function applyPersonaUI(persona) {
        personaGrid.querySelectorAll('.persona-chip').forEach(c => {
            c.classList.toggle('active', c.dataset.persona === persona);
        });
    }

    /* ═══════════════════════════════════════════════
       TEMPERATURE SLIDER
    ════════════════════════════════════════════════ */
    tempSlider.addEventListener('input', () => {
        currentTemp = parseFloat(tempSlider.value);
        tempValue.textContent = currentTemp.toFixed(1);
        localStorage.setItem('nova-temperature', currentTemp);
    });

    /* ═══════════════════════════════════════════════
       VOICE INPUT (Web Speech API)
    ════════════════════════════════════════════════ */
    function initVoice() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            voiceBtn.title = 'Voice input not supported in this browser';
            voiceBtn.style.opacity = '0.4';
            voiceBtn.style.cursor = 'not-allowed';
            return;
        }

        recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';   // Default Indonesian; auto-detects
        recognition.continuous = false;
        recognition.interimResults = true;

        let interimTranscript = '';

        recognition.onstart = () => {
            isRecording = true;
            voiceBtn.classList.add('recording');
            voiceBtn.title = 'Listening… click to stop';
            showToast('🎙️ Listening…');
        };

        recognition.onresult = (event) => {
            let final = '';
            interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) final += event.results[i][0].transcript;
                else interimTranscript += event.results[i][0].transcript;
            }
            if (final) {
                messageInput.value = (messageInput.value + ' ' + final).trim();
                messageInput.dispatchEvent(new Event('input'));
            }
        };

        recognition.onerror = (e) => {
            console.error('Voice error:', e.error);
            showToast('❌ Voice error: ' + e.error);
            stopRecording();
        };

        recognition.onend = () => stopRecording();

        voiceBtn.addEventListener('click', () => {
            if (isRecording) recognition.stop();
            else              recognition.start();
        });
    }

    function stopRecording() {
        isRecording = false;
        voiceBtn.classList.remove('recording');
        voiceBtn.title = 'Voice input';
    }

    /* ═══════════════════════════════════════════════
       TEXTAREA
    ════════════════════════════════════════════════ */
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
        const len = messageInput.value.length;
        charCount.textContent = len;
        charCount.className = 'char-count' + (len > 3800 ? ' danger' : len > 3000 ? ' warning' : '');
        sendBtn.disabled = messageInput.value.trim() === '' || isWaiting;
    });
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    sendBtn.addEventListener('click', sendMessage);

    /* ═══════════════════════════════════════════════
       NEW CHAT
    ════════════════════════════════════════════════ */
    newChatBtn.addEventListener('click', startNewChat);

    function startNewChat() {
        sessionStorage.removeItem('chat_session_id');
        sessionId = null;
        chatWindow.innerHTML = '';
        chatWindow.appendChild(welcomeScreen);
        welcomeScreen.style.display = 'flex';
        messageInput.value = '';
        messageInput.style.height = 'auto';
        charCount.textContent = '0';
        sendBtn.disabled = true;
        scrollDownBtn.style.display = 'none';
        loadSessions();
        if (window.innerWidth <= 768) sidebar.classList.remove('mobile-open');
    }

    /* ═══════════════════════════════════════════════
       SCROLL
    ════════════════════════════════════════════════ */
    chatWindow.addEventListener('scroll', () => {
        const near = chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight < 120;
        scrollDownBtn.style.display = near ? 'none' : 'flex';
    });
    scrollDownBtn.addEventListener('click', scrollToBottom);

    /* ═══════════════════════════════════════════════
       SEARCH
    ════════════════════════════════════════════════ */
    searchBtn.addEventListener('click', () => {
        searchActive = !searchActive;
        searchBar.style.display = searchActive ? 'flex' : 'none';
        if (searchActive) searchInput.focus();
        else              clearHighlights();
    });
    searchClose.addEventListener('click', () => {
        searchActive = false;
        searchBar.style.display = 'none';
        clearHighlights();
        searchInput.value = '';
    });
    searchInput.addEventListener('input', () => {
        clearHighlights();
        const q = searchInput.value.trim().toLowerCase();
        if (!q) return;
        chatWindow.querySelectorAll('.message-bubble').forEach(b => highlightText(b, q));
    });

    function highlightText(root, q) {
        const iter = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const hits = [];
        let n;
        while ((n = iter.nextNode())) hits.push(n);
        hits.forEach(node => {
            const idx = node.textContent.toLowerCase().indexOf(q);
            if (idx < 0) return;
            const mark = document.createElement('mark');
            mark.className = 'highlight';
            const after = node.splitText(idx);
            after.splitText(q.length);
            node.after(mark);
            mark.appendChild(after);
        });
    }
    function clearHighlights() {
        chatWindow.querySelectorAll('mark.highlight').forEach(m => {
            m.replaceWith(document.createTextNode(m.textContent));
        });
        chatWindow.normalize();
    }

    /* ═══════════════════════════════════════════════
       EXPORT
    ════════════════════════════════════════════════ */
    exportBtn.addEventListener('click', () => {
        const msgs = chatWindow.querySelectorAll('.message-container');
        if (!msgs.length) { showToast('💬 No chat to export.'); return; }
        let out = `Nova AI – Chat Export\n${'='.repeat(40)}\n\n`;
        msgs.forEach(c => {
            const who  = c.classList.contains('user') ? 'You' : 'Nova';
            const text = (c.querySelector('.message-bubble')?.innerText || '').trim();
            out += `${who}:\n${text}\n\n`;
        });
        const a = Object.assign(document.createElement('a'), {
            href:     URL.createObjectURL(new Blob([out], { type: 'text/plain' })),
            download: `nova-chat-${new Date().toISOString().slice(0,10)}.txt`,
        });
        a.click();
        showToast('📄 Chat exported!');
    });

    /* ═══════════════════════════════════════════════
       CLEAR ALL
    ════════════════════════════════════════════════ */
    clearAllBtn.addEventListener('click', () => {
        if (!confirm('Delete all chat history? This cannot be undone.')) return;
        fetch('/api/sessions/clear', { method: 'POST' })
            .then(r => { if (!r.ok) throw new Error(); })
            .then(() => { startNewChat(); showToast('🗑️  All chats cleared.'); })
            .catch(() => showToast('❌ Error clearing chats.'));
    });

    /* COPY SESSION */
    copySessionBtn.addEventListener('click', () => {
        const link = window.location.origin + '/?session=' + (sessionId || '');
        navigator.clipboard.writeText(link)
            .then(()  => showToast('🔗 Session link copied!'))
            .catch(()  => showToast('❌ Could not copy link.'));
    });

    /* ATTACH (placeholder) */
    attachBtn.addEventListener('click', () => showToast('📎 File upload coming soon!'));

    /* ═══════════════════════════════════════════════
       PROMPT LIBRARY
    ════════════════════════════════════════════════ */
    browsePromptsBtn.addEventListener('click', () => promptsModal.style.display = 'flex');
    promptsClose.addEventListener('click',     () => promptsModal.style.display = 'none');
    promptsModal.addEventListener('click', (e) => { if (e.target === promptsModal) promptsModal.style.display = 'none'; });
    document.querySelectorAll('.prompt-card').forEach(card => {
        card.addEventListener('click', () => {
            messageInput.value = card.dataset.prompt;
            messageInput.dispatchEvent(new Event('input'));
            promptsModal.style.display = 'none';
            messageInput.focus();
        });
    });

    /* ═══════════════════════════════════════════════
       RENAME MODAL
    ════════════════════════════════════════════════ */
    renameConfirm.addEventListener('click', async () => {
        const title = renameInput.value.trim();
        if (!title || !renameTargetId) return;
        try {
            const r = await fetch(`/api/sessions/${renameTargetId}/rename`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title }),
            });
            if (!r.ok) throw new Error();
            renameModal.style.display = 'none';
            loadSessions();
            showToast('✏️  Chat renamed!');
        } catch { showToast('❌ Rename failed.'); }
    });
    renameInput.addEventListener('keydown', e => { if (e.key === 'Enter') renameConfirm.click(); });
    renameCancel.addEventListener('click',  () => renameModal.style.display = 'none');
    renameModal.addEventListener('click',   (e) => { if (e.target === renameModal) renameModal.style.display = 'none'; });

    /* ═══════════════════════════════════════════════
       LOAD SESSION LIST
    ════════════════════════════════════════════════ */
    async function loadSessions() {
        try {
            const r    = await fetch('/api/sessions');
            const data = await r.json();
            chatHistoryList.innerHTML = '';

            if (!data.sessions?.length) {
                chatHistoryList.innerHTML = '<div style="color:var(--text-muted);font-size:.8rem;padding:8px 6px;">No chats yet.</div>';
                return;
            }

            data.sessions.forEach(s => {
                const div = document.createElement('div');
                div.className = `history-item ${s.id === sessionId ? 'active' : ''}`;
                div.innerHTML = `
                    <i class="fa-regular fa-message"></i>
                    <span></span>
                    <div class="history-actions">
                        <button class="history-action-btn rename" title="Rename"><i class="fa-solid fa-pencil"></i></button>
                        <button class="history-action-btn delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
                div.querySelector('span').textContent = s.title;
                div.querySelector('span').title       = s.title;

                div.addEventListener('click', async (e) => {
                    if (e.target.closest('.history-actions')) return;
                    sessionId = s.id;
                    sessionStorage.setItem('chat_session_id', s.id);
                    document.querySelectorAll('.history-item').forEach(h => h.classList.remove('active'));
                    div.classList.add('active');
                    await loadSessionHistory(s.id);
                    if (window.innerWidth <= 768) sidebar.classList.remove('mobile-open');
                });

                div.querySelector('.rename').addEventListener('click', (e) => {
                    e.stopPropagation();
                    renameTargetId    = s.id;
                    renameInput.value = s.title;
                    renameModal.style.display = 'flex';
                    setTimeout(() => renameInput.focus(), 50);
                });

                div.querySelector('.delete').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm(`Delete "${s.title}"?`)) return;
                    try {
                        const r = await fetch(`/api/sessions/${s.id}`, { method: 'DELETE' });
                        if (!r.ok) throw new Error();
                        showToast('🗑️  Chat deleted.');
                        if (s.id === sessionId) startNewChat();
                        else                    loadSessions();
                    } catch { showToast('❌ Delete failed.'); }
                });

                chatHistoryList.appendChild(div);
            });
        } catch (err) { console.error('loadSessions error:', err); }
    }

    /* ═══════════════════════════════════════════════
       LOAD SESSION HISTORY
    ════════════════════════════════════════════════ */
    async function loadSessionHistory(id) {
        try {
            const r = await fetch(`/api/sessions/${id}`);
            if (!r.ok) { startNewChat(); return; }
            const data = await r.json();
            if (welcomeScreen.parentNode) welcomeScreen.remove();
            chatWindow.innerHTML = '';
            data.history.forEach(m => appendMessage(m.sender, m.text, m.time));
            if (data.model)    applyModelUI(data.model);
            if (data.persona)  applyPersonaUI(data.persona);
            if (data.temperature != null) {
                currentTemp = data.temperature;
                tempSlider.value = currentTemp;
                tempValue.textContent = parseFloat(currentTemp).toFixed(1);
            }
            scrollToBottom();
        } catch (err) { console.error('loadSessionHistory error:', err); }
    }

    /* ═══════════════════════════════════════════════
       SEND MESSAGE  (with SSE Streaming)
    ════════════════════════════════════════════════ */
    async function sendMessage() {
        const message = messageInput.value.trim();
        if (!message || isWaiting) return;

        if (welcomeScreen.parentNode === chatWindow) welcomeScreen.remove();

        appendMessage('user', message);
        messageInput.value = '';
        messageInput.style.height = 'auto';
        charCount.textContent = '0';
        sendBtn.disabled = true;
        isWaiting = true;
        scrollToBottom();

        // Create AI bubble for streaming
        const aiBubble = createStreamingBubble();
        scrollToBottom();

        const payload = {
            message,
            session_id:  sessionId,
            model:       currentModel,
            persona:     currentPersona,
            temperature: currentTemp,
        };

        try {
            const resp = await fetch('/chat/stream', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify(payload),
            });

            if (!resp.ok || !resp.body) {
                throw new Error('Stream failed: ' + resp.status);
            }

            const reader  = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer    = '';
            let fullText  = '';
            let cursor    = aiBubble.querySelector('.stream-cursor');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const evt = JSON.parse(line.slice(6));
                        if (evt.type === 'session') {
                            sessionId = evt.session_id;
                            sessionStorage.setItem('chat_session_id', sessionId);
                        } else if (evt.type === 'chunk') {
                            fullText += evt.text;
                            // Render markdown incrementally
                            const rendered = typeof marked !== 'undefined'
                                ? marked.parse(fullText)
                                : fullText.replace(/\n/g, '<br>');
                            aiBubble.innerHTML = rendered;
                            // Re-add cursor
                            const cur = document.createElement('span');
                            cur.className = 'stream-cursor';
                            aiBubble.appendChild(cur);
                            scrollToBottom();
                        } else if (evt.type === 'done') {
                            // Final render without cursor
                            if (typeof marked !== 'undefined') {
                                aiBubble.innerHTML = marked.parse(fullText);
                            }
                            aiBubble.querySelectorAll('pre').forEach(addCopyCodeBtn);
                            loadSessions();
                            scrollToBottom();
                        } else if (evt.type === 'error') {
                            aiBubble.textContent = '❌ Error: ' + evt.message;
                        }
                    } catch (parseErr) { /* ignore malformed SSE line */ }
                }
            }

            // Finalize message container with meta buttons
            finalizeStreamedMessage(aiBubble.closest('.message-container'), fullText);

        } catch (err) {
            console.error('Stream error:', err);
            aiBubble.textContent = '❌ Error: Cannot reach server.';
        } finally {
            isWaiting = false;
            sendBtn.disabled = messageInput.value.trim() === '';
            messageInput.focus();
        }
    }

    /* ── Create a streaming AI bubble (before text arrives) ─ */
    function createStreamingBubble() {
        const container = document.createElement('div');
        container.className = 'message-container ai';

        const row = document.createElement('div');
        row.className = 'message-row';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fa-solid fa-bolt"></i>';

        const content = document.createElement('div');
        content.className = 'message-content';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        const cursor = document.createElement('span');
        cursor.className = 'stream-cursor';
        bubble.appendChild(cursor);

        content.appendChild(bubble);
        row.appendChild(avatar);
        row.appendChild(content);
        container.appendChild(row);
        chatWindow.appendChild(container);

        return bubble;
    }

    /* ── Add meta buttons after streaming completes ────────── */
    function finalizeStreamedMessage(container, text) {
        const content = container.querySelector('.message-content');
        // Remove old meta if present
        content.querySelector('.message-meta')?.remove();

        const meta = document.createElement('div');
        meta.className = 'message-meta';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const timeSpan = document.createElement('span');
        timeSpan.className = 'meta-time';
        timeSpan.textContent = time;
        meta.appendChild(timeSpan);

        const copyBtn = makeMetaBtn('<i class="fa-regular fa-copy"></i> Copy', () => {
            const bubble = container.querySelector('.message-bubble');
            navigator.clipboard.writeText(bubble.innerText)
                .then(()  => showToast('✅ Copied!'))
                .catch(()  => showToast('❌ Copy failed.'));
        });
        meta.appendChild(copyBtn);

        const retryBtn = makeMetaBtn('<i class="fa-solid fa-rotate-right"></i> Retry', () => retryMessage(container));
        meta.appendChild(retryBtn);

        content.appendChild(meta);
    }

    /* ═══════════════════════════════════════════════
       APPEND MESSAGE (for history load)
    ════════════════════════════════════════════════ */
    function appendMessage(sender, text, timeStr) {
        const time = timeStr || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const container = document.createElement('div');
        container.className = `message-container ${sender}`;

        const row = document.createElement('div');
        row.className = 'message-row';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user'
            ? '<i class="fa-solid fa-user"></i>'
            : '<i class="fa-solid fa-bolt"></i>';

        const content = document.createElement('div');
        content.className = 'message-content';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        if (sender === 'ai' && typeof marked !== 'undefined') {
            bubble.innerHTML = marked.parse(text);
            bubble.querySelectorAll('pre').forEach(addCopyCodeBtn);
        } else {
            bubble.innerText = text;
        }
        content.appendChild(bubble);

        const meta = document.createElement('div');
        meta.className = 'message-meta';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'meta-time';
        timeSpan.textContent = time;
        meta.appendChild(timeSpan);

        const copyBtn = makeMetaBtn('<i class="fa-regular fa-copy"></i> Copy', () => {
            navigator.clipboard.writeText(bubble.innerText)
                .then(()  => showToast('✅ Copied!'))
                .catch(()  => showToast('❌ Copy failed.'));
        });
        meta.appendChild(copyBtn);

        if (sender === 'ai') {
            const retryBtn = makeMetaBtn('<i class="fa-solid fa-rotate-right"></i> Retry',
                () => retryMessage(container));
            meta.appendChild(retryBtn);
        }

        content.appendChild(meta);
        row.appendChild(avatar);
        row.appendChild(content);
        container.appendChild(row);
        chatWindow.appendChild(container);
        return container;
    }

    /* ═══════════════════════════════════════════════
       RETRY
    ════════════════════════════════════════════════ */
    async function retryMessage(aiContainer) {
        const siblings = [...chatWindow.querySelectorAll('.message-container')];
        const idx = siblings.indexOf(aiContainer);
        let userText = null;
        for (let i = idx - 1; i >= 0; i--) {
            if (siblings[i].classList.contains('user')) {
                userText = siblings[i].querySelector('.message-bubble')?.innerText || null;
                break;
            }
        }
        if (!userText) { showToast('⚠️ No user message to retry.'); return; }

        aiContainer.remove();
        isWaiting = true;
        sendBtn.disabled = true;

        const aiBubble = createStreamingBubble();
        scrollToBottom();

        try {
            const resp = await fetch('/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, session_id: sessionId, model: currentModel, persona: currentPersona, temperature: currentTemp }),
            });
            const reader  = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '', fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const evt = JSON.parse(line.slice(6));
                        if (evt.type === 'chunk') {
                            fullText += evt.text;
                            aiBubble.innerHTML = (typeof marked !== 'undefined') ? marked.parse(fullText) : fullText;
                            const cur = document.createElement('span');
                            cur.className = 'stream-cursor';
                            aiBubble.appendChild(cur);
                            scrollToBottom();
                        } else if (evt.type === 'done') {
                            if (typeof marked !== 'undefined') aiBubble.innerHTML = marked.parse(fullText);
                            aiBubble.querySelectorAll('pre').forEach(addCopyCodeBtn);
                            finalizeStreamedMessage(aiBubble.closest('.message-container'), fullText);
                        }
                    } catch {}
                }
            }
        } catch (err) {
            aiBubble.textContent = '❌ Error: ' + err.message;
        } finally {
            isWaiting = false;
            sendBtn.disabled = messageInput.value.trim() === '';
            scrollToBottom();
        }
    }

    /* ═══════════════════════════════════════════════
       HELPERS
    ════════════════════════════════════════════════ */
    function makeMetaBtn(html, onClick) {
        const btn = document.createElement('button');
        btn.className = 'meta-btn';
        btn.innerHTML = html;
        btn.addEventListener('click', onClick);
        return btn;
    }

    function addCopyCodeBtn(pre) {
        const wrap = document.createElement('div');
        wrap.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(pre);
        const btn = document.createElement('button');
        btn.className = 'copy-code-btn';
        btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
        btn.addEventListener('click', () => {
            const code = (pre.querySelector('code') || pre).innerText;
            navigator.clipboard.writeText(code).then(() => {
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                setTimeout(() => btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy', 2000);
            });
        });
        wrap.appendChild(btn);
    }

    function scrollToBottom() {
        chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
    }

    /* ═══════════════════════════════════════════════
       ⭐ FAVORITES SYSTEM
    ════════════════════════════════════════════════ */
    const FAV_KEY = 'nova-favorites';
    const favModal     = document.getElementById('favorites-modal');
    const favList      = document.getElementById('favorites-list');
    const favClose     = document.getElementById('favorites-close');
    const favBtn       = document.getElementById('favorites-btn');
    const favCountEl   = document.getElementById('fav-count');

    function getFavorites() {
        try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }
        catch { return []; }
    }
    function saveFavorites(favs) {
        localStorage.setItem(FAV_KEY, JSON.stringify(favs));
        updateFavBadge();
    }
    function updateFavBadge() {
        const count = getFavorites().length;
        if (count > 0) {
            favCountEl.textContent = count;
            favCountEl.style.display = 'inline-flex';
        } else {
            favCountEl.style.display = 'none';
        }
    }

    /* Open / close favorites modal */
    favBtn.addEventListener('click', () => {
        renderFavoritesModal();
        favModal.style.display = 'flex';
    });
    favClose.addEventListener('click', () => favModal.style.display = 'none');
    favModal.addEventListener('click', (e) => { if (e.target === favModal) favModal.style.display = 'none'; });

    /* Render modal contents */
    function renderFavoritesModal() {
        const favs = getFavorites();
        favList.innerHTML = '';

        if (!favs.length) {
            favList.innerHTML = `
                <div class="favorites-empty">
                    <i class="fa-regular fa-star"></i>
                    <p>No favorites yet.</p>
                    <span>Click the ⭐ star on any message to save it here.</span>
                </div>`;
            return;
        }

        favs.forEach((fav, idx) => {
            const item = document.createElement('div');
            item.className = 'fav-item';
            item.innerHTML = `
                <div class="fav-item-header">
                    <span class="fav-item-sender ${fav.sender}">${fav.sender === 'user' ? '👤 You' : '⚡ Nova'}</span>
                    <span class="fav-item-time">${fav.savedAt}</span>
                </div>
                <div class="fav-item-text"></div>
                <div class="fav-item-actions">
                    <button class="fav-action-btn copy-fav"><i class="fa-regular fa-copy"></i> Copy</button>
                    <button class="fav-action-btn remove"><i class="fa-solid fa-star-half-stroke"></i> Remove</button>
                </div>
            `;
            item.querySelector('.fav-item-text').textContent = fav.text;

            // Copy
            item.querySelector('.copy-fav').addEventListener('click', () => {
                navigator.clipboard.writeText(fav.text)
                    .then(() => showToast('✅ Copied!'))
                    .catch(() => showToast('❌ Copy failed.'));
            });

            // Remove
            item.querySelector('.remove').addEventListener('click', () => {
                const updated = getFavorites().filter((_, i) => i !== idx);
                saveFavorites(updated);
                renderFavoritesModal();
                showToast('🗑️ Removed from favorites.');
            });

            favList.appendChild(item);
        });
    }

    /* Add a star ⭐ button to message meta */
    function makeFavBtn(text, sender) {
        const favs = getFavorites();
        const alreadySaved = favs.some(f => f.text === text);

        const btn = document.createElement('button');
        btn.className = 'meta-btn fav-btn' + (alreadySaved ? ' active' : '');
        btn.title = alreadySaved ? 'Remove from favorites' : 'Add to favorites';
        btn.innerHTML = alreadySaved
            ? '<i class="fa-solid fa-star"></i> Saved'
            : '<i class="fa-regular fa-star"></i> Save';

        btn.addEventListener('click', () => {
            const current = getFavorites();
            const existIdx = current.findIndex(f => f.text === text);

            if (existIdx >= 0) {
                // Remove
                current.splice(existIdx, 1);
                saveFavorites(current);
                btn.className = 'meta-btn fav-btn';
                btn.title     = 'Add to favorites';
                btn.innerHTML = '<i class="fa-regular fa-star"></i> Save';
                showToast('💔 Removed from favorites.');
            } else {
                // Add
                current.unshift({
                    id:      Date.now(),
                    text,
                    sender,
                    savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                });
                saveFavorites(current);
                btn.className = 'meta-btn fav-btn active';
                btn.title     = 'Remove from favorites';
                btn.innerHTML = '<i class="fa-solid fa-star"></i> Saved';
                showToast('⭐ Added to favorites!');
            }
        });

        return btn;
    }

    /* Patch makeMetaBtn callers to include star button.
       Override finalizeStreamedMessage & appendMessage to inject fav btn. */
    const _origFinalize = finalizeStreamedMessage;
    // We'll just call makeFavBtn directly inside the existing functions below.
    // Init badge on load
    updateFavBadge();

    /* Expose makeFavBtn so appendMessage / finalizeStreamedMessage can use it */
    window._makeFavBtn = makeFavBtn;

    /* ── Patch appendMessage to include fav button ─────────── */
    // We override the meta creation — done inline in the patched version below.
    // (The function is already defined above; we patch via the meta-building
    //  section using a second pass on newly created containers.)

    // Observe new message-containers added to chatWindow and inject fav btn
    const metaObserver = new MutationObserver((mutations) => {
        mutations.forEach(m => {
            m.addedNodes.forEach(node => {
                if (!(node instanceof HTMLElement)) return;
                const containers = node.classList?.contains('message-container')
                    ? [node]
                    : [...node.querySelectorAll('.message-container')];

                containers.forEach(container => {
                    const meta = container.querySelector('.message-meta');
                    if (!meta || meta.querySelector('.fav-btn')) return; // already has star

                    const bubble = container.querySelector('.message-bubble');
                    const text   = bubble?.innerText || '';
                    const sender = container.classList.contains('user') ? 'user' : 'ai';
                    meta.appendChild(makeFavBtn(text, sender));
                });
            });
        });
    });
    metaObserver.observe(chatWindow, { childList: true, subtree: true });

    /* Global for inline onclick */
    window.submitSuggested = (txt) => {
        messageInput.value = txt;
        messageInput.dispatchEvent(new Event('input'));
        sendMessage();
    };
});
