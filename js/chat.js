/**
 * Creative Studio — Chat Engine
 * Conversational AI panel with streaming, actions, and audit trail
 * Eva Effects Design System aesthetic
 */

// ─── Chat State ───
let chatHistory = [];
let isStreaming = false;
const CHAT_KEY = 'cs_chat_history';

// ─── Init ───
function initChat() {
    loadChatHistory();
    if (chatHistory.length > 0) {
        renderChatHistory();
    }
}

// ─── Persistence ───
function loadChatHistory() {
    try { chatHistory = JSON.parse(localStorage.getItem(CHAT_KEY + '_' + (curId || 'global')) || '[]'); } catch { chatHistory = []; }
}

function saveChatHistory() {
    localStorage.setItem(CHAT_KEY + '_' + (curId || 'global'), JSON.stringify(chatHistory));
}

// ─── Toggle Settings Panel ───
function toggleAiSettings() {
    const panel = document.getElementById('aiSettingsPanel');
    const btn = document.getElementById('aiSettingsToggle');
    panel.classList.toggle('open');
    btn.classList.toggle('active');
}

// ─── Send chat message ───
function sendChat() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg || isStreaming) return;

    // Hide welcome screen
    const welcome = document.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    // Add user message
    addMessage('user', msg);
    input.value = '';
    autoResizeInput(input);

    // Generate AI response
    generateChatResponse(msg);
}

function sendSuggestion(text) {
    document.getElementById('chatInput').value = text;
    sendChat();
}

function handleChatKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
    }
}

function autoResizeInput(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

// ─── Add message to chat ───
function addMessage(role, content, id) {
    const msgId = id || 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const msg = {
        id: msgId,
        role,
        content,
        timestamp: new Date().toISOString(),
        author: role === 'user' ? (S?.username || 'user') : 'assistente',
    };
    chatHistory.push(msg);
    saveChatHistory();
    renderMessage(msg);
    scrollChatToBottom();

    // Audit trail
    if (role === 'user') logAudit('chat_message', { preview: content.slice(0, 80) });

    return msgId;
}

// ─── Render a single message ───
function renderMessage(msg) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-msg ${msg.role}`;
    div.id = msg.id;

    const initial = msg.role === 'user'
        ? (S?.name || S?.username || 'U').charAt(0).toUpperCase()
        : '✦';

    const actionsHtml = msg.role === 'assistant' ? `
        <div class="chat-msg-actions">
            <button onclick="insertMsgToEditor('${msg.id}')">Inserir no editor</button>
            <button onclick="replaceMsgInEditor('${msg.id}')">Substituir</button>
            <button onclick="copyMsgContent('${msg.id}')">Copiar</button>
        </div>
    ` : '';

    div.innerHTML = `
        <div class="chat-msg-avatar">${initial}</div>
        <div class="chat-msg-content">
            <div class="chat-msg-bubble">${formatContent(msg.content)}</div>
            ${actionsHtml}
        </div>
    `;

    container.appendChild(div);
}

// ─── Format content (simple markdown) ───
function formatContent(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^### (.*$)/gm, '<strong style="font-size:14px;">$1</strong>')
        .replace(/^## (.*$)/gm, '<strong style="font-size:15px;">$1</strong>')
        .replace(/^# (.*$)/gm, '<strong style="font-size:16px;">$1</strong>')
        .replace(/^- (.*$)/gm, '• $1')
        .replace(/\n/g, '<br>');
}

// ─── Render full chat history ───
function renderChatHistory() {
    const container = document.getElementById('chatMessages');
    // Remove welcome if there are messages
    if (chatHistory.length > 0) {
        const welcome = container.querySelector('.chat-welcome');
        if (welcome) welcome.remove();
    }
    chatHistory.forEach(msg => renderMessage(msg));
    scrollChatToBottom();
}

// ─── Show thinking indicator ───
function showThinking() {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';
    div.id = 'thinking-indicator';
    div.innerHTML = `
        <div class="chat-msg-avatar">✦</div>
        <div class="chat-msg-content">
            <div class="chat-thinking">
                <div class="thinking-dots"><span></span><span></span><span></span></div>
                <span>Pensando...</span>
            </div>
        </div>
    `;
    container.appendChild(div);
    scrollChatToBottom();
}

function removeThinking() {
    const el = document.getElementById('thinking-indicator');
    if (el) el.remove();
}

// ─── Generate AI response ───
async function generateChatResponse(userMsg) {
    if (isStreaming) return;
    isStreaming = true;

    const sendBtn = document.getElementById('chatSendBtn');
    sendBtn.disabled = true;
    showThinking();
    setBadge('loading', 'gerando...');

    const url = agentUrl();
    const key = apiKey();
    const tone = document.getElementById('tone')?.value || 'educativo';
    const dur = parseInt(document.getElementById('dur')?.value || '300');
    const rag = document.getElementById('useRag')?.checked ?? true;
    const editorContent = document.getElementById('editor')?.innerText || '';

    // Build context-aware prompt
    let contextPrompt = userMsg;
    if (editorContent.trim().length > 0) {
        contextPrompt = `[CONTEXTO DO EDITOR]\n${editorContent.slice(0, 2000)}\n\n[PEDIDO DO USUÁRIO]\n${userMsg}`;
    }

    const payload = {
        topic: contextPrompt,
        platform: curPlat || 'youtube',
        tone,
        duration: dur,
        use_rag: rag,
    };

    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    let fullResponse = '';
    const msgId = 'msg_' + Date.now() + '_ai';

    try {
        // Try streaming first
        const resp = await fetch(`${url}/api/content/generate`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        removeThinking();

        // Create assistant message bubble for streaming
        const assistantMsg = {
            id: msgId,
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            author: 'assistente',
        };
        renderMessage(assistantMsg);

        const bubble = document.querySelector(`#${msgId} .chat-msg-bubble`);
        const reader = resp.body.getReader();
        const dec = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            for (const line of dec.decode(value, { stream: true }).split('\n')) {
                if (line.startsWith('data: ')) {
                    try {
                        const d = JSON.parse(line.slice(6));
                        if (d.token) {
                            fullResponse += d.token;
                            bubble.innerHTML = formatContent(fullResponse);
                            scrollChatToBottom();
                        }
                    } catch {}
                }
            }
        }
    } catch {
        // Fallback to sync
        try {
            const resp = await fetch(`${url}/api/content/generate-sync`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const d = await resp.json();
            removeThinking();

            if (d.content) {
                fullResponse = d.content;
            } else if (d.error) {
                fullResponse = '❌ ' + d.error;
            }

            const assistantMsg = {
                id: msgId,
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toISOString(),
                author: 'assistente',
            };
            renderMessage(assistantMsg);
        } catch {
            removeThinking();
            fullResponse = '⚠️ Não foi possível conectar ao agente.\n\n1. O IPagent está rodando localmente?\n2. O tunnel está ativo?\n3. A URL está configurada em Configurações?';
            renderMessage({
                id: msgId,
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toISOString(),
                author: 'assistente',
            });
        }
    }

    // Save to history
    if (fullResponse) {
        chatHistory.push({
            id: msgId,
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date().toISOString(),
            author: 'assistente',
        });
        saveChatHistory();
        logAudit('ai_response', { length: fullResponse.length, platform: curPlat });

        // Add action buttons
        const msgEl = document.getElementById(msgId);
        if (msgEl) {
            const existing = msgEl.querySelector('.chat-msg-actions');
            if (!existing) {
                const actions = document.createElement('div');
                actions.className = 'chat-msg-actions';
                actions.innerHTML = `
                    <button onclick="insertMsgToEditor('${msgId}')">Inserir no editor</button>
                    <button onclick="replaceMsgInEditor('${msgId}')">Substituir</button>
                    <button onclick="copyMsgContent('${msgId}')">Copiar</button>
                `;
                msgEl.querySelector('.chat-msg-content').appendChild(actions);
            }
        }
    }

    isStreaming = false;
    sendBtn.disabled = false;
    setBadge(online ? 'online' : 'offline', online ? 'online' : 'offline');
}

// ─── Message actions ───
function insertMsgToEditor(msgId) {
    const msg = chatHistory.find(m => m.id === msgId);
    if (!msg) return;
    const ed = document.getElementById('editor');
    ed.innerHTML += (ed.innerText.trim() ? '\n\n---\n\n' : '') + formatContent(msg.content);
    autoSave();
    toast('Inserido no editor');
    logAudit('insert_to_editor', { msgId, preview: msg.content.slice(0, 40) });
}

function replaceMsgInEditor(msgId) {
    const msg = chatHistory.find(m => m.id === msgId);
    if (!msg) return;
    document.getElementById('editor').innerHTML = formatContent(msg.content);
    autoSave();
    toast('Conteúdo substituído');
    logAudit('replace_editor', { msgId });
}

function copyMsgContent(msgId) {
    const msg = chatHistory.find(m => m.id === msgId);
    if (!msg) return;
    navigator.clipboard.writeText(msg.content).then(() => toast('Copiado'));
}

function scrollChatToBottom() {
    const container = document.getElementById('chatMessages');
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
}

// ─── Audit Trail ───
const AUDIT_KEY = 'cs_audit_log';

function logAudit(action, details = {}) {
    try {
        const log = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
        log.push({
            action,
            user: S?.username || 'unknown',
            userName: S?.name || S?.username || 'unknown',
            timestamp: new Date().toISOString(),
            projectId: curId || null,
            ...details,
        });
        // Keep last 500 entries
        if (log.length > 500) log.splice(0, log.length - 500);
        localStorage.setItem(AUDIT_KEY, JSON.stringify(log));
    } catch {}
}

// ─── Project Groups ───
const GROUPS_KEY = 'cs_project_groups';

function getGroups() {
    try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'); } catch { return []; }
}

function saveGroups(groups) {
    localStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
}

function createGroup(name) {
    const groups = getGroups();
    const group = {
        id: 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
        name,
        createdAt: new Date().toISOString(),
        collapsed: false,
    };
    groups.push(group);
    saveGroups(groups);
    renderFiles();
    logAudit('create_group', { groupName: name });
    return group;
}

function deleteGroup(groupId) {
    if (!confirm('Excluir este grupo? Os documentos serão desagrupados.')) return;
    const groups = getGroups().filter(g => g.id !== groupId);
    saveGroups(groups);
    // Ungroup all projects in this group
    const all = projects();
    all.forEach(p => { if (p.groupId === groupId) p.groupId = null; });
    saveAll(all);
    renderFiles();
    logAudit('delete_group', { groupId });
}

function toggleGroupCollapse(groupId) {
    const groups = getGroups();
    const g = groups.find(gr => gr.id === groupId);
    if (g) { g.collapsed = !g.collapsed; saveGroups(groups); renderFiles(); }
}

function moveToGroup(projectId, groupId) {
    const all = projects();
    const p = all.find(pr => pr.id === projectId);
    if (p) {
        p.groupId = groupId || null;
        saveAll(all);
        renderFiles();
        logAudit('move_to_group', { projectId, groupId });
    }
}

// ─── Enhanced File List with Groups ───
function renderFilesGrouped() {
    const el = document.getElementById('fileList');
    const all = projects();
    const groups = getGroups();

    if (!all.length && !groups.length) {
        el.innerHTML = '<div style="padding:30px 14px;text-align:center;color:var(--text-4);font-size:12px;">Nenhum documento.<br>Clique em "+ Novo" para começar.</div>';
        return;
    }

    let html = '';

    // New Group button
    html += `<div style="padding:4px 12px 8px;">
        <button class="sidebar-new-btn" style="font-size:11px;padding:6px;border-style:dotted;" onclick="promptNewGroup()">
            <span style="font-size:10px;">📁</span> Novo grupo
        </button>
    </div>`;

    // Grouped projects
    const groupedIds = new Set();

    groups.forEach(group => {
        const groupProjects = all.filter(p => p.groupId === group.id);
        groupProjects.forEach(p => groupedIds.add(p.id));

        const collapseIcon = group.collapsed ? '▸' : '▾';
        html += `<div class="file-group">
            <div class="file-group-header" onclick="toggleGroupCollapse('${group.id}')">
                <span class="file-group-icon">${collapseIcon}</span>
                <span class="file-group-name">${group.name}</span>
                <span class="file-group-count">${groupProjects.length}</span>
                <button class="file-group-delete" onclick="event.stopPropagation();deleteGroup('${group.id}')" title="Excluir grupo">×</button>
            </div>`;

        if (!group.collapsed) {
            groupProjects.forEach(p => {
                html += renderFileItem(p);
            });
            if (!groupProjects.length) {
                html += '<div style="padding:6px 12px 6px 36px;font-size:11px;color:var(--text-4);font-style:italic;">Arraste documentos aqui</div>';
            }
        }

        html += '</div>';
    });

    // Ungrouped projects
    const ungrouped = all.filter(p => !groupedIds.has(p.id));
    if (ungrouped.length || groups.length) {
        if (groups.length > 0 && ungrouped.length > 0) {
            html += '<div class="sidebar-label" style="padding-top:8px;">Sem grupo</div>';
        }
        ungrouped.forEach(p => {
            html += renderFileItem(p);
        });
    }

    el.innerHTML = html;
}

function renderFileItem(p) {
    const icon = { youtube: '▶', instagram: '○', carousel: '□' }[p.platform] || '○';
    const badge = { youtube: 'YT', instagram: 'IG', carousel: 'CR' }[p.platform] || '';
    const cls = { youtube: 'badge-yt', instagram: 'badge-ig', carousel: 'badge-cr' }[p.platform] || '';
    const title = p.title || 'Sem título';
    return `<div class="file-item ${p.id === curId ? 'active' : ''}" onclick="openDoc('${p.id}')" draggable="true" ondragstart="dragFile(event,'${p.id}')">
        <span class="file-icon">${icon}</span>
        <span class="file-name">${title}</span>
        <span class="file-badge ${cls}">${badge}</span>
    </div>`;
}

function promptNewGroup() {
    const name = prompt('Nome do grupo:');
    if (name && name.trim()) createGroup(name.trim());
}

// Drag and drop for groups
function dragFile(e, projectId) {
    e.dataTransfer.setData('text/plain', projectId);
}

// ─── Override renderFiles to use grouped version ───
const _originalRenderFiles = typeof renderFiles === 'function' ? renderFiles : null;

// Replace renderFiles globally
window.renderFiles = function(filter) {
    if (filter !== undefined && _originalRenderFiles) {
        _originalRenderFiles(filter);
    } else {
        renderFilesGrouped();
    }
};

// ─── Load chat when switching documents ───
const _originalOpenDoc = typeof openDoc === 'function' ? openDoc : null;
if (_originalOpenDoc) {
    window.openDoc = function(id) {
        _originalOpenDoc(id);
        loadChatHistory();
        // Clear and re-render chat
        const container = document.getElementById('chatMessages');
        container.innerHTML = '';
        if (chatHistory.length > 0) {
            renderChatHistory();
        } else {
            container.innerHTML = `
                <div class="chat-welcome">
                    <div class="chat-welcome-icon">✦</div>
                    <h3>Creative Studio</h3>
                    <p>Seu assistente de criação de conteúdo. Peça para criar, refinar ou reescrever textos para vídeo.</p>
                    <div class="chat-suggestions">
                        <button class="chip" onclick="sendSuggestion('Crie um roteiro de 5 min sobre tirzepatida')">Roteiro: tirzepatida</button>
                        <button class="chip" onclick="sendSuggestion('Reescreva o texto do editor com tom mais provocativo')">Reescrever com outro tom</button>
                        <button class="chip" onclick="sendSuggestion('Adicione uma introdução impactante ao texto')">Introdução impactante</button>
                    </div>
                </div>`;
        }
    };
}

// ─── Init on load ───
document.addEventListener('DOMContentLoaded', () => {
    initChat();
    // Re-render files with groups
    renderFilesGrouped();
});

// Also init immediately if DOM already loaded
if (document.readyState !== 'loading') {
    initChat();
    renderFilesGrouped();
}
