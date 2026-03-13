/**
 * Creative Studio — Chat Engine
 * Conversational AI panel with streaming, actions, and audit trail
 * Eva Effects Design System aesthetic
 */

// ─── Chat State ───
let chatHistory = [];
let isStreaming = false;
let abortController = null;
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
            <button onclick="insertMsgToEditor('${msg.id}')">📝 Abrir na lousa</button>
            <button onclick="replaceMsgInEditor('${msg.id}')">↻ Substituir</button>
            <button onclick="copyMsgContent('${msg.id}')">⎘ Copiar</button>
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

// ─── Generate AI response (HYBRID: RAG local + Claude API) ───
async function generateChatResponse(userMsg) {
    if (isStreaming) return;
    isStreaming = true;
    abortController = new AbortController();

    const sendBtn = document.getElementById('chatSendBtn');
    sendBtn.disabled = false;
    sendBtn.classList.add('stop-mode');
    sendBtn.title = 'Parar geração';
    sendBtn.onclick = stopGeneration;
    sendBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
    showThinking();
    setBadge('loading', 'gerando...');

    const ipagentUrl = agentUrl();
    const ipagentKey = apiKey();
    const claudeKey = localStorage.getItem('cs_openrouter_api_key') || localStorage.getItem('cs_claude_api_key') || '';
    const tone = document.getElementById('tone')?.value || 'educativo';
    const dur = parseInt(document.getElementById('dur')?.value || '300');
    const rag = document.getElementById('useRag')?.checked ?? true;
    const editorContent = document.getElementById('editor')?.innerText || '';

    // ═══════════════════════════════════════════
    // SYSTEM PROMPT: DNA DE ESTILO DR. PAULO
    // ═══════════════════════════════════════════
    const systemPrompt = `Você é o Assistente IA do Creative Studio do Dr. Paulo Guimarães. Você opera com DUAS bases de conhecimento:

📘 BASE CLÍNICA (RAG): Artigos científicos, estudos clínicos, guidelines, dados de consultas
🎤 BASE DE VOZ (DNA de Estilo): Tom, vocabulário, estrutura textual, ganchos virais

═══ REGRA 1: BRIEFING ANTES DE GERAR ═══
Na PRIMEIRA mensagem sobre um tema novo, NÃO gere texto. Faça perguntas:
1. Estrutura: roteiro narrado, lista, storytelling, caso clínico, mito vs verdade?
2. Gancho viral: provocativo, educativo, emocional ou curiosidade?
3. Duração do vídeo: 30s, 1min, 3min, 5min, 10min+?
4. Público: pacientes leigos, profissionais de saúde, ou ambos?
5. Tom: formal, acessível, provocativo, motivacional?
6. CTA: agendar consulta, seguir perfil, compartilhar?

Só gere após respostas OU se pedir "gere agora" / "faça direto".

═══ REGRA 2: SEMPRE USE O CONTEXTO RAG ═══
Se contexto RAG for fornecido, SEMPRE o utilize. Cite estudos com:
- Nome do estudo/revista + ano
- Número de participantes quando disponível
- Conclusão específica (não genérica)

═══ REGRA 3: DNA DE ESTILO — COMO O DR. PAULO ESCREVE ═══

ESTRUTURA OBRIGATÓRIA DO TEXTO:
1. GANCHO VIRAL: Abertura provocativa que desafia o senso comum
   Ex: "Câncer de mama assusta. Mas deveria assustar mais a quantidade de médicos mal informados..."
   Ex: "50% dos usuários de EAA têm ECG alterado. Assustador? Olha o contexto."

2. CONFRONTO: Desmistifica crenças com tom assertivo
   Ex: "Isso não é ciência. Isso é medo, ignorância e preguiça intelectual."

3. EVIDÊNCIAS como ARMAS: Cada estudo é uma seção com ### header
   Ex: "### Estudo BRCA (Gynecologic Oncology 2019)"
   Detalhar: participantes, metodologia, conclusão

4. INSIGHT-CHAVE: Bloco destacado com 💡
   Ex: "💡 Não é hormônio. É QUAL hormônio, COMO, em QUEM, em que DOSE e em que CONTEXTO."

5. CONTRAPONTO: Mostra falhas nos estudos/posições antigas

6. FECHAMENTO: Dados numéricos específicos (+6% risco, +9% risco)

7. CTA FORTE com 🎯
   Ex: "🎯 Encaminhe este vídeo para aquela pessoa que vive falando mal de hormônio."
   Ex: "Me segue pra conteúdo com referência aplicada — não manchete mastigada."

CARACTERÍSTICAS DO TOM:
- Provocativo mas embasado em evidências
- Frases curtas intercaladas com parágrafos densos
- Perguntas retóricas para engajar
- Dados numéricos específicos (não genéricos)
- Referências a órgãos oficiais (NICE, Cochrane) como argumento de autoridade
- Linguagem coloquial misturada com termos técnicos

PROIBIDO:
- Texto genérico tipo Wikipedia
- "Olá, queridos espectadores" ou saudações genéricas
- Tom neutro ou corporativo
- Conclusões vagas sem dados
- Listas superficiais sem profundidade

═══ REGRA 4: SAÍDA ═══
Quando gerar, formate como:
## 📜 SCRIPT COMPLETO
[gancho + seções com ### + insights 💡 + CTA 🎯]

Se o usuário colar um texto pronto, pergunte o que quer (adaptar tom, resumir, expandir, reformular para vídeo).`;

    // ═══════════════════════════════════════════
    // STEP 1: Buscar contexto RAG via IPAgent local
    // ═══════════════════════════════════════════
    let ragContext = '';
    let ragUsed = false;
    let ragDocCount = 0;

    if (rag && ipagentUrl) {
        try {
            const ragHeaders = { 'Content-Type': 'application/json' };
            if (ipagentKey) ragHeaders['Authorization'] = `Bearer ${ipagentKey}`;

            const ragResp = await fetch(`${ipagentUrl}/api/knowledge/search`, {
                method: 'POST',
                headers: ragHeaders,
                body: JSON.stringify({ query: userMsg, n_results: 5 }),
                signal: AbortSignal.timeout(8000),
            });

            if (ragResp.ok) {
                const ragData = await ragResp.json();
                const consults = ragData.consultations || [];
                const literature = ragData.literature || [];
                ragDocCount = consults.length + literature.length;

                if (ragDocCount > 0) {
                    ragUsed = true;
                    ragContext = '\n═══ CONTEXTO RAG (Base de Dados) ═══\n';
                    if (literature.length > 0) {
                        ragContext += '\n[LITERATURA CIENTÍFICA]:\n';
                        literature.forEach((a, i) => ragContext += `--- Evidência ${i+1} ---\n${a}\n\n`);
                    }
                    if (consults.length > 0) {
                        ragContext += '\n[CONSULTAS ANTERIORES]:\n';
                        consults.forEach((c, i) => ragContext += `--- Histórico ${i+1} ---\n${c}\n\n`);
                    }
                }
            }
        } catch (e) {
            console.log('RAG search failed (IPAgent offline):', e.message);
        }
    }

    // Build user message with context
    let fullUserMsg = '';
    if (editorContent.trim().length > 0) {
        fullUserMsg += `[TEXTO JÁ EXISTENTE NO EDITOR]\n${editorContent.slice(0, 2000)}\n\n`;
    }
    if (ragContext) {
        fullUserMsg += ragContext + '\n';
    }
    fullUserMsg += `[PEDIDO DO USUÁRIO]\n${userMsg}`;

    let fullResponse = '';
    const msgId = 'msg_' + Date.now() + '_ai';

    // ═══════════════════════════════════════════
    // STEP 2: Gerar texto via Claude API (Anthropic) ou fallback para IPAgent
    // ═══════════════════════════════════════════
    if (claudeKey) {
        // ── HYBRID MODE: Claude API com retry ──
        const claudeModel = localStorage.getItem('cs_openrouter_model') || localStorage.getItem('cs_claude_model') || 'anthropic/claude-sonnet-4-20250514';
        const modelShort = claudeModel.split('/').pop().split('-').slice(0,2).join('-');
        setBadge('loading', `${modelShort}...`);

        try {
            const claudeData = await callClaudeWithRetry(claudeKey, claudeModel, systemPrompt, [
                ...chatHistory.filter(m => m.role === 'user' || m.role === 'assistant').slice(-6).map(m => ({
                    role: m.role,
                    content: m.content,
                })),
                { role: 'user', content: fullUserMsg }
            ], abortController.signal);

            removeThinking();
            fullResponse = claudeData.content?.[0]?.text || '❌ Resposta vazia do Claude';

            renderMessage({
                id: msgId,
                role: 'assistant',
                content: fullResponse,
                timestamp: new Date().toISOString(),
                author: 'assistente',
            });

        } catch (e) {
            if (e.name === 'AbortError') {
                removeThinking();
                fullResponse = '⏹ Geração cancelada.';
                renderMessage({ id: msgId, role: 'assistant', content: fullResponse, timestamp: new Date().toISOString(), author: 'assistente' });
            } else {
                console.error('Claude API error:', e);
                // Fallback to IPAgent
                removeThinking();
                fullResponse = await fallbackToIPAgent(ipagentUrl, ipagentKey, fullUserMsg, systemPrompt, msgId, abortController);
            }
        }
    } else {
        // ── IPAgent-only mode (no Claude key) ──
        removeThinking();
        fullResponse = await fallbackToIPAgent(ipagentUrl, ipagentKey, fullUserMsg, systemPrompt, msgId, abortController);
    }

    // ═══════════════════════════════════════════
    // STEP 3: Post-processing
    // ═══════════════════════════════════════════
    if (fullResponse) {
        chatHistory.push({
            id: msgId,
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date().toISOString(),
            author: 'assistente',
        });
        saveChatHistory();
        logAudit('ai_response', {
            length: fullResponse.length,
            platform: curPlat,
            engine: claudeKey ? 'claude' : 'ipagent',
            rag_used: ragUsed,
            rag_docs: ragDocCount,
        });

        // Add action buttons + RAG log
        const msgEl = document.getElementById(msgId);
        if (msgEl) {
            const existing = msgEl.querySelector('.chat-msg-actions');
            if (!existing) {
                const actions = document.createElement('div');
                actions.className = 'chat-msg-actions';
                actions.innerHTML = `
                    <button onclick="insertMsgToEditor('${msgId}')">📝 Abrir na lousa</button>
                    <button onclick="replaceMsgInEditor('${msgId}')">↻ Substituir</button>
                    <button onclick="copyMsgContent('${msgId}')">⎘ Copiar</button>
                `;
                msgEl.querySelector('.chat-msg-content').appendChild(actions);
            }

            // RAG usage log indicator
            addRagLog(msgEl, ragUsed, ragDocCount, claudeKey ? 'Claude' : 'IPAgent');
        }

        // Auto-open the lousa with the generated content
        if (typeof showEditorWithContent === 'function') {
            showEditorWithContent(formatContent(fullResponse));
        }

        // ═══ STEP 4: Salvar par de treinamento para Llama3 ═══
        if (claudeKey && fullResponse && !fullResponse.startsWith('⏹') && !fullResponse.startsWith('⚠️')) {
            saveTrainingPair(userMsg, fullResponse, ragContext);
        }
    }

    isStreaming = false;
    abortController = null;
    resetSendButton();
    const online = !!ipagentUrl;
    setBadge(online ? 'online' : 'offline', online ? (claudeKey ? 'claude' : 'online') : 'offline');
}

// ── OpenRouter API com retry (evita queda de conexão) ──
async function callClaudeWithRetry(apiKey, model, system, messages, signal, maxRetries = 3) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Prepend system message to messages array (OpenAI format)
            const fullMessages = [
                { role: 'system', content: system },
                ...messages
            ];

            const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Creative Studio - Dr. Paulo',
                },
                body: JSON.stringify({
                    model,
                    max_tokens: 4096,
                    messages: fullMessages,
                    provider: {
                        order: ['Anthropic', 'OpenAI'],
                        allow_fallbacks: true,
                    },
                }),
                signal,
            });

            if (resp.ok) {
                const data = await resp.json();
                // Convert OpenAI format → Anthropic format for compatibility
                return {
                    content: [{ text: data.choices?.[0]?.message?.content || '' }],
                    model: data.model,
                    usage: data.usage,
                };
            }

            const errData = await resp.json().catch(() => ({}));
            const errMsg = errData.error?.message || `HTTP ${resp.status}`;

            if (resp.status === 401 || resp.status === 403) {
                throw new Error(`🔑 Chave inválida: ${errMsg}`);
            }
            if (resp.status === 400) {
                throw new Error(`❌ Erro de request: ${errMsg}`);
            }

            lastError = new Error(`Tentativa ${attempt}/${maxRetries}: ${errMsg}`);
            console.warn(`OpenRouter retry ${attempt}/${maxRetries}:`, errMsg);

        } catch (e) {
            if (e.name === 'AbortError') throw e;
            lastError = e;
            if (e.message.includes('🔑') || e.message.includes('❌')) throw e;
            console.warn(`OpenRouter retry ${attempt}/${maxRetries}:`, e.message);
        }

        // Backoff exponencial: 2s, 4s, 8s
        if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
        }
    }
    throw lastError || new Error('OpenRouter API falhou após todas as tentativas');
}

// ── Destilação: salva par de treinamento para Llama3 ──
function saveTrainingPair(userPrompt, claudeResponse, ragContext) {
    const TRAIN_KEY = 'cs_training_dataset';
    try {
        const dataset = JSON.parse(localStorage.getItem(TRAIN_KEY) || '[]');

        // Formato Alpaca (compatível com Unsloth / fine-tuning)
        dataset.push({
            instruction: `Você é o assistente de conteúdo do Dr. Paulo Guimarães. Gere conteúdo médico para redes sociais no estilo do Dr. Paulo: provocativo, embasado em evidências, com ganchos virais e CTAs fortes.`,
            input: userPrompt + (ragContext ? '\n\n[CONTEXTO RAG]\n' + ragContext.slice(0, 2000) : ''),
            output: claudeResponse,
            category: 'content_generation',
            platform: curPlat || 'youtube',
            created_at: new Date().toISOString(),
        });

        localStorage.setItem(TRAIN_KEY, JSON.stringify(dataset));
        console.log(`🎓 Par de treinamento #${dataset.length} salvo para Llama3`);
    } catch (e) {
        console.warn('Erro ao salvar treinamento:', e);
    }
}

// ── Fallback: IPAgent local ──
async function fallbackToIPAgent(url, key, userMsg, systemPrompt, msgId, controller) {
    if (!url) {
        const msg = '⚠️ Configure a chave Claude em Configurações, ou ative o IPAgent local.';
        renderMessage({ id: msgId, role: 'assistant', content: msg, timestamp: new Date().toISOString(), author: 'assistente' });
        return msg;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const payload = {
        topic: systemPrompt + '\n\n' + userMsg,
        platform: curPlat || 'youtube',
        tone: document.getElementById('tone')?.value || 'educativo',
        duration: parseInt(document.getElementById('dur')?.value || '300'),
        use_rag: true,
    };

    let fullResponse = '';

    try {
        const resp = await fetch(`${url}/api/content/generate`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller?.signal,
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

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
                            if (bubble) bubble.innerHTML = formatContent(fullResponse);
                            scrollChatToBottom();
                        }
                    } catch {}
                }
            }
        }
    } catch {
        try {
            const resp = await fetch(`${url}/api/content/generate-sync`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const d = await resp.json();
            fullResponse = d.content || ('❌ ' + (d.error || 'Erro'));
            renderMessage({ id: msgId, role: 'assistant', content: fullResponse, timestamp: new Date().toISOString(), author: 'assistente' });
        } catch {
            fullResponse = '⚠️ Não foi possível conectar ao agente.\n\n1. O IPagent está rodando localmente?\n2. O tunnel está ativo?\n3. A URL está configurada em Configurações?';
            renderMessage({ id: msgId, role: 'assistant', content: fullResponse, timestamp: new Date().toISOString(), author: 'assistente' });
        }
    }

    return fullResponse;
}

// ─── Stop generation ───
function stopGeneration() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    isStreaming = false;
    removeThinking();
    resetSendButton();
    setBadge(online ? 'online' : 'offline', online ? 'online' : 'offline');
    toast('Geração interrompida');
}

function resetSendButton() {
    const sendBtn = document.getElementById('chatSendBtn');
    if (!sendBtn) return;
    sendBtn.disabled = false;
    sendBtn.classList.remove('stop-mode');
    sendBtn.title = 'Enviar';
    sendBtn.onclick = sendChat;
    sendBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
}

// ─── RAG Usage Log ───
function addRagLog(msgEl, ragUsed) {
    const logDiv = document.createElement('div');
    logDiv.className = ragUsed ? 'rag-log' : 'rag-log no-rag';
    if (ragUsed) {
        logDiv.innerHTML = `
            <span class="rag-log-icon">📚</span>
            <span>IA utilizou a base de conhecimento (RAG) para gerar esta resposta</span>
        `;
    } else {
        logDiv.innerHTML = `
            <span class="rag-log-icon">💭</span>
            <span>Resposta gerada sem base de conhecimento (apenas modelo)</span>
        `;
    }
    const content = msgEl.querySelector('.chat-msg-content');
    if (content) content.appendChild(logDiv);
}

// ─── Message actions ───
function insertMsgToEditor(msgId) {
    const msg = chatHistory.find(m => m.id === msgId);
    if (!msg) return;
    // Open lousa with content appended
    if (typeof showEditorWithContent === 'function') {
        const ed = document.getElementById('editor');
        const existing = ed ? ed.innerHTML : '';
        showEditorWithContent(existing + (existing.trim() ? '<br><hr><br>' : '') + formatContent(msg.content));
    }
    toast('Aberto na lousa');
    logAudit('insert_to_editor', { msgId, preview: msg.content.slice(0, 40) });
}

function replaceMsgInEditor(msgId) {
    const msg = chatHistory.find(m => m.id === msgId);
    if (!msg) return;
    if (typeof showEditorWithContent === 'function') {
        showEditorWithContent(formatContent(msg.content));
    }
    toast('Conteúdo substituído na lousa');
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
