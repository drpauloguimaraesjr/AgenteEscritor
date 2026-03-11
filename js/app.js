/**
 * Content Studio — Workspace Logic
 * Conecta ao IPagent local via tunnel.
 */

if (!Auth.requireAuth()) throw new Error('!auth');

const S = Auth.getSession();
document.getElementById('sidebarName').textContent = S.name || S.username;
document.getElementById('sidebarRole').textContent = S.role;
document.getElementById('sidebarAvatar').textContent = (S.name || S.username).charAt(0).toUpperCase();

// ─── State ───
const PK = 'cs_projects', SK = 'cs_settings';
let curId = null, curPlat = 'youtube', generating = false, saveTimer = null, online = false;

// ─── Settings ───
const settings = () => { try { return JSON.parse(localStorage.getItem(SK)||'{}'); } catch { return {}; } };
const agentUrl = () => (settings().agentUrl || 'http://localhost:5000').replace(/\/$/,'');
const apiKey  = () => settings().apiKey || '';

// ─── Projects CRUD ───
const projects = () => { try { return JSON.parse(localStorage.getItem(PK)||'[]'); } catch { return []; } };
const saveAll  = p => localStorage.setItem(PK, JSON.stringify(p));
const findProj = id => projects().find(p => p.id === id);

function saveProj(proj) {
    const all = projects(), i = all.findIndex(p => p.id === proj.id);
    i >= 0 ? all[i] = proj : all.unshift(proj);
    saveAll(all);
}

function delProj(id) { saveAll(projects().filter(p => p.id !== id)); }

function createNewProject() {
    saveCurrent();
    const p = {
        id: 'd_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
        title: '', content: '', platform: curPlat, tone: 'educativo', topic: '',
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        author: S.username, words: 0,
    };
    saveProj(p);
    openDoc(p.id);
    renderFiles();
    toast('Novo documento criado');
}

function openDoc(id) {
    saveCurrent();
    const p = findProj(id);
    if (!p) return;
    curId = id;
    curPlat = p.platform || 'youtube';
    document.getElementById('docTitle').value = p.title || '';
    document.getElementById('editor').innerHTML = p.content || '';
    document.getElementById('topic').value = p.topic || '';
    document.getElementById('tone').value = p.tone || 'educativo';
    pickPlatform(curPlat, false);
    updateMeta();
    updateSave('Carregado ✓');
    renderFiles();
}

function saveCurrent() {
    if (!curId) return;
    const p = findProj(curId);
    if (!p) return;
    p.title = document.getElementById('docTitle').value;
    p.content = document.getElementById('editor').innerHTML;
    p.platform = curPlat;
    p.tone = document.getElementById('tone').value;
    p.topic = document.getElementById('topic').value;
    p.updatedAt = new Date().toISOString();
    p.words = wordCount();
    saveProj(p);
}

function autoSave() {
    clearTimeout(saveTimer);
    updateMeta();
    updateSave('Salvando...');
    saveTimer = setTimeout(() => { saveCurrent(); updateSave('Salvo ✓'); renderFiles(); }, 600);
}

// ─── File list ───
function renderFiles(filter) {
    const el = document.getElementById('fileList');
    let all = projects();
    if (filter) { const f = filter.toLowerCase(); all = all.filter(p => (p.title||'').toLowerCase().includes(f) || (p.topic||'').toLowerCase().includes(f)); }

    if (!all.length) {
        el.innerHTML = '<div style="padding:30px 14px;text-align:center;color:var(--text-4);font-size:12px;">Nenhum documento.<br>Clique em "+ Novo" para começar.</div>';
        return;
    }

    el.innerHTML = all.map(p => {
        const icon = {youtube:'\u25B6',instagram:'\u25CB',carousel:'\u25A1'}[p.platform]||'\u25CB';
        const badge = {youtube:'YT',instagram:'IG',carousel:'CR'}[p.platform]||'';
        const cls = {youtube:'badge-yt',instagram:'badge-ig',carousel:'badge-cr'}[p.platform]||'';
        const title = p.title || 'Sem título';
        return `<div class="file-item ${p.id===curId?'active':''}" onclick="openDoc('${p.id}')">
            <span class="file-icon">${icon}</span>
            <span class="file-name">${title}</span>
            <span class="file-badge ${cls}">${badge}</span>
        </div>`;
    }).join('');
}

// ─── Editor helpers ───
function fmt(cmd, val) { document.execCommand(cmd, false, val||null); document.getElementById('editor').focus(); }
function wordCount() { const t = document.getElementById('editor').innerText||''; return t.trim() ? t.trim().split(/\s+/).length : 0; }
function updateMeta() {
    const w = wordCount();
    document.getElementById('wc').textContent = w;
    document.getElementById('rt').textContent = Math.max(1, Math.ceil(w/150));
}
function updateSave(t) { document.getElementById('saveIndicator').textContent = t; }

function copyEditorContent() {
    navigator.clipboard.writeText(document.getElementById('editor').innerText).then(() => toast('Copiado'));
}

function downloadProject() {
    const title = document.getElementById('docTitle').value || 'sem-titulo';
    const blob = new Blob([document.getElementById('editor').innerText], {type:'text/plain;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/\s+/g,'-').toLowerCase()}_${curPlat}.txt`;
    a.click();
    toast('Arquivo baixado');
}

function confirmDelete() { if (curId) document.getElementById('delModal').classList.add('show'); }
function closeModal() { document.getElementById('delModal').classList.remove('show'); }

function deleteCurrentProject() {
    if (!curId) return;
    delProj(curId); curId = null;
    document.getElementById('docTitle').value = '';
    document.getElementById('editor').innerHTML = '';
    renderFiles(); closeModal(); toast('Documento excluído');
    const all = projects();
    if (all.length) openDoc(all[0].id);
}

// ─── Platform ───
function pickPlatform(p, save=true) {
    curPlat = p;
    document.querySelectorAll('.pill').forEach(b => b.classList.toggle('active', b.dataset.p === p));
    document.getElementById('durGroup').style.display = p==='carousel' ? 'none' : '';
    const tags = {youtube:['YT','badge-yt'], instagram:['IG','badge-ig'], carousel:['CR','badge-cr']};
    const [label, cls] = tags[p] || ['',''];
    const tag = document.getElementById('platformTag');
    tag.textContent = label; tag.className = 'topbar-tag ' + cls;
    if (save) autoSave();
}

function setTopic(t) { document.getElementById('topic').value = t; }

// ─── AI Generation (connected to IPagent) ───
async function generate() {
    const topic = document.getElementById('topic').value.trim();
    if (!topic) { toast('Digite um tema'); return; }
    if (generating) return;

    const url = agentUrl(), key = apiKey();
    const tone = document.getElementById('tone').value;
    const dur = parseInt(document.getElementById('dur').value);
    const rag = document.getElementById('useRag').checked;

    const btn = document.getElementById('genBtn');
    const out = document.getElementById('aiOut');
    const wrap = document.getElementById('aiOutWrap');
    const acts = document.getElementById('aiActs');

    generating = true;
    btn.classList.add('loading'); btn.textContent = 'Gerando...';
    wrap.classList.add('visible');
    out.innerHTML = '<span class="typing-cursor"></span>';
    acts.classList.remove('visible');
    setBadge('loading', 'gerando...');

    const payload = { topic, platform: curPlat, tone, duration: dur, use_rag: rag };
    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    let full = '';

    try {
        const resp = await fetch(`${url}/api/content/generate`, { method:'POST', headers, body: JSON.stringify(payload) });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const reader = resp.body.getReader();
        const dec = new TextDecoder();
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            for (const line of dec.decode(value, {stream:true}).split('\n')) {
                if (line.startsWith('data: ')) {
                    try {
                        const d = JSON.parse(line.slice(6));
                        if (d.token) {
                            full += d.token;
                            out.textContent = full;
                            out.scrollTop = out.scrollHeight;
                        }
                    } catch {}
                }
            }
        }
    } catch {
        try {
            const resp = await fetch(`${url}/api/content/generate-sync`, { method:'POST', headers, body: JSON.stringify(payload) });
            const d = await resp.json();
            if (d.content) { full = d.content; out.textContent = full; }
            else if (d.error) out.textContent = '❌ ' + d.error;
        } catch {
            out.textContent = 'Agente inacessível.\n\n1. IPagent rodando local?\n2. Tunnel (ngrok) ativo?\n3. URL configurada em Configurações?';
        }
    }

    generating = false;
    btn.classList.remove('loading'); btn.textContent = 'Gerar conteúdo';
    acts.classList.add('visible');
    setBadge(online ? 'online' : 'offline', online ? 'online' : 'offline');

    if (!curId && full) {
        createNewProject();
        document.getElementById('docTitle').value = topic.slice(0,60);
        document.getElementById('topic').value = topic;
    }
}

function insertToEditor() {
    const t = document.getElementById('aiOut').textContent; if (!t) return;
    const ed = document.getElementById('editor');
    ed.innerHTML += (ed.innerText.trim() ? '\n\n---\n\n' : '') + t.replace(/\n/g,'<br>');
    autoSave(); toast('Inserido no editor');
}

function replaceEditor() {
    const t = document.getElementById('aiOut').textContent; if (!t) return;
    document.getElementById('editor').innerHTML = t.replace(/\n/g,'<br>');
    autoSave(); toast('Conteúdo substituído');
}

function copyAi() {
    navigator.clipboard.writeText(document.getElementById('aiOut').textContent).then(() => toast('Copiado'));
}

// ─── Agent Health ───
function setBadge(state, text) {
    const b = document.getElementById('agentBadge');
    b.className = 'status-badge status-' + state;
    document.getElementById('agentBadgeText').textContent = text;
}

async function checkAgent() {
    try {
        const h = {}; const k = apiKey(); if (k) h['Authorization'] = `Bearer ${k}`;
        const r = await fetch(`${agentUrl()}/api/content/health`, { headers: h, signal: AbortSignal.timeout(5000) });
        if (r.ok) {
            const d = await r.json(); online = true;
            setBadge('online', d.agent_ready ? 'online' : 'carregando...');
            document.getElementById('connBanner').classList.remove('show');
            const kb = document.getElementById('kbCount');
            if (d.knowledge_count) { kb.textContent = d.knowledge_count.toLocaleString(); document.getElementById('ragBadge').style.display = ''; }
        } else throw 0;
    } catch {
        online = false;
        setBadge('offline', 'offline');
        document.getElementById('connBanner').classList.add('show');
    }
}

// ─── Export / Import ───
function exportAll() {
    const all = projects();
    if (!all.length) { toast('Nada para exportar'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(all,null,2)], {type:'application/json'}));
    a.download = `content-studio-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); toast(`📥 ${all.length} docs exportados`);
}

function importProjects() { document.getElementById('importInput').click(); }

function handleImport(ev) {
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        try {
            const imp = JSON.parse(e.target.result);
            if (!Array.isArray(imp)) throw 0;
            const cur = projects(), ids = new Set(cur.map(p=>p.id));
            let n = 0;
            for (const p of imp) if (!ids.has(p.id)) { cur.unshift(p); n++; }
            saveAll(cur); renderFiles(); toast(`📤 ${n} importados`);
        } catch { toast('❌ Arquivo inválido'); }
    };
    r.readAsText(f); ev.target.value = '';
}

// ─── Toast ───
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── Keyboard ───
document.addEventListener('keydown', e => {
    if ((e.ctrlKey||e.metaKey) && e.key==='s') { e.preventDefault(); saveCurrent(); updateSave('Salvo ✓'); toast('Salvo'); }
    if ((e.ctrlKey||e.metaKey) && e.key==='n') { e.preventDefault(); createNewProject(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); generate(); }
});

// ─── Init ───
renderFiles();
const all = projects();
if (all.length) openDoc(all[0].id);
checkAgent();
setInterval(checkAgent, 15000);
