/* =====================================================
   Nova AI – Full Feature JavaScript
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* ── DOM Refs ──────────────────────────────────── */
    const messageInput    = document.getElementById('message-input');
    const sendBtn         = document.getElementById('send-btn');
    const chatWindow      = document.getElementById('chat-window');
    const welcomeScreen   = document.getElementById('welcome-screen');
    const themeToggle     = document.getElementById('theme-toggle');
    const chatHistoryList = document.getElementById('chat-history');
    const newChatBtn      = document.getElementById('new-chat');
    const sidebarToggle   = document.getElementById('sidebar-toggle');
    const sidebar         = document.getElementById('sidebar');
    const exportBtn       = document.getElementById('export-btn');
    const clearAllBtn     = document.getElementById('clear-all-btn');
    const charCount       = document.getElementById('char-count');
    const scrollDownBtn   = document.getElementById('scroll-to-bottom');
    const searchBtn       = document.getElementById('search-btn');
    const searchBar       = document.getElementById('search-bar');
    const searchInput     = document.getElementById('search-input');
    const searchClose     = document.getElementById('search-close');
    const modelBadge      = document.querySelector('.model-badge');
    const modelDropdown   = document.getElementById('model-dropdown');
    const currentModelEl  = document.getElementById('current-model');
    const attachBtn       = document.getElementById('attach-btn');
    const browsePrompts   = document.getElementById('browse-prompts-btn');
    const promptsModal    = document.getElementById('prompts-modal');
    const promptsClose    = document.getElementById('prompts-close');
    const renameModal     = document.getElementById('rename-modal');
    const renameInput     = document.getElementById('rename-input');
    const renameConfirm   = document.getElementById('rename-confirm');
    const renameCancel    = document.getElementById('rename-cancel');
    const copySessionBtn  = document.getElementById('copy-session-btn');
    const tempSlider      = document.getElementById('temp-slider');
    const tempValueEl     = document.getElementById('temp-value');
    const voiceBtn        = document.getElementById('voice-btn');
    const personaGrid     = document.getElementById('persona-grid');
    const favoritesBtn    = document.getElementById('favorites-btn');
    const favoritesModal  = document.getElementById('favorites-modal');
    const favoritesClose  = document.getElementById('favorites-close');
    const favoritesList   = document.getElementById('favorites-list');
    const favCountEl      = document.getElementById('fav-count');

    /* ── State ─────────────────────────────────────── */
    let sessionId      = sessionStorage.getItem('chat_session_id') || null;
    let isWaiting      = false;
    let currentModel   = localStorage.getItem('nova-model')       || 'gemini-2.5-flash';
    let currentPersona = localStorage.getItem('nova-persona')     || 'assistant';
    let currentTemp    = parseFloat(localStorage.getItem('nova-temp') || '0.7');
    let renameTarget   = null;
    let isRecording    = false;
    let recognition    = null;

    const FAV_KEY = 'nova-favorites';

    /* ── Init ──────────────────────────────────────── */
    sendBtn.disabled = true;
    applyModelUI(currentModel);
    applyPersonaUI(currentPersona);
    tempSlider.value   = currentTemp;
    tempValueEl.textContent = currentTemp.toFixed(1);
    updateFavBadge();
    initVoice();

    if (sessionId) loadSessionHistory(sessionId);
    loadSessions();

    /* ═══════════════════════════════════════════
       TOAST
    ════════════════════════════════════════════ */
    function showToast(msg, ms = 2500) {
        const t = document.getElementById('toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), ms);
    }

    /* ═══════════════════════════════════════════
       THEME
    ════════════════════════════════════════════ */
    const saved = localStorage.getItem('nova-theme') || 'dark';
    if (saved === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.querySelector('i').className = 'fa-regular fa-sun';
    }
    themeToggle.addEventListener('click', () => {
        const light = document.body.classList.toggle('light-theme');
        themeToggle.querySelector('i').className = light ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
        localStorage.setItem('nova-theme', light ? 'light' : 'dark');
        showToast(light ? '☀️ Light mode' : '🌙 Dark mode');
    });

    /* ═══════════════════════════════════════════
       SIDEBAR TOGGLE
    ════════════════════════════════════════════ */
    sidebarToggle.addEventListener('click', () => {
        if (window.innerWidth <= 768) sidebar.classList.toggle('mobile-open');
        else                          sidebar.classList.toggle('collapsed');
    });
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 &&
            sidebar.classList.contains('mobile-open') &&
            !sidebar.contains(e.target) &&
            e.target !== sidebarToggle) sidebar.classList.remove('mobile-open');
    });

    /* ═══════════════════════════════════════════
       MODEL PICKER
    ════════════════════════════════════════════ */
    modelBadge.addEventListener('click', (e) => { e.stopPropagation(); modelDropdown.classList.toggle('open'); });
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

    function applyModelUI(m) {
        currentModelEl.textContent = m;
        document.querySelectorAll('.model-option').forEach(o => o.classList.toggle('active', o.dataset.model === m));
    }

    /* ═══════════════════════════════════════════
       PERSONA SELECTOR
    ════════════════════════════════════════════ */
    personaGrid.querySelectorAll('.persona-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            currentPersona = chip.dataset.persona;
            localStorage.setItem('nova-persona', currentPersona);
            applyPersonaUI(currentPersona);
            showToast(`🎭 Persona: ${chip.querySelector('span').textContent}`);
        });
    });

    function applyPersonaUI(p) {
        personaGrid.querySelectorAll('.persona-chip').forEach(c => c.classList.toggle('active', c.dataset.persona === p));
    }

    /* ═══════════════════════════════════════════
       TEMPERATURE SLIDER
    ════════════════════════════════════════════ */
    tempSlider.addEventListener('input', () => {
        currentTemp = parseFloat(tempSlider.value);
        tempValueEl.textContent = currentTemp.toFixed(1);
        localStorage.setItem('nova-temp', currentTemp);
    });

    /* ═══════════════════════════════════════════
       VOICE INPUT
    ════════════════════════════════════════════ */
    function initVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            voiceBtn.title  = 'Voice input not supported in this browser';
            voiceBtn.style.opacity = '0.4';
            voiceBtn.style.cursor  = 'not-allowed';
            return;
        }
        recognition              = new SR();
        recognition.lang         = 'id-ID';
        recognition.continuous   = false;
        recognition.interimResults = true;

        recognition.onstart = () => {
            isRecording = true;
            voiceBtn.classList.add('recording');
            voiceBtn.title = 'Listening… click to stop';
            showToast('🎙️ Listening…');
        };
        recognition.onresult = (e) => {
            let final = '';
            for (let i = e.resultIndex; i < e.results.length; i++)
                if (e.results[i].isFinal) final += e.results[i][0].transcript;
            if (final) {
                messageInput.value = (messageInput.value + ' ' + final).trim();
                messageInput.dispatchEvent(new Event('input'));
            }
        };
        recognition.onerror = (e) => { showToast('❌ Voice error: ' + e.error); stopRecording(); };
        recognition.onend   = stopRecording;

        voiceBtn.addEventListener('click', () => { if (isRecording) recognition.stop(); else recognition.start(); });
    }
    function stopRecording() {
        isRecording = false; voiceBtn.classList.remove('recording'); voiceBtn.title = 'Voice input';
    }

    /* ═══════════════════════════════════════════
       TEXTAREA
    ════════════════════════════════════════════ */
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + 'px';
        const len = messageInput.value.length;
        charCount.textContent = len;
        charCount.className   = 'char-count' + (len > 3800 ? ' danger' : len > 3000 ? ' warning' : '');
        sendBtn.disabled = !messageInput.value.trim() || isWaiting;
    });
    messageInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    sendBtn.addEventListener('click', sendMessage);

    /* ═══════════════════════════════════════════
       NEW CHAT
    ════════════════════════════════════════════ */
    newChatBtn.addEventListener('click', startNewChat);

    function startNewChat() {
        sessionStorage.removeItem('chat_session_id');
        sessionId = null;
        chatWindow.innerHTML = '';
        chatWindow.appendChild(welcomeScreen);
        welcomeScreen.style.display = 'flex';
        messageInput.value  = '';
        messageInput.style.height = 'auto';
        charCount.textContent = '0';
        sendBtn.disabled = true;
        scrollDownBtn.style.display = 'none';
        loadSessions();
        if (window.innerWidth <= 768) sidebar.classList.remove('mobile-open');
    }

    /* ═══════════════════════════════════════════
       SCROLL
    ════════════════════════════════════════════ */
    chatWindow.addEventListener('scroll', () => {
        const near = chatWindow.scrollHeight - chatWindow.scrollTop - chatWindow.clientHeight < 120;
        scrollDownBtn.style.display = near ? 'none' : 'flex';
    });
    scrollDownBtn.addEventListener('click', scrollToBottom);
    function scrollToBottom() { chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' }); }

    /* ═══════════════════════════════════════════
       SEARCH
    ════════════════════════════════════════════ */
    let searchVisible = false;
    searchBtn.addEventListener('click', () => {
        searchVisible = !searchVisible;
        searchBar.style.display = searchVisible ? 'flex' : 'none';
        if (searchVisible) searchInput.focus(); else clearHighlights();
    });
    searchClose.addEventListener('click', () => {
        searchVisible = false; searchBar.style.display = 'none';
        clearHighlights(); searchInput.value = '';
    });
    searchInput.addEventListener('input', () => {
        clearHighlights();
        const q = searchInput.value.trim().toLowerCase();
        if (q) chatWindow.querySelectorAll('.message-bubble').forEach(b => doHighlight(b, q));
    });

    function doHighlight(root, q) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        let n;
        while ((n = walker.nextNode())) nodes.push(n);
        nodes.forEach(node => {
            const i = node.textContent.toLowerCase().indexOf(q);
            if (i < 0) return;
            const mark = document.createElement('mark');
            mark.className = 'highlight';
            const after = node.splitText(i);
            after.splitText(q.length);
            node.after(mark);
            mark.appendChild(after);
        });
    }
    function clearHighlights() {
        chatWindow.querySelectorAll('mark.highlight').forEach(m => m.replaceWith(m.textContent));
        chatWindow.normalize();
    }

    /* ═══════════════════════════════════════════
       EXPORT
    ════════════════════════════════════════════ */
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
            href: URL.createObjectURL(new Blob([out], { type: 'text/plain' })),
            download: `nova-chat-${new Date().toISOString().slice(0,10)}.txt`,
        });
        a.click();
        showToast('📄 Chat exported!');
    });

    /* ═══════════════════════════════════════════
       CLEAR ALL
    ════════════════════════════════════════════ */
    clearAllBtn.addEventListener('click', () => {
        if (!confirm('Delete all chat history? This cannot be undone.')) return;
        fetch('/api/sessions/clear', { method: 'POST' })
            .then(r => { if (!r.ok) throw new Error(); })
            .then(() => { startNewChat(); showToast('🗑️ All chats cleared.'); })
            .catch(() => showToast('❌ Error clearing chats.'));
    });

    /* ═══════════════════════════════════════════
       COPY SESSION LINK
    ════════════════════════════════════════════ */
    copySessionBtn.addEventListener('click', () => {
        const link = window.location.origin + '/?session=' + (sessionId || '');
        navigator.clipboard.writeText(link)
            .then(()  => showToast('🔗 Session link copied!'))
            .catch(()  => showToast('❌ Copy failed.'));
    });

    /* ATTACH (placeholder) */
    attachBtn.addEventListener('click', () => showToast('📎 File upload coming soon!'));

    /* ═══════════════════════════════════════════
       PROMPT LIBRARY
    ════════════════════════════════════════════ */
    browsePrompts.addEventListener('click', () => promptsModal.style.display = 'flex');
    promptsClose.addEventListener('click',  () => promptsModal.style.display = 'none');
    promptsModal.addEventListener('click', e => { if (e.target === promptsModal) promptsModal.style.display = 'none'; });
    document.querySelectorAll('.prompt-card').forEach(card => {
        card.addEventListener('click', () => {
            messageInput.value = card.dataset.prompt;
            messageInput.dispatchEvent(new Event('input'));
            promptsModal.style.display = 'none';
            messageInput.focus();
        });
    });

    /* ═══════════════════════════════════════════
       RENAME MODAL
    ════════════════════════════════════════════ */
    renameConfirm.addEventListener('click', async () => {
        const title = renameInput.value.trim();
        if (!title || !renameTarget) return;
        try {
            const r = await fetch(`/api/sessions/${renameTarget}/rename`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title }),
            });
            if (!r.ok) throw new Error();
            renameModal.style.display = 'none';
            loadSessions();
            showToast('✏️ Chat renamed!');
        } catch { showToast('❌ Rename failed.'); }
    });
    renameInput.addEventListener('keydown', e => { if (e.key === 'Enter') renameConfirm.click(); });
    renameCancel.addEventListener('click',  () => renameModal.style.display = 'none');
    renameModal.addEventListener('click',   e => { if (e.target === renameModal) renameModal.style.display = 'none'; });

    /* ═══════════════════════════════════════════
       SESSION LIST (SIDEBAR)
    ════════════════════════════════════════════ */
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
                    <span title="${s.title}"></span>
                    <div class="history-actions">
                        <button class="history-action-btn rename" title="Rename"><i class="fa-solid fa-pencil"></i></button>
                        <button class="history-action-btn delete" title="Delete"><i class="fa-solid fa-trash"></i></button>
                    </div>`;
                div.querySelector('span').textContent = s.title;

                div.addEventListener('click', async e => {
                    if (e.target.closest('.history-actions')) return;
                    sessionId = s.id;
                    sessionStorage.setItem('chat_session_id', s.id);
                    document.querySelectorAll('.history-item').forEach(h => h.classList.remove('active'));
                    div.classList.add('active');
                    await loadSessionHistory(s.id);
                    if (window.innerWidth <= 768) sidebar.classList.remove('mobile-open');
                });

                div.querySelector('.rename').addEventListener('click', e => {
                    e.stopPropagation();
                    renameTarget     = s.id;
                    renameInput.value = s.title;
                    renameModal.style.display = 'flex';
                    setTimeout(() => renameInput.focus(), 50);
                });

                div.querySelector('.delete').addEventListener('click', async e => {
                    e.stopPropagation();
                    if (!confirm(`Delete "${s.title}"?`)) return;
                    const r = await fetch(`/api/sessions/${s.id}`, { method: 'DELETE' });
                    if (r.ok) { showToast('🗑️ Chat deleted.'); if (s.id === sessionId) startNewChat(); else loadSessions(); }
                    else showToast('❌ Delete failed.');
                });

                chatHistoryList.appendChild(div);
            });
        } catch (e) { console.error('loadSessions:', e); }
    }

    /* ═══════════════════════════════════════════
       LOAD SESSION HISTORY
    ════════════════════════════════════════════ */
    async function loadSessionHistory(id) {
        try {
            const r = await fetch(`/api/sessions/${id}`);
            if (!r.ok) { startNewChat(); return; }
            const data = await r.json();
            if (welcomeScreen.parentNode) welcomeScreen.remove();
            chatWindow.innerHTML = '';
            data.history.forEach(m => appendMessage(m.sender, m.text, m.time));
            if (data.model)       applyModelUI(data.model);
            if (data.persona)     applyPersonaUI(data.persona);
            if (data.temperature != null) {
                currentTemp = data.temperature;
                tempSlider.value = currentTemp;
                tempValueEl.textContent = parseFloat(currentTemp).toFixed(1);
            }
            scrollToBottom();
        } catch (e) { console.error('loadSessionHistory:', e); }
    }

    /* ═══════════════════════════════════════════
       FAVORITES
    ════════════════════════════════════════════ */
    function getFavs()      { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; } }
    function saveFavs(f)    { localStorage.setItem(FAV_KEY, JSON.stringify(f)); updateFavBadge(); }
    function updateFavBadge() {
        const n = getFavs().length;
        favCountEl.textContent    = n;
        favCountEl.style.display  = n > 0 ? 'inline-flex' : 'none';
    }
    function isFaved(text)  { return getFavs().some(f => f.text === text); }

    favoritesBtn.addEventListener('click',   () => { renderFavModal(); favoritesModal.style.display = 'flex'; });
    favoritesClose.addEventListener('click', () => favoritesModal.style.display = 'none');
    favoritesModal.addEventListener('click', e => { if (e.target === favoritesModal) favoritesModal.style.display = 'none'; });

    function renderFavModal() {
        const favs = getFavs();
        favoritesList.innerHTML = '';
        if (!favs.length) {
            favoritesList.innerHTML = `<div class="favorites-empty">
                <i class="fa-regular fa-star"></i>
                <p>No favorites yet.</p>
                <span>Hover any message and click ⭐ Save to add it here.</span>
            </div>`;
            return;
        }
        favs.forEach((fav, idx) => {
            const item = document.createElement('div');
            item.className = 'fav-item';
            item.innerHTML = `
                <div class="fav-item-header">
                    <span class="fav-item-sender ${fav.sender}">${fav.sender === 'user' ? '👤 You' : '⚡ Nova'}</span>
                    <span class="fav-item-time">${fav.savedAt || ''}</span>
                </div>
                <div class="fav-item-text"></div>
                <div class="fav-item-actions">
                    <button class="fav-action-btn copy-fav"><i class="fa-regular fa-copy"></i> Copy</button>
                    <button class="fav-action-btn remove"><i class="fa-solid fa-star-half-stroke"></i> Remove</button>
                </div>`;
            item.querySelector('.fav-item-text').textContent = fav.text;
            item.querySelector('.copy-fav').addEventListener('click', () => {
                navigator.clipboard.writeText(fav.text).then(() => showToast('✅ Copied!')).catch(() => showToast('❌ Failed.'));
            });
            item.querySelector('.remove').addEventListener('click', () => {
                const updated = getFavs().filter((_, i) => i !== idx);
                saveFavs(updated);
                renderFavModal();
                showToast('💔 Removed from favorites.');
                // Update all star buttons matching this text
                chatWindow.querySelectorAll('.fav-btn[data-text]').forEach(b => {
                    if (b.dataset.text === fav.text) setStarState(b, false);
                });
            });
            favoritesList.appendChild(item);
        });
    }

    function makeFavBtn(text, sender) {
        const btn = document.createElement('button');
        btn.className   = 'meta-btn fav-btn';
        btn.dataset.text = text;
        setStarState(btn, isFaved(text));

        btn.addEventListener('click', () => {
            const current = getFavs();
            const i       = current.findIndex(f => f.text === text);
            if (i >= 0) {
                current.splice(i, 1);
                saveFavs(current);
                setStarState(btn, false);
                showToast('💔 Removed from favorites.');
            } else {
                current.unshift({ id: Date.now(), text, sender,
                    savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
                saveFavs(current);
                setStarState(btn, true);
                showToast('⭐ Added to favorites!');
            }
        });
        return btn;
    }

    function setStarState(btn, active) {
        btn.classList.toggle('active', active);
        btn.title    = active ? 'Remove from favorites' : 'Save to favorites';
        btn.innerHTML = active
            ? '<i class="fa-solid fa-star"></i> Saved'
            : '<i class="fa-regular fa-star"></i> Save';
    }

    /* ═══════════════════════════════════════════
       SEND MESSAGE (Streaming SSE)
    ════════════════════════════════════════════ */
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

        const { container: aiContainer, bubble: aiBubble } = createStreamingBubble();
        scrollToBottom();

        try {
            const resp = await fetch('/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, session_id: sessionId, model: currentModel, persona: currentPersona, temperature: currentTemp }),
            });

            if (!resp.ok || !resp.body) throw new Error('Stream failed');

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
                        if (evt.type === 'session') {
                            sessionId = evt.session_id;
                            sessionStorage.setItem('chat_session_id', sessionId);
                        } else if (evt.type === 'chunk') {
                            fullText += evt.text;
                            aiBubble.innerHTML = typeof marked !== 'undefined'
                                ? marked.parse(fullText)
                                : fullText.replace(/\n/g, '<br>');
                            const cur = document.createElement('span');
                            cur.className = 'stream-cursor';
                            aiBubble.appendChild(cur);
                            scrollToBottom();
                        } else if (evt.type === 'done') {
                            if (typeof marked !== 'undefined') aiBubble.innerHTML = marked.parse(fullText);
                            aiBubble.querySelectorAll('pre').forEach(addCopyCodeBtn);
                            attachMeta(aiContainer, fullText, 'ai');
                            loadSessions();
                            scrollToBottom();
                        } else if (evt.type === 'error') {
                            aiBubble.textContent = '❌ Error: ' + evt.message;
                        }
                    } catch {}
                }
            }
        } catch (err) {
            console.error('Stream error:', err);
            aiBubble.textContent = '❌ Error: Cannot reach server.';
        } finally {
            isWaiting = false;
            sendBtn.disabled = !messageInput.value.trim();
            messageInput.focus();
        }
    }

    /* ═══════════════════════════════════════════
       CREATE STREAMING BUBBLE (placeholder)
    ════════════════════════════════════════════ */
    function createStreamingBubble() {
        const container = document.createElement('div');
        container.className = 'message-container ai';

        const row    = document.createElement('div');  row.className = 'message-row';
        const avatar = document.createElement('div');  avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fa-solid fa-bolt"></i>';

        const content = document.createElement('div'); content.className = 'message-content';
        const bubble  = document.createElement('div'); bubble.className  = 'message-bubble';

        const cursor  = document.createElement('span'); cursor.className = 'stream-cursor';
        bubble.appendChild(cursor);

        content.appendChild(bubble);
        row.appendChild(avatar);
        row.appendChild(content);
        container.appendChild(row);
        chatWindow.appendChild(container);

        return { container, bubble };
    }

    /* ═══════════════════════════════════════════
       APPEND MESSAGE (history / user)
    ════════════════════════════════════════════ */
    function appendMessage(sender, text, timeStr) {
        const time      = timeStr || now();
        const container = document.createElement('div');
        container.className = `message-container ${sender}`;

        const row    = document.createElement('div'); row.className = 'message-row';
        const avatar = document.createElement('div'); avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-bolt"></i>';

        const content = document.createElement('div'); content.className = 'message-content';
        const bubble  = document.createElement('div'); bubble.className  = 'message-bubble';

        if (sender === 'ai' && typeof marked !== 'undefined') {
            bubble.innerHTML = marked.parse(text);
            bubble.querySelectorAll('pre').forEach(addCopyCodeBtn);
        } else {
            bubble.innerText = text;
        }

        content.appendChild(bubble);
        row.appendChild(avatar);
        row.appendChild(content);
        container.appendChild(row);
        chatWindow.appendChild(container);

        attachMeta(container, text, sender, time);
        return container;
    }

    /* ═══════════════════════════════════════════
       ATTACH META BUTTONS (copy, retry, fav)
    ════════════════════════════════════════════ */
    function attachMeta(container, text, sender, timeStr) {
        // Remove old meta if exists
        container.querySelector('.message-meta')?.remove();

        const content  = container.querySelector('.message-content');
        const meta     = document.createElement('div');
        meta.className = 'message-meta';

        // Time
        const timeSpan = document.createElement('span');
        timeSpan.className   = 'meta-time';
        timeSpan.textContent = timeStr || now();
        meta.appendChild(timeSpan);

        // Copy
        meta.appendChild(makeBtn('<i class="fa-regular fa-copy"></i> Copy', () => {
            const bubble = container.querySelector('.message-bubble');
            navigator.clipboard.writeText(bubble.innerText)
                .then(()  => showToast('✅ Copied!'))
                .catch(()  => showToast('❌ Copy failed.'));
        }));

        // Retry (AI only)
        if (sender === 'ai') {
            meta.appendChild(makeBtn('<i class="fa-solid fa-rotate-right"></i> Retry', () => retryFromContainer(container)));
        }

        // Favorite ⭐
        meta.appendChild(makeFavBtn(text, sender));

        content.appendChild(meta);
    }

    function makeBtn(html, onClick) {
        const b = document.createElement('button');
        b.className = 'meta-btn'; b.innerHTML = html;
        b.addEventListener('click', onClick);
        return b;
    }
    function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

    /* ═══════════════════════════════════════════
       RETRY
    ════════════════════════════════════════════ */
    async function retryFromContainer(aiContainer) {
        const all  = [...chatWindow.querySelectorAll('.message-container')];
        const idx  = all.indexOf(aiContainer);
        let userText = null;
        for (let i = idx - 1; i >= 0; i--) {
            if (all[i].classList.contains('user')) { userText = all[i].querySelector('.message-bubble')?.innerText || null; break; }
        }
        if (!userText) { showToast('⚠️ No user message to retry.'); return; }
        aiContainer.remove();

        isWaiting = true; sendBtn.disabled = true;
        const { container: newC, bubble: newB } = createStreamingBubble();
        scrollToBottom();

        try {
            const resp = await fetch('/chat/stream', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userText, session_id: sessionId, model: currentModel, persona: currentPersona, temperature: currentTemp }),
            });
            const reader = resp.body.getReader(); const decoder = new TextDecoder();
            let buffer = '', fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n'); buffer = lines.pop();
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const evt = JSON.parse(line.slice(6));
                        if (evt.type === 'chunk') {
                            fullText += evt.text;
                            newB.innerHTML = typeof marked !== 'undefined' ? marked.parse(fullText) : fullText;
                            const cur = document.createElement('span'); cur.className = 'stream-cursor'; newB.appendChild(cur);
                            scrollToBottom();
                        } else if (evt.type === 'done') {
                            if (typeof marked !== 'undefined') newB.innerHTML = marked.parse(fullText);
                            newB.querySelectorAll('pre').forEach(addCopyCodeBtn);
                            attachMeta(newC, fullText, 'ai');
                            scrollToBottom();
                        }
                    } catch {}
                }
            }
        } catch (e) { newB.textContent = '❌ Error: ' + e.message; }
        finally { isWaiting = false; sendBtn.disabled = !messageInput.value.trim(); }
    }

    /* ═══════════════════════════════════════════
       COPY CODE BUTTON
    ════════════════════════════════════════════ */
    function addCopyCodeBtn(pre) {
        if (pre.closest('.code-block-wrapper')) return;
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

    /* ── Global for welcome screen onclick ── */
    window.submitSuggested = (txt) => {
        messageInput.value = txt;
        messageInput.dispatchEvent(new Event('input'));
        sendMessage();
    };
});
