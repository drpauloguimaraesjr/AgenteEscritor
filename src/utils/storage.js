// ─── localStorage helpers ───
const PK = 'cs_projects';
const SK = 'cs_settings';
const UK = 'cs_users';
const SESSION_KEY = 'cs_session';

export const storage = {
  projects: () => {
    try { return JSON.parse(localStorage.getItem(PK) || '[]'); } catch { return []; }
  },
  saveProjects: (list) => localStorage.setItem(PK, JSON.stringify(list)),

  settings: () => {
    try { return JSON.parse(localStorage.getItem(SK) || '{}'); } catch { return {}; }
  },
  saveSettings: (s) => localStorage.setItem(SK, JSON.stringify(s)),

  users: () => {
    try { return JSON.parse(localStorage.getItem(UK) || '[]'); } catch { return []; }
  },
  saveUsers: (u) => localStorage.setItem(UK, JSON.stringify(u)),

  session: () => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
  },
  saveSession: (s) => localStorage.setItem(SESSION_KEY, JSON.stringify(s)),
  clearSession: () => localStorage.removeItem(SESSION_KEY),

  chatHistory: (projectId) => {
    try { return JSON.parse(localStorage.getItem(`cs_chat_history_${projectId}`) || '[]'); } catch { return []; }
  },
  saveChatHistory: (projectId, history) => {
    localStorage.setItem(`cs_chat_history_${projectId}`, JSON.stringify(history));
  },

  openrouterKey: () => localStorage.getItem('cs_openrouter_api_key') || localStorage.getItem('cs_claude_api_key') || '',
  saveOpenrouterKey: (k) => localStorage.setItem('cs_openrouter_api_key', k),

  pubmedApiKey: () => localStorage.getItem('cs_pubmed_api_key') || '',
  savePubmedApiKey: (k) => localStorage.setItem('cs_pubmed_api_key', k),

  openrouterModel: () => localStorage.getItem('cs_openrouter_model') || localStorage.getItem('cs_claude_model') || 'anthropic/claude-sonnet-4-6',
  saveOpenrouterModel: (m) => localStorage.setItem('cs_openrouter_model', m),

  notionToken: () => localStorage.getItem('cs_notion_token') || '',
  saveNotionToken: (t) => localStorage.setItem('cs_notion_token', t),

  notionProxy: () => localStorage.getItem('cs_notion_proxy') || '',
  saveNotionProxy: (p) => localStorage.setItem('cs_notion_proxy', p),

  trainingDataset: () => {
    try { return JSON.parse(localStorage.getItem('cs_training_dataset') || '[]'); } catch { return []; }
  },
  appendTraining: (pair) => {
    const dataset = storage.trainingDataset();
    dataset.push(pair);
    localStorage.setItem('cs_training_dataset', JSON.stringify(dataset));
  },
};
