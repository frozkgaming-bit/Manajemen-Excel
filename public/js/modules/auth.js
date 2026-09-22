import { supabaseClient } from '../config/supabase.js';
import { fetchServerCounts } from '../modules/stats.js';
import { navigate } from '../router.js';

export async function initAuth() {
    const btnLogin = document.getElementById('btnLogin');
    const loginError = document.getElementById('loginError');

    async function checkUser() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            // User is logged in, redirect to dashboard using router
            window.location.hash = '#/dashboard';
        }
    }

    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const usernameInput = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!usernameInput || !password) {
                showError('Username dan password harus diisi');
                return;
            }

            const email = `${usernameInput}@admin.sistem`;
            
            hideError();
            btnLogin.innerText = "Loading...";
            btnLogin.disabled = true;
            
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            
            btnLogin.innerText = "Masuk ke Sistem";
            btnLogin.disabled = false;
            
            if (error) {
                showError(error.message);
            } else {
                // Use SPA navigation instead of full page reload
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

    function hideError() {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.classList.add('hidden');
        }
    }

    // Check if user is already logged in
    checkUser();
}