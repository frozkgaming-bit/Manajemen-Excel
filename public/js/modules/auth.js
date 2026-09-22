import { supabaseClient } from '../config/supabase.js';

export function initAuth() {
    async function checkUser() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            window.location.hash = '#/dashboard';
        }
    }

    checkUser();

    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const usernameInput = document.getElementById('loginUsername');
            const passwordInput = document.getElementById('loginPassword');
            const loginError = document.getElementById('loginError');

            if (!usernameInput.value.trim() || !passwordInput.value) {
                showError('Username dan password harus diisi');
                return;
            }

            const email = `${usernameInput.value.trim()}@admin.sistem`;
            const password = passwordInput.value;

            if (loginError) loginError.classList.add('hidden');
            btnLogin.innerText = "Loading...";
            btnLogin.disabled = true;

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

            btnLogin.innerText = "Masuk ke Sistem";
            btnLogin.disabled = false;

            if (error) {
                showError(error.message);
            } else {
                window.location.hash = '#/dashboard';
            }
        });
    }

    function showError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.classList.remove('hidden');
        }
    }
}