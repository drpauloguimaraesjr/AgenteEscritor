/**
 * Auth — Client-side authentication with Firebase.
 */

const Auth = (() => {
    const SESSION_KEY = 'cs_session';

    // Ouve o estado do usuário logado via firebase
    // Global `auth` is injected from index.html / app.html
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof auth !== 'undefined') {
            auth.onAuthStateChanged(user => {
                if (user) {
                    const sessionUser = {
                        id: user.uid,
                        username: user.email.split('@')[0],
                        email: user.email,
                        name: user.displayName || user.email.split('@')[0],
                        role: 'admin', // Padroniza como admin no MVP
                    };
                    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
                } else {
                    localStorage.removeItem(SESSION_KEY);
                }
            });
        }
    });

    async function login(email, password) {
        if (typeof auth === 'undefined') {
            return { success: false, error: 'Firebase não está configurado. Verifique os scripts no index.html.' };
        }
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            const session = {
                id: user.uid,
                username: user.email.split('@')[0],
                email: user.email,
                name: user.displayName || user.email.split('@')[0],
                role: 'admin',
                loginAt: new Date().toISOString(),
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(session));

            return { success: true, user: session, mustChangePassword: false };
        } catch (error) {
            console.error("Firebase Login Error:", error);
            let msg = 'Credenciais inválidas';
            if (error.code === 'auth/user-not-found') msg = 'Usuário não cadastrado no Firebase';
            if (error.code === 'auth/wrong-password') msg = 'Senha incorreta';
            if (error.code === 'auth/invalid-email') msg = 'E-mail em formato inválido';
            return { success: false, error: msg };
        }
    }

    async function logout() {
        if (typeof auth !== 'undefined') {
            await auth.signOut();
        }
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

    // Mantido por compatibilidade com a UI antiga
    function changePassword(currentPw, newPw) {
        return { success: false, error: 'Recurso desativado: Altere a senha pelo painel do Firebase' };
    }

    function clearMustChange(username) {}

    function inviteUser(email, name, tempPassword, role = 'user') {
        return { success: false, error: 'Crie usuários diretamente na aba Authentication do seu Firebase' };
    }

    function removeUser(userId) {
        return { success: false, error: 'Remova usuários no painel do Firebase' };
    }

    function getUsers() {
        // Retorna mock local apenas para a UI não quebrar
        const sess = getSession();
        if (sess) return [sess];
        return [];
    }

    return {
        login, logout, isLoggedIn, getSession, requireAuth,
        changePassword, clearMustChange,
        inviteUser, removeUser, getUsers
    };
})();
