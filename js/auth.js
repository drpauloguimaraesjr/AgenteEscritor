/**
 * Auth — Client-side authentication module.
 * Users are stored in localStorage. In production, integrate with a real backend.
 */

const Auth = (() => {
    const STORAGE_KEY = 'cs_auth';
    const USERS_KEY = 'cs_users';

    // Initialize default users if none exist
    function initDefaults() {
        const users = getUsers();
        if (users.length === 0) {
            const defaults = [
                {
                    username: 'admin',
                    passwordHash: hashPassword('admin123'),
                    name: 'Dr. Paulo',
                    role: 'admin',
                    createdAt: new Date().toISOString(),
                },
            ];
            localStorage.setItem(USERS_KEY, JSON.stringify(defaults));
        }
    }

    function hashPassword(password) {
        // Simple hash for client-side (not cryptographically secure — fine for demo/internal use)
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'h_' + Math.abs(hash).toString(36);
    }

    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        } catch {
            return [];
        }
    }

    function saveUsers(users) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    function login(username, password) {
        initDefaults();
        const users = getUsers();
        const pwHash = hashPassword(password);
        const user = users.find(u => u.username === username && u.passwordHash === pwHash);
        if (!user) {
            return { success: false, error: 'Usuário ou senha incorretos' };
        }
        const session = {
            username: user.username,
            name: user.name,
            role: user.role,
            loginAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
        return { success: true, user: session };
    }

    function logout() {
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = 'index.html';
    }

    function isLoggedIn() {
        return !!localStorage.getItem(STORAGE_KEY);
    }

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY));
        } catch {
            return null;
        }
    }

    function requireAuth() {
        if (!isLoggedIn()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    }

    function changePassword(currentPw, newPw) {
        const session = getSession();
        if (!session) return { success: false, error: 'Não autenticado' };
        
        const users = getUsers();
        const user = users.find(u => u.username === session.username);
        if (!user) return { success: false, error: 'Usuário não encontrado' };

        if (user.passwordHash !== hashPassword(currentPw)) {
            return { success: false, error: 'Senha atual incorreta' };
        }

        if (newPw.length < 4) {
            return { success: false, error: 'Senha muito curta (mín. 4)' };
        }

        user.passwordHash = hashPassword(newPw);
        saveUsers(users);
        return { success: true };
    }

    function addUser(username, password, name, role = 'user') {
        const users = getUsers();
        if (users.find(u => u.username === username)) {
            return { success: false, error: 'Usuário já existe' };
        }
        users.push({
            username,
            passwordHash: hashPassword(password),
            name: name || username,
            role,
            createdAt: new Date().toISOString(),
        });
        saveUsers(users);
        return { success: true };
    }

    // Auto-init
    initDefaults();

    return { login, logout, isLoggedIn, getSession, requireAuth, changePassword, addUser, getUsers };
})();
