/**
 * Creative Studio â€” Chat Engine
 * Conversational AI panel with streaming, actions, and audit trail
 * Eva Effects Design System aesthetic
 */

// â”€â”€â”€ Chat State â”€â”€â”€
let chatHistory = [];
let isStreaming = false;
let abortController = null;
const CHAT_KEY = 'cs_chat_history';

// â”€â”€â”€ Init â”€â”€â”€
function initChat() {
    loadChatHistory();
    if (chatHistory.length > 0) {
        renderChatHistory();
    }
}

// â”€â”€â”€ Persistence â”€â”€â”€
function loadChatHistory() {
    try { chatHistory = JSON.parse(localStorage.getItem(CHAT_KEY + '_' + (curId || 'global')) || '[]'); } catch { chatHistory = []; }
}

function saveChatHistory() {
    localStorage.setItem(CHAT_KEY + '_' + (curId || 'global'), JSON.stringify(chatHistory));
}

// â”€â”€â”€ Toggle Settings Panel â”€â”€â”€
function toggleAiSettings() {
    const panel = document.getElementById('aiSettingsPanel');
    const btn = document.getElementById('aiSettingsToggle');
    panel.classList.toggle('open');
    btn.classList.toggle('active');
}

// â”€â”€â”€ Send chat message â”€â”€â”€
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

// â”€â”€â”€ Add message to chat â”€â”€â”€
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

// â”€â”€â”€ Render a single message â”€â”€â”€
function renderMessage(msg) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = `chat-msg ${msg.role}`;
    div.id = msg.id;

    const initial = msg.role === 'user'
        ? (S?.name || S?.username || 'U').charAt(0).toUpperCase()
        : 'âœ¦';

    const actionsHtml = msg.role === 'assistant' ? `
        <div class="chat-msg-actions">
            <button onclick="insertMsgToEditor('${msg.id}')">ðŸ“ Abrir na lousa</button>
            <button onclick="replaceMsgInEditor('${msg.id}')">â†» Substituir</button>
            <button onclick="copyMsgContent('${msg.id}')">âŽ˜ Copiar</button>
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

// â”€â”€â”€ Format content (simple markdown) â”€â”€â”€
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
        .replace(/^- (.*$)/gm, 'â€¢ $1')
        .replace(/\n/g, '<br>');
}

// â”€â”€â”€ Render full chat history â”€â”€â”€
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

// â”€â”€â”€ Show thinking indicator â”€â”€â”€
function showThinking() {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';
    div.id = 'thinking-indicator';
    div.innerHTML = `
        <div class="chat-msg-avatar">âœ¦</div>
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

// â”€â”€â”€ Generate AI response (HYBRID: RAG local + Claude API) â”€â”€â”€
async function generateChatResponse(userMsg) {
    if (isStreaming) return;
    isStreaming = true;
    abortController = new AbortController();

    const sendBtn = document.getElementById('chatSendBtn');
    sendBtn.disabled = false;
    sendBtn.classList.add('stop-mode');
    sendBtn.title = 'Parar geraÃ§Ã£o';
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

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // SYSTEM PROMPT: DNA DE ESTILO DR. PAULO
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const systemPrompt = `VocÃª Ã© o Assistente IA do Creative Studio do Dr. Paulo GuimarÃ£es. VocÃª opera com DUAS bases de conhecimento:

ðŸ“˜ BASE CLÃNICA (RAG): Artigos cientÃ­ficos, estudos clÃ­nicos, guidelines, dados de consultas
ðŸŽ¤ BASE DE VOZ (DNA de Estilo): Tom, vocabulÃ¡rio, estrutura textual, ganchos virais

â•â•â• REGRA 1: BRIEFING ANTES DE GERAR â•â•â•
Na PRIMEIRA mensagem sobre um tema novo, NÃƒO gere texto. FaÃ§a perguntas:
1. Estrutura: roteiro narrado, lista, storytelling, caso clÃ­nico, mito vs verdade?
2. Gancho viral: provocativo, educativo, emocional ou curiosidade?
3. DuraÃ§Ã£o do vÃ­deo: 30s, 1min, 3min, 5min, 10min+?
4. PÃºblico: pacientes leigos, profissionais de saÃºde, ou ambos?
5. Tom: formal, acessÃ­vel, provocativo, motivacional?
6. CTA: agendar consulta, seguir perfil, compartilhar?

SÃ³ gere apÃ³s respostas OU se pedir "gere agora" / "faÃ§a direto".

â•â•â• REGRA 2: SEMPRE USE O CONTEXTO RAG â•â•â•
Se contexto RAG for fornecido, SEMPRE o utilize. Cite estudos com:
- Nome do estudo/revista + ano
- NÃºmero de participantes quando disponÃ­vel
- ConclusÃ£o especÃ­fica (nÃ£o genÃ©rica)

â•â•â• REGRA 3: DNA DE ESTILO â€” COMO O DR. PAULO ESCREVE â•â•â•

ESTRUTURA OBRIGATÃ“RIA DO TEXTO:
1. GANCHO VIRAL: Abertura provocativa que desafia o senso comum
   Ex: "CÃ¢ncer de mama assusta. Mas deveria assustar mais a quantidade de mÃ©dicos mal informados..."
   Ex: "50% dos usuÃ¡rios de EAA tÃªm ECG alterado. Assustador? Olha o contexto."

2. CONFRONTO: Desmistifica crenÃ§as com tom assertivo
   Ex: "Isso nÃ£o Ã© ciÃªncia. Isso Ã© medo, ignorÃ¢ncia e preguiÃ§a intelectual."

3. EVIDÃŠNCIAS como ARMAS: Cada estudo Ã© uma seÃ§Ã£o com ### header
   Ex: "### Estudo BRCA (Gynecologic Oncology 2019)"
   Detalhar: participantes, metodologia, conclusÃ£o

4. INSIGHT-CHAVE: Bloco destacado com ðŸ’¡
   Ex: "ðŸ’¡ NÃ£o Ã© hormÃ´nio. Ã‰ QUAL hormÃ´nio, COMO, em QUEM, em que DOSE e em que CONTEXTO."

5. CONTRAPONTO: Mostra falhas nos estudos/posiÃ§Ãµes antigas

6. FECHAMENTO: Dados numÃ©ricos especÃ­ficos (+6% risco, +9% risco)

7. CTA FORTE com ðŸŽ¯
   Ex: "ðŸŽ¯ Encaminhe este vÃ­deo para aquela pessoa que vive falando mal de hormÃ´nio."
   Ex: "Me segue pra Conteudo com referÃªncia aplicada â€” nÃ£o manchete mastigada."

CARACTERÃSTICAS DO TOM:
- Provocativo mas embasado em evidÃªncias
- Frases curtas intercaladas com parÃ¡grafos densos
- Perguntas retÃ³ricas para engajar
- Dados numÃ©ricos especÃ­ficos (nÃ£o genÃ©ricos)
- ReferÃªncias a Ã³rgÃ£os oficiais (NICE, Cochrane) como argumento de autoridade
- Linguagem coloquial misturada com termos tÃ©cnicos

PROIBIDO:
- Texto genÃ©rico tipo Wikipedia
- "OlÃ¡, queridos espectadores" ou saudaÃ§Ãµes genÃ©ricas
- Tom neutro ou corporativo
- ConclusÃµes vagas sem dados
- Listas superficiais sem profundidade

â•â•â• REGRA 4: SAÃDA â•â•â•
Quando gerar, formate como:
## ðŸ“œ SCRIPT COMPLETO
[gancho + seÃ§Ãµes com ### + insights ðŸ’¡ + CTA ðŸŽ¯]

Se o usuÃ¡rio colar um texto pronto, pergunte o que quer (adaptar tom, resumir, expandir, reformular para vÃ­deo).`;

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // STEP 1: Buscar contexto RAG via IPAgent local
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
                    ragContext = '\nâ•â•â• CONTEXTO RAG (Base de Dados) â•â•â•\n';
                    if (literature.length > 0) {
                        ragContext += '\n[LITERATURA CIENTÃFICA]:\n';
                        literature.forEach((a, i) => ragContext += `--- EvidÃªncia ${i+1} ---\n${a}\n\n`);
                    }
                    if (consults.length > 0) {
                        ragContext += '\n[CONSULTAS ANTERIORES]:\n';
                        consults.forEach((c, i) => ragContext += `--- HistÃ³rico ${i+1} ---\n${c}\n\n`);
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
        fullUserMsg += `[TEXTO JÃ EXISTENTE NO EDITOR]\n${editorContent.slice(0, 2000)}\n\n`;
    }
    if (ragContext) {
        fullUserMsg += ragContext + '\n';
    }
    fullUserMsg += `[PEDIDO DO USUÃRIO]\n${userMsg}`;

    let fullResponse = '';
    const msgId = 'msg_' + Date.now() + '_ai';

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // STEP 2: Gerar texto via Claude API (Anthropic) ou fallback para IPAgent
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (claudeKey) {
        // â”€â”€ HYBRID MODE: Claude API com retry â”€â”€
        const claudeModel = localStorage.getItem('cs_openrouter_model') || localStorage.getItem('cs_claude_model') || 'anthropic/claude-3.5-sonnet';
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
            fullResponse = claudeData.content?.[0]?.text || 'âŒ Resposta vazia do Claude';

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
                fullResponse = 'â¹ GeraÃ§Ã£o cancelada.';
                renderMessage({ id: msgId, role: 'assistant', content: fullResponse, timestamp: new Date().toISOString(), author: 'assistente' });
            } else if (e.message.includes('🔑') || e.message.includes('❌') || e.message.includes('Chave inv') || e.message.includes('Erro de request')) {
                removeThinking();
                fullResponse = '⚠️ **A conexão com a OpenRouter falhou!**\n\nDetalhe do Erro: ' + e.message + '\n\nIsso aconteceu porque o modo Híbrido estava ativo, mas a geração de texto foi bloqueada. Verifique as *Configurações* e confirme se sua conta da OpenRouter tem créditos (saldo positivo em "Billing") para rodar modelos avançados.';
                renderMessage({ id: msgId, role: 'assistant', content: fullResponse, timestamp: new Date().toISOString(), author: 'assistente' });
                       } else if (e.message.includes('🔑') || e.message.includes('❌') || e.message.includes('Chave inv') || e.message.includes('Erro de request')) {
                removeThinking();
                fullResponse = '⚠️ **A conexão com a OpenRouter falhou!**\n\nDetalhe do Erro: ' + e.message + '\n\nIsso aconteceu porque o modo Híbrido estava ativo, mas a geração de texto foi bloqueada. Verifique as *Configurações* e confirme se sua conta da OpenRouter tem créditos (saldo positivo em "Billing") para rodar modelos avançados.';
                renderMessage({ id: msgId, role: 'assistant', content: fullResponse, timestamp: new Date().toISOString(), author: 'assistente' });
            } else {
                console.error('Claude API error:', e);
                // Fallback to IPAgent
                removeThinking();
                fullResponse = await fallbackToIPAgent(ipagentUrl, ipagentKey, fullUserMsg, systemPrompt, msgId, abortController);
            }
        }
    } else {
        // â”€â”€ IPAgent-only mode (no Claude key) â”€â”€
        removeThinking();
        fullResponse = await fallbackToIPAgent(ipagentUrl, ipagentKey, fullUserMsg, systemPrompt, msgId, abortController);
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // STEP 3: Post-processing
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
                    <button onclick="insertMsgToEditor('${msgId}')">ðŸ“ Abrir na lousa</button>
                    <button onclick="replaceMsgInEditor('${msgId}')">â†» Substituir</button>
                    <button onclick="copyMsgContent('${msgId}')">âŽ˜ Copiar</button>
                `;
                msgEl.querySelector('.chat-msg-content').appendChild(actions);
            }

            // RAG usage log indicator
            addRagLog(msgEl, ragUsed, ragDocCount, claudeKey ? 'Claude' : 'IPAgent');
        }

        // Botao de lousa disponivel, mas sem abrir automaticamente.

        // â•â•â• STEP 4: Salvar par de treinamento para Llama3 â•â•â•
        if (claudeKey && fullResponse && !fullResponse.startsWith('â¹') && !fullResponse.startsWith('âš ï¸')) {
            saveTrainingPair(userMsg, fullResponse, ragContext);
        }
    }

    isStreaming = false;
    abortController = null;
    resetSendButton();
    const online = !!ipagentUrl;
    setBadge(online ? 'online' : 'offline', online ? (claudeKey ? 'claude' : 'online') : 'offline');
}

// â”€â”€ OpenRouter API com retry (evita queda de conexÃ£o) â”€â”€
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
                // Convert OpenAI format â†’ Anthropic format for compatibility
                return {
                    content: [{ text: data.choices?.[0]?.message?.content || '' }],
                    model: data.model,
                    usage: data.usage,
                };
            }

            const errData = await resp.json().catch(() => ({}));
            const errMsg = errData.error?.message || `HTTP ${resp.status}`;

            if (resp.status === 401 || resp.status === 403) {
                throw new Error(`ðŸ”‘ Chave invÃ¡lida: ${errMsg}`);
            }
            if (resp.status === 400) {
                throw new Error(`âŒ Erro de request: ${errMsg}`);
            }

            lastError = new Error(`Tentativa ${attempt}/${maxRetries}: ${errMsg}`);
            console.warn(`OpenRouter retry ${attempt}/${maxRetries}:`, errMsg);

        } catch (e) {
            if (e.name === 'AbortError') throw e;
            lastError = e;
            if (e.message.includes('ðŸ”‘') || e.message.includes('âŒ')) throw e;
            console.warn(`OpenRouter retry ${attempt}/${maxRetries}:`, e.message);
        }

        // Backoff exponencial: 2s, 4s, 8s
        if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt - 1)));
        }
    }
    throw lastError || new Error('OpenRouter API falhou apÃ³s todas as tentativas');
}

// â”€â”€ DestilaÃ§Ã£o: salva par de treinamento para Llama3 â”€â”€
function saveTrainingPair(userPrompt, claudeResponse, ragContext) {
    const TRAIN_KEY = 'cs_training_dataset';
    try {
        const dataset = JSON.parse(localStorage.getItem(TRAIN_KEY) || '[]');

        // Formato Alpaca (compatÃ­vel com Unsloth / fine-tuning)
        dataset.push({
            instruction: `VocÃª Ã© o assistente de Conteudo do Dr. Paulo GuimarÃ£es. Gere Conteudo mÃ©dico para redes sociais no estilo do Dr. Paulo: provocativo, embasado em evidÃªncias, com ganchos virais e CTAs fortes.`,
            input: userPrompt + (ragContext ? '\n\n[CONTEXTO RAG]\n' + ragContext.slice(0, 2000) : ''),
            output: claudeResponse,
            category: 'content_generation',
            platform: curPlat || 'youtube',
            created_at: new Date().toISOString(),
        });

        localStorage.setItem(TRAIN_KEY, JSON.stringify(dataset));
        console.log(`ðŸŽ“ Par de treinamento #${dataset.length} salvo para Llama3`);
    } catch (e) {
        console.warn('Erro ao salvar treinamento:', e);
    }
}

// â”€â”€ Fallback: IPAgent local â”€â”€
async function fallbackToIPAgent(url, key, userMsg, systemPrompt, msgId, controller) {
    if (!url) {
        const msg = 'âš ï¸ Configure a chave Claude em ConfiguraÃ§Ãµes, ou ative o IPAgent local.';
        renderMessage({ id: msgId, role: 'assistant', content: msg, timestamp: new Date().toISOString(), author: 'assistente' });
        return msg;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const payload = {
        topic: systemPrompt + '\n\n' + userMsg,
        query: userMsg,
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
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) throw new Error('Not streamable');

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
            fullResponse = d.content || ('âŒ ' + (d.error || 'Erro'));
            renderMessage({ id: msgId, role: 'assistant', content: fullResponse, timestamp: new Date().toISOString(), author: 'assistente' });
        } catch {
            fullResponse = 'âš ï¸ NÃ£o foi possÃ­vel conectar ao agente.\n\n1. O IPagent estÃ¡ rodando localmente?\n2. O tunnel estÃ¡ ativo?\n3. A URL estÃ¡ configurada em ConfiguraÃ§Ãµes?';
            renderMessage({ id: msgId, role: 'assistant', content: fullResponse, timestamp: new Date().toISOString(), author: 'assistente' });
        }
    }

    return fullResponse;
}

// â”€â”€â”€ Stop generation â”€â”€â”€
function stopGeneration() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    isStreaming = false;
    removeThinking();
    resetSendButton();
    setBadge(online ? 'online' : 'offline', online ? 'online' : 'offline');
    toast('GeraÃ§Ã£o interrompida');
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

// â”€â”€â”€ RAG Usage Log â”€â”€â”€
function addRagLog(msgEl, ragUsed) {
    const logDiv = document.createElement('div');
    logDiv.className = ragUsed ? 'rag-log' : 'rag-log no-rag';
    if (ragUsed) {
        logDiv.innerHTML = `
            <span class="rag-log-icon">ðŸ“š</span>
            <span>IA utilizou a base de conhecimento (RAG) para gerar esta resposta</span>
        `;
    } else {
        logDiv.innerHTML = `
            <span class="rag-log-icon">ðŸ’­</span>
            <span>Resposta gerada sem base de conhecimento (apenas modelo)</span>
        `;
    }
    const content = msgEl.querySelector('.chat-msg-content');
    if (content) content.appendChild(logDiv);
}

// â”€â”€â”€ Message actions â”€â”€â”€
function insertMsgToEditor(msgId) {
    // Botao: Adicionar a lousa
    const msg = chatHistory.find(m => m.id === msgId);
    if (!msg) { console.error('Msg not found in history', msgId); return; }
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
    // Botao: Substituir lousa
    const msg = chatHistory.find(m => m.id === msgId);
    if (!msg) { console.error('Msg not found in history', msgId); return; }
    if (typeof showEditorWithContent === 'function') {
        showEditorWithContent(formatContent(msg.content));
    }
    toast('Conteudo substituido na lousa');
    logAudit('replace_editor', { msgId });
}

function copyMsgContent(msgId) {
    const msg = chatHistory.find(m => m.id === msgId);
    if (!msg) { console.error('Msg not found in history', msgId); return; }
    navigator.clipboard.writeText(msg.content).then(() => toast('Copiado'));
}

function scrollChatToBottom() {
    const container = document.getElementById('chatMessages');
    requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
}

// â”€â”€â”€ Audit Trail â”€â”€â”€
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

// â”€â”€â”€ Project Groups â”€â”€â”€
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
    if (!confirm('Excluir este grupo? Os documentos serÃ£o desagrupados.')) return;
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

// â”€â”€â”€ Enhanced File List with Groups â”€â”€â”€
function renderFilesGrouped() {
    const el = document.getElementById('fileList');
    const all = projects();
    const groups = getGroups();

    if (!all.length && !groups.length) {
        el.innerHTML = '<div style="padding:30px 14px;text-align:center;color:var(--text-4);font-size:12px;">Nenhum documento.<br>Clique em "+ Novo" para comeÃ§ar.</div>';
        return;
    }

    let html = '';

    // New Group button
    html += `<div style="padding:4px 12px 8px;">
        <button class="sidebar-new-btn" style="font-size:11px;padding:6px;border-style:dotted;" onclick="promptNewGroup()">
            <span style="font-size:10px;">ðŸ“</span> Novo grupo
        </button>
    </div>`;

    // Grouped projects
    const groupedIds = new Set();

    groups.forEach(group => {
        const groupProjects = all.filter(p => p.groupId === group.id);
        groupProjects.forEach(p => groupedIds.add(p.id));

        const collapseIcon = group.collapsed ? 'â–¸' : 'â–¾';
        html += `<div class="file-group">
            <div class="file-group-header" onclick="toggleGroupCollapse('${group.id}')">
                <span class="file-group-icon">${collapseIcon}</span>
                <span class="file-group-name">${group.name}</span>
                <span class="file-group-count">${groupProjects.length}</span>
                <button class="file-group-delete" onclick="event.stopPropagation();deleteGroup('${group.id}')" title="Excluir grupo">Ã—</button>
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
    const icon = { youtube: 'â–¶', instagram: 'â—‹', carousel: 'â–¡' }[p.platform] || 'â—‹';
    const badge = { youtube: 'YT', instagram: 'IG', carousel: 'CR' }[p.platform] || '';
    const cls = { youtube: 'badge-yt', instagram: 'badge-ig', carousel: 'badge-cr' }[p.platform] || '';
    const title = p.title || 'Sem tÃ­tulo';
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

// â”€â”€â”€ Override renderFiles to use grouped version â”€â”€â”€
const _originalRenderFiles = typeof renderFiles === 'function' ? renderFiles : null;

// Replace renderFiles globally
window.renderFiles = function(filter) {
    if (filter !== undefined && _originalRenderFiles) {
        _originalRenderFiles(filter);
    } else {
        renderFilesGrouped();
    }
};

// â”€â”€â”€ Load chat when switching documents â”€â”€â”€
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
                    <div class="chat-welcome-icon">âœ¦</div>
                    <h3>Creative Studio</h3>
                    <p>Seu assistente de criaÃ§Ã£o de Conteudo. PeÃ§a para criar, refinar ou reescrever textos para vÃ­deo.</p>
                    <div class="chat-suggestions">
                        <button class="chip" onclick="sendSuggestion('Crie um roteiro de 5 min sobre tirzepatida')">Roteiro: tirzepatida</button>
                        <button class="chip" onclick="sendSuggestion('Reescreva o texto do editor com tom mais provocativo')">Reescrever com outro tom</button>
                        <button class="chip" onclick="sendSuggestion('Adicione uma introduÃ§Ã£o impactante ao texto')">IntroduÃ§Ã£o impactante</button>
                    </div>
                </div>`;
        }
    };
}

// â”€â”€â”€ Init on load â”€â”€â”€
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






