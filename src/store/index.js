import { create } from 'zustand';
import { storage } from '../utils/storage.js';
import { Auth } from '../utils/auth.js';

// ─── Helper ───
function makeId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

// ─── Main Store ───
export const useStore = create((set, get) => ({

  // ── Auth ──
  session: storage.session(),

  login(username, password) {
    const result = Auth.login(username, password);
    if (result.ok) set({ session: result.session });
    return result;
  },

  logout() {
    Auth.logout();
    set({ session: null, currentProjectId: null, chatHistory: [] });
  },

  // ── Projects ──
  projects: storage.projects(),
  currentProjectId: null,
  platform: 'youtube',

  loadProjects() {
    set({ projects: storage.projects() });
  },

  get currentProject() {
    const { projects, currentProjectId } = get();
    return projects.find(p => p.id === currentProjectId) || null;
  },

  openProject(id) {
    const history = storage.chatHistory(id);
    set({ currentProjectId: id, chatHistory: history });
  },

  createProject() {
    const session = get().session;
    const proj = {
      id: makeId('d'),
      title: 'Sem título',
      content: '',
      platform: get().platform,
      tone: 'educativo',
      topic: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: session?.username || 'user',
      words: 0,
    };
    const projects = [proj, ...get().projects];
    storage.saveProjects(projects);
    const history = [];
    storage.saveChatHistory(proj.id, history);
    set({ projects, currentProjectId: proj.id, chatHistory: history });
    return proj;
  },

  saveProject(partial) {
    const { currentProjectId, projects } = get();
    if (!currentProjectId) return;
    const updated = projects.map(p =>
      p.id === currentProjectId
        ? { ...p, ...partial, updatedAt: new Date().toISOString() }
        : p
    );
    storage.saveProjects(updated);
    set({ projects: updated });
  },

  deleteProject(id) {
    const projects = get().projects.filter(p => p.id !== id);
    storage.saveProjects(projects);
    const next = projects[0]?.id || null;
    const history = next ? storage.chatHistory(next) : [];
    set({ projects, currentProjectId: next, chatHistory: history });
  },

  setPlatform(p) {
    set({ platform: p });
    get().saveProject({ platform: p });
  },

  // ── Chat ──
  chatHistory: [],
  isStreaming: false,
  agentOnline: false,
  agentDocCount: 0,
  reasoningContext: '',

  addUserMessage(content) {
    const msg = {
      id: makeId('msg'),
      role: 'user', content,
      timestamp: new Date().toISOString(),
      author: get().session?.username || 'user',
    };
    const history = [...get().chatHistory, msg];
    const pid = get().currentProjectId;
    if (pid) storage.saveChatHistory(pid, history);
    set({ chatHistory: history });
    return msg;
  },

  addAssistantMessage(content, ragContext = '') {
    const msg = {
      id: makeId('msg'),
      role: 'assistant', content,
      timestamp: new Date().toISOString(),
      author: 'assistente',
      ragContext,
    };
    const history = [...get().chatHistory, msg];
    const pid = get().currentProjectId;
    if (pid) storage.saveChatHistory(pid, history);
    set({ chatHistory: history });
    return msg;
  },

  updateLastAssistantMessage(content) {
    const history = [...get().chatHistory];
    const last = history[history.length - 1];
    if (last?.role === 'assistant') {
      history[history.length - 1] = { ...last, content };
      set({ chatHistory: history });
    }
  },

  setStreaming(v) { set({ isStreaming: v }); },

  setAgentStatus(online, docCount = 0) {
    set({ agentOnline: online, agentDocCount: docCount });
  },

  // ── Modals ──
  showDeleteModal: false,
  showReasoningModal: false,
  openDeleteModal: () => set({ showDeleteModal: true }),
  closeDeleteModal: () => set({ showDeleteModal: false }),
  openReasoningModal: (ctx) => set({ showReasoningModal: true, reasoningContext: ctx }),
  closeReasoningModal: () => set({ showReasoningModal: false, reasoningContext: '' }),

  // ── Toast ──
  toastMsg: null,
  toastTimer: null,
  toast(msg) {
    const timer = get().toastTimer;
    if (timer) clearTimeout(timer);
    const t = setTimeout(() => set({ toastMsg: null, toastTimer: null }), 3000);
    set({ toastMsg: msg, toastTimer: t });
  },

  // ── Settings ──
  openrouterKey: storage.openrouterKey(),
  openrouterModel: storage.openrouterModel(),
  agentUrl: storage.settings().agentUrl || 'http://localhost:5050',
  agentApiKey: storage.settings().apiKey || '',
  useRag: true,

  saveSettings(s) {
    if (s.openrouterKey !== undefined) {
      storage.saveOpenrouterKey(s.openrouterKey);
    }
    if (s.openrouterModel !== undefined) {
      storage.saveOpenrouterModel(s.openrouterModel);
    }
    if (s.agentUrl !== undefined || s.agentApiKey !== undefined) {
      const cur = storage.settings();
      storage.saveSettings({ ...cur, agentUrl: s.agentUrl ?? cur.agentUrl, apiKey: s.agentApiKey ?? cur.apiKey });
    }
    set(s);
  },

  setUseRag(v) { set({ useRag: v }); },

  // ── Editor toggle ──
  editorVisible: false,
  toggleEditor() { set(s => ({ editorVisible: !s.editorVisible })); },

  // ── Settings panel ──
  settingsOpen: false,
  openSettings() { set({ settingsOpen: true }); },
  closeSettings() { set({ settingsOpen: false }); },

  // ── PubMed ──
  pubmedOpen: false,
  pubmedApiKey: storage.pubmedApiKey(),
  pubmedContext: [],

  openPubMed()  { set({ pubmedOpen: true }); },
  closePubMed() { set({ pubmedOpen: false }); },

  savePubmedApiKey(k) {
    storage.savePubmedApiKey(k);
    set({ pubmedApiKey: k });
  },

  addPubMedContext(ref) {
    const cur = get().pubmedContext;
    if (cur.find(r => r.pmid === ref.pmid)) return;
    set({ pubmedContext: [...cur, ref] });
  },

  clearPubMedContext() { set({ pubmedContext: [] }); },

  // ── Notion ──
  notionOpen: false,
  notionToken: storage.notionToken(),
  notionProxy: storage.notionProxy(),
  notionStyleContext: [], // [{ id, title, icon, content }]

  openNotion()  { set({ notionOpen: true }); },
  closeNotion() { set({ notionOpen: false }); },

  saveNotionToken(t) {
    storage.saveNotionToken(t);
    set({ notionToken: t });
  },

  saveNotionProxy(p) {
    storage.saveNotionProxy(p);
    set({ notionProxy: p });
  },

  addNotionStyle(page) {
    const cur = get().notionStyleContext;
    if (cur.find(p => p.id === page.id)) return;
    set({ notionStyleContext: [...cur, page] });
  },

  removeNotionStyle(id) {
    set({ notionStyleContext: get().notionStyleContext.filter(p => p.id !== id) });
  },

  clearNotionStyles() { set({ notionStyleContext: [] }); },
}));
