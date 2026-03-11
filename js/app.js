/**
 * Content Studio — Main Application Logic.
 * Manages projects, editor, AI generation, and agent connectivity.
 */

// ==========================================
// AUTH GATE
// ==========================================
if (!Auth.requireAuth()) throw new Error('Not authenticated');

const session = Auth.getSession();
document.getElementById('userName').textContent = session.name || session.username;
document.getElementById('userRole').textContent = session.role;
document.getElementById('userAvatar').textContent = (session.name || session.username).charAt(0).toUpperCase();

// ==========================================
// STATE
// ==========================================
const PROJECTS_KEY = 'cs_projects';
const SETTINGS_KEY = 'cs_settings';

let currentProjectId = null;
let currentPlatform = 'youtube';
let isGenerating = false;
let autoSaveTimer = null;
let agentOnline = false;

// ==========================================
// SETTINGS
// ==========================================
function getSettings() {
    try {
        return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch { return {}; }
}

function getAgentUrl() {
    const s = getSettings();
    return s.agentUrl || 'http://localhost:5000';
}

function getApiKey() {
    const s = getSettings();
    return s.apiKey || '';
}

// ==========================================
// PROJECTS STORAGE
// ==========================================
function getProjects() {
    try {
        return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    } catch { return []; }
}

function saveProjects(projects) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

function getProject(id) {
    return getProjects().find(p => p.id === id);
}

function saveProject(project) {
    const projects = getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx >= 0) {
        projects[idx] = project;
    } else {
        projects.unshift(project);
    }
    saveProjects(projects);
}

function deleteProject(id) {
    const projects = getProjects().filter(p => p.id !== id);
    saveProjects(projects);
}

// ==========================================
// PROJECT CRUD
// ==========================================
function createNewProject() {
    const id = 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const project = {
        id,
        title: '',
        content: '',
        platform: currentPlatform,
        tone: 'educativo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: session.username,
        wordCount: 0,
    };
    saveProject(project);
    openProject(id);
    renderProjectList();
    showToast('📄 Novo projeto criado');
}

function openProject(id) {
    // Save current project first
    saveCurrentEditor();

    const project = getProject(id);
    if (!project) return;

    currentProjectId = id;
    currentPlatform = project.platform || 'youtube';

    // Load into editor
    document.getElementById('editorTitle').value = project.title || '';
    document.getElementById('editorCanvas').innerHTML = project.content || '';
    document.getElementById('topicInput').value = project.topic || '';
    document.getElementById('toneSelect').value = project.tone || 'educativo';

    // Update platform buttons
    selectPlatform(currentPlatform, false);

    // Update counts
    updateWordCount();
    updateSaveStatus('Carregado ✓');

    // Update sidebar selection
    document.querySelectorAll('.project-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === id);
    });
}

function saveCurrentEditor() {
    if (!currentProjectId) return;
    const project = getProject(currentProjectId);
    if (!project) return;

    project.title = document.getElementById('editorTitle').value;
    project.content = document.getElementById('editorCanvas').innerHTML;
    project.platform = currentPlatform;
    project.tone = document.getElementById('toneSelect').value;
    project.topic = document.getElementById('topicInput').value;
    project.updatedAt = new Date().toISOString();
    project.wordCount = countWords();

    saveProject(project);
}

function autoSave() {
    clearTimeout(autoSaveTimer);
    updateWordCount();
    updateSaveStatus('Salvando...');
    autoSaveTimer = setTimeout(() => {
        saveCurrentEditor();
        updateSaveStatus('Salvo ✓');
        renderProjectList();
    }, 800);
}

// ==========================================
// RENDER PROJECT LIST
// ==========================================
function renderProjectList(filter = '') {
    const list = document.getElementById('projectList');
    let projects = getProjects();
    
    if (filter) {
        const f = filter.toLowerCase();
        projects = projects.filter(p => 
            (p.title || '').toLowerCase().includes(f) || 
            (p.topic || '').toLowerCase().includes(f)
        );
    }

    if (projects.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:var(--text-muted);">
                <div style="font-size:32px; margin-bottom:12px; opacity:0.4;">📝</div>
                <p style="font-size:13px;">Nenhum projeto ainda</p>
                <p style="font-size:12px; margin-top:4px;">Clique em + para criar</p>
            </div>
        `;
        return;
    }

    list.innerHTML = projects.map(p => {
        const isActive = p.id === currentProjectId;
        const title = p.title || 'Sem título';
        const date = new Date(p.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        const platformClass = `platform-${p.platform || 'youtube'}`;
        const platformLabel = { youtube: 'YT', instagram: 'IG', carousel: 'CARR' }[p.platform] || 'YT';
        const icon = { youtube: '▶️', instagram: '📸', carousel: '📑' }[p.platform] || '📄';

        return `
            <div class="project-item ${isActive ? 'active' : ''}" data-id="${p.id}" onclick="openProject('${p.id}')">
                <span class="project-title"><span class="project-icon">${icon}</span>${title}</span>
                <div class="project-meta">
                    <span class="project-platform ${platformClass}">${platformLabel}</span>
                    <span>${p.wordCount || 0} palavras</span>
                    <span>${date}</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterProjects() {
    const q = document.getElementById('projectSearch').value;
    renderProjectList(q);
}

// ==========================================
// EDITOR FUNCTIONS
// ==========================================
function formatText(command, value = null) {
    document.execCommand(command, false, value);
    document.getElementById('editorCanvas').focus();
}

function countWords() {
    const text = document.getElementById('editorCanvas').innerText || '';
    return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function updateWordCount() {
    const words = countWords();
    document.getElementById('wordCount').textContent = words;
    document.getElementById('readTime').textContent = Math.max(1, Math.ceil(words / 150));
    document.getElementById('currentPlatform').textContent = 
        { youtube: '▶️ YouTube', instagram: '📸 Instagram', carousel: '📑 Carrossel' }[currentPlatform] || '';
}

function updateSaveStatus(text) {
    document.getElementById('saveStatus').textContent = text;
}

function copyEditorContent() {
    const text = document.getElementById('editorCanvas').innerText;
    navigator.clipboard.writeText(text).then(() => showToast('📋 Conteúdo copiado!'));
}

function downloadProject() {
    const title = document.getElementById('editorTitle').value || 'sem-titulo';
    const text = document.getElementById('editorCanvas').innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/\s+/g, '-').toLowerCase()}_${currentPlatform}.txt`;
    a.click();
    showToast('💾 Arquivo baixado!');
}

function confirmDelete() {
    if (!currentProjectId) return;
    document.getElementById('deleteModal').classList.add('show');
}

function closeModal() {
    document.getElementById('deleteModal').classList.remove('show');
}

function deleteCurrentProject() {
    if (!currentProjectId) return;
    deleteProject(currentProjectId);
    currentProjectId = null;
    document.getElementById('editorTitle').value = '';
    document.getElementById('editorCanvas').innerHTML = '';
    renderProjectList();
    closeModal();
    showToast('🗑️ Projeto excluído');

    // Open first project if any
    const projects = getProjects();
    if (projects.length > 0) openProject(projects[0].id);
}

// ==========================================
// PLATFORM SELECTOR
// ==========================================
function selectPlatform(platform, save = true) {
    currentPlatform = platform;
    document.querySelectorAll('.platform-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.platform === platform);
    });
    document.getElementById('durationGroup').style.display = platform === 'carousel' ? 'none' : '';
    if (save) autoSave();
    updateWordCount();
}

function setTopic(text) {
    document.getElementById('topicInput').value = text;
}

// ==========================================
// AI CONTENT GENERATION
// ==========================================
async function generateContent() {
    const topic = document.getElementById('topicInput').value.trim();
    if (!topic) {
        showToast('⚠️ Digite um tema primeiro');
        return;
    }
    if (isGenerating) return;

    const agentUrl = getAgentUrl();
    const apiKey = getApiKey();
    const tone = document.getElementById('toneSelect').value;
    const duration = parseInt(document.getElementById('durationSelect').value);
    const useRag = document.getElementById('useRag').checked;

    const btn = document.getElementById('btnGenerate');
    const output = document.getElementById('aiOutput');
    const actions = document.getElementById('aiOutputActions');

    isGenerating = true;
    btn.classList.add('loading');
    btn.innerHTML = '⏳ GERANDO...';
    output.classList.add('visible');
    output.innerHTML = '<span class="cursor-blink"></span>';
    actions.classList.remove('visible');

    document.getElementById('statusDot').className = 'status-dot loading';
    document.getElementById('statusText').textContent = 'Gerando...';

    const payload = { topic, platform: currentPlatform, tone, duration, use_rag: useRag };
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    let fullText = '';

    try {
        // Try streaming first
        const response = await fetch(`${agentUrl}/api/content/generate`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.token) {
                            fullText += data.token;
                            output.textContent = fullText;
                            output.scrollTop = output.scrollHeight;
                        }
                        if (data.done) {
                            // Done
                        }
                    } catch {}
                }
            }
        }
    } catch (streamErr) {
        // Fallback: sync endpoint
        try {
            const resp = await fetch(`${agentUrl}/api/content/generate-sync`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            const data = await resp.json();
            if (data.content) {
                fullText = data.content;
                output.textContent = fullText;
            } else if (data.error) {
                output.textContent = `❌ Erro: ${data.error}`;
            }
        } catch (syncErr) {
            output.textContent = '❌ Não foi possível conectar ao agente.\n\nVerifique:\n1. O IPagent está rodando no seu computador?\n2. O tunnel (ngrok) está ativo?\n3. A URL está configurada corretamente?';
        }
    }

    isGenerating = false;
    btn.classList.remove('loading');
    btn.innerHTML = '⚡ GERAR SCRIPT';
    actions.classList.add('visible');

    document.getElementById('statusDot').className = agentOnline ? 'status-dot' : 'status-dot offline';
    document.getElementById('statusText').textContent = agentOnline ? 'Online' : 'Verificando...';

    // Auto-create project if none
    if (!currentProjectId && fullText) {
        createNewProject();
        document.getElementById('editorTitle').value = topic.slice(0, 60);
        document.getElementById('topicInput').value = topic;
    }
}

function insertToEditor() {
    const text = document.getElementById('aiOutput').textContent;
    if (!text) return;
    const editor = document.getElementById('editorCanvas');
    // Append to existing content
    if (editor.innerHTML && editor.innerText.trim()) {
        editor.innerHTML += '\n\n<hr>\n\n' + text.replace(/\n/g, '<br>');
    } else {
        editor.innerHTML = text.replace(/\n/g, '<br>');
    }
    autoSave();
    showToast('📥 Conteúdo inserido no editor');
}

function replaceEditor() {
    const text = document.getElementById('aiOutput').textContent;
    if (!text) return;
    document.getElementById('editorCanvas').innerHTML = text.replace(/\n/g, '<br>');
    autoSave();
    showToast('🔄 Editor substituído');
}

function copyAiOutput() {
    const text = document.getElementById('aiOutput').textContent;
    navigator.clipboard.writeText(text).then(() => showToast('📋 Copiado!'));
}

// ==========================================
// AGENT CONNECTIVITY
// ==========================================
async function checkAgentStatus() {
    const agentUrl = getAgentUrl();
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    const banner = document.getElementById('connectionBanner');

    try {
        const headers = {};
        const apiKey = getApiKey();
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

        const resp = await fetch(`${agentUrl}/api/content/health`, { headers, signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
            const data = await resp.json();
            agentOnline = true;
            dot.className = 'status-dot';
            text.textContent = data.agent_ready ? '🟢 Online' : '🟡 Carregando modelo...';
            banner.classList.remove('show');

            const count = data.knowledge_count || 0;
            document.getElementById('knowledgeCount').textContent = count.toLocaleString();
        } else {
            throw new Error('Not OK');
        }
    } catch {
        agentOnline = false;
        dot.className = 'status-dot offline';
        text.textContent = 'Offline';
        banner.classList.add('show');
    }
}

// ==========================================
// EXPORT / IMPORT
// ==========================================
function exportAllProjects() {
    const projects = getProjects();
    if (projects.length === 0) {
        showToast('⚠️ Nenhum projeto para exportar');
        return;
    }
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `content-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast(`📥 ${projects.length} projetos exportados`);
}

function importProjects() {
    document.getElementById('importFileInput').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) throw new Error('Invalid');
            const existing = getProjects();
            const existingIds = new Set(existing.map(p => p.id));
            let added = 0;
            for (const proj of imported) {
                if (!existingIds.has(proj.id)) {
                    existing.unshift(proj);
                    added++;
                }
            }
            saveProjects(existing);
            renderProjectList();
            showToast(`📤 ${added} projetos importados`);
        } catch {
            showToast('❌ Arquivo inválido');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ==========================================
// UI HELPERS
// ==========================================
function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('show');
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function toggleAiPanel() {
    document.getElementById('aiPanel').classList.toggle('open');
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('userDropdown').classList.remove('show');
    }
});

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
document.addEventListener('keydown', (e) => {
    // Ctrl+S — Save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentEditor();
        updateSaveStatus('Salvo ✓');
        showToast('💾 Salvo!');
    }
    // Ctrl+N — New project
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        createNewProject();
    }
    // Ctrl+Enter — Generate
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generateContent();
    }
});

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    renderProjectList();

    // Open last project or first available
    const projects = getProjects();
    if (projects.length > 0) {
        openProject(projects[0].id);
    }

    // Check agent
    checkAgentStatus();
    setInterval(checkAgentStatus, 15000);
}

init();
