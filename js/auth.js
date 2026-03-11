/**
 * Auth — Client-side authentication with invite system.
 * Users stored in localStorage.
 * Admins can "invite" users by creating them with a temp password.
 * Invited users must change password on first login.
 */

const Auth = (() => {
    const SESSION_KEY = 'cs_session';
    const USERS_KEY = 'cs_users';

    // Simple hash (client-side only — fine for internal tool)
    function hash(str) {
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h |= 0;
        }
        return 'h' + Math.abs(h).toString(36);
    }

    function getUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
    }

    function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

    // Init default admin
    (() => {
        if (getUsers().length === 0) {
            saveUsers([{
                id: 'u_1',
                username: 'admin',
                email: 'admin@contentstudio.local',
                passwordHash: hash('admin123'),
                name: 'Dr. Paulo',
                role: 'admin',
                mustChangePassword: false,
                createdAt: new Date().toISOString(),
                invitedBy: null,
            }]);
        }
    })();

    function login(username, password) {
        const users = getUsers();
        const pwHash = hash(password);
        // Match by username OR email
        const user = users.find(u =>
            (u.username === username || u.email === username) && u.passwordHash === pwHash
        );
        if (!user) return { success: false, error: 'Credenciais inválidas' };

        const session = {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role,
            loginAt: new Date().toISOString(),
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));

        if (user.mustChangePassword) {
            return { success: true, user: session, mustChangePassword: true };
        }

        return { success: true, user: session };
    }

    function logout() {
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
    }

    function isLoggedIn() { return !!localStorage.getItem(SESSION_KEY); }

    function getSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
    }

    function requireAuth() {
        if (!isLoggedIn()) { window.location.href = 'index.html'; return false; }
        return true;
    }

    function changePassword(currentPw, newPw) {
        const session = getSession();
        if (!session) return { success: false, error: 'Não autenticado' };
        const users = getUsers();
        const user = users.find(u => u.id === session.id);
        if (!user) return { success: false, error: 'Usuário não encontrado' };
        if (user.passwordHash !== hash(currentPw)) return { success: false, error: 'Senha atual incorreta' };
        if (newPw.length < 6) return { success: false, error: 'Mínimo 6 caracteres' };

        user.passwordHash = hash(newPw);
        user.mustChangePassword = false;
        saveUsers(users);
        return { success: true };
    }

    function clearMustChange(username) {
        const users = getUsers();
        const user = users.find(u => u.username === username);
        if (user) {
            user.mustChangePassword = false;
            saveUsers(users);
        }
    }

    /**
     * Invite a new user (admin only).
     * Creates user with temp password. They must change on first login.
     */
    function inviteUser(email, name, tempPassword, role = 'user') {
        const users = getUsers();
        const session = getSession();
        
        // Check if email already exists
        if (users.find(u => u.email === email)) {
            return { success: false, error: 'Email já cadastrado' };
        }

        // Generate username from email
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
        if (users.find(u => u.username === username)) {
            return { success: false, error: 'Usuário já existe' };
        }

        const newUser = {
            id: 'u_' + Date.now(),
            username,
            email,
            passwordHash: hash(tempPassword),
            name: name || username,
            role,
            mustChangePassword: true,
            createdAt: new Date().toISOString(),
            invitedBy: session ? session.username : 'system',
        };

        users.push(newUser);
        saveUsers(users);

        return { success: true, user: newUser };
    }

    function removeUser(userId) {
        const session = getSession();
        if (!session || session.role !== 'admin') return { success: false, error: 'Sem permissão' };
        if (userId === session.id) return { success: false, error: 'Não pode remover a si mesmo' };

        const users = getUsers().filter(u => u.id !== userId);
        saveUsers(users);
        return { success: true };
    }

    return {
        login, logout, isLoggedIn, getSession, requireAuth,
        changePassword, clearMustChange,
        inviteUser, removeUser, getUsers, hash
    };
})();
