// ─── Local Auth (localStorage) ───
const UK = 'cs_users';
const SK = 'cs_session';

// Default admin user
const DEFAULT_USERS = [
  { username: 'dr.paulo', password: 'admin123', role: 'admin', name: 'Dr. Paulo Guimarães' },
];

function getUsers() {
  try { return JSON.parse(localStorage.getItem(UK) || 'null') || DEFAULT_USERS; }
  catch { return DEFAULT_USERS; }
}

function saveUsers(u) { localStorage.setItem(UK, JSON.stringify(u)); }

export const Auth = {
  login(username, password) {
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return { ok: false, error: 'Usuário ou senha incorretos' };
    const session = { username: user.username, role: user.role, name: user.name };
    localStorage.setItem(SK, JSON.stringify(session));
    return { ok: true, session };
  },

  logout() {
    localStorage.removeItem(SK);
  },

  session() {
    try { return JSON.parse(localStorage.getItem(SK) || 'null'); }
    catch { return null; }
  },

  register(username, password, name = '') {
    const users = getUsers();
    if (users.find(u => u.username === username)) return { ok: false, error: 'Usuário já existe' };
    users.push({ username, password, role: 'user', name: name || username });
    saveUsers(users);
    return { ok: true };
  },
};
