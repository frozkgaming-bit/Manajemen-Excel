import { supabaseClient } from '../config/supabase.js';
import { fetchServerCounts } from './stats.js';

export async function initAuth() {
    const loginSection = document.getElementById('loginSection');
    const appSection = document.getElementById('appSection');
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    const loginError = document.getElementById('loginError');

    async function checkUser() {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            loginSection.style.display = 'none';
            appSection.style.display = 'block';
            fetchServerCounts();
        } else {
            loginSection.style.display = 'block';
            appSection.style.display = 'none';
        }
    }

    btnLogin.addEventListener('click', async () => {
        const usernameInput = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const email = `${usernameInput}@admin.sistem`;
        
        loginError.style.display = 'none';
        btnLogin.innerText = "Loading...";
        
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        
        btnLogin.innerText = "Login";
        if (error) {
            loginError.innerText = "Error Supabase: " + error.message;
            loginError.style.display = 'block';
        } else {
            checkUser();
        }
    });

    btnLogout.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        checkUser();
    });

    checkUser();
}
