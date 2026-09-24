import { supabaseClient } from '../config/supabase.js';

const render = () => {
    return `
        <!-- Login Sistem - BOS EDS (Redesigned) -->
        <main class="relative z-10 flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 min-h-screen">
            <div class="w-full max-w-[440px]" data-purpose="login-card-wrapper">
                <div class="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] p-8 sm:p-10 transition-all duration-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                    <header class="flex flex-col items-center text-center mb-8">
                        <div class="mb-5 flex justify-center items-center h-12" data-purpose="brand-logo">
                            <svg aria-label="BOS EDS Logo" class="h-10 w-auto" fill="none" role="img" viewBox="0 0 200 48" xmlns="http://www.w3.org/2000/svg">
                                <rect fill="#2563EB" height="36" rx="10" width="36" x="2" y="6"></rect>
                                <path d="M12 24L18 16H28L22 24L28 32H18L12 24Z" fill="white" fill-opacity="0.9"></path>
                                <circle cx="20" cy="24" fill="#60A5FA" r="3"></circle>
                                <text fill="#0F172A" font-family="'Plus Jakarta Sans', sans-serif" font-size="18" font-weight="700" letter-spacing="-0.5" x="48" y="27">BOS <tspan fill="#2563EB">EDS</tspan></text>
                                <text fill="#64748B" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" letter-spacing="1.2" x="48" y="38">SISTEM DATA PERTANAHAN</text>
                            </svg>
                        </div>
                        <h1 class="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">Login Sistem</h1>
                        <p class="text-xs text-slate-500 max-w-xs leading-relaxed">
                            Silakan masuk untuk mengakses Sistem Data Pertanahan BOS EDS
                        </p>
                    </header>
                    <form action="#" class="space-y-5" method="POST" id="loginForm">
                        <div data-purpose="input-group-username">
                            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5" for="loginUsername">Username</label>
                            <div class="relative rounded-lg shadow-sm">
                                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path d="M15.75 6a3.75 3.75 0 11-7.0 0 3.75 3.75 0 017.0 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" stroke-linecap="round" stroke-linejoin="round"></path>
                                    </svg>
                                </div>
                                <input class="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/60 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors" id="loginUsername" name="username" placeholder="Masukkan username Anda" required="" type="text" value="admin">
                            </div>
                        </div>
                        <div data-purpose="input-group-password">
                            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5" for="loginPassword">Password</label>
                            <div class="relative rounded-lg shadow-sm">
                                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                    <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                        <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" stroke-linecap="round" stroke-linejoin="round"></path>
                                    </svg>
                                </div>
                                <input class="block w-full pl-10 pr-10 py-2.5 bg-slate-50/60 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors" id="loginPassword" name="password" placeholder="Masukkan password Anda" required="" type="password" value="admin123">
                                <button type="button" id="togglePassword" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors" tabindex="-1">
                                    <svg class="h-4 w-4 eye-open" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" stroke-linecap="round" stroke-linejoin="round"></path><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                                    <svg class="h-4 w-4 eye-closed hidden" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                                </button>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-1">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input class="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500" id="rememberMe" name="rememberMe" type="checkbox">
                                <span class="text-xs text-slate-600">Ingat saya</span>
                            </label>
                            <a href="#" class="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">Lupa Password?</a>
                        </div>
                        <button class="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 transition-all duration-200" id="btnLogin" type="submit">
                            <span class="">Masuk ke Sistem</span>
                            <svg class="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                        </button>
                    </form>
                    <div id="loginError" class="hidden mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium" role="alert"></div>
                    <div class="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400">
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.277a.75.75 0 01-1.06-1.06l2.5-3.062a.75.75 0 10-1.06-1.06l-3.5 3.5a.75.75 0 11-1.06-1.06l2.5-3.5a.75.75 0 00-1.06-1.06l-3 4a.75.75 0 01-1.06 0z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-xs text-slate-500">Data terenkripsi & aman</span>
                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L12.586 10l-2.293 2.293a1 1 0 101.414 1.414l3 3a1 1 0 001.414-1.414z" clip-rule="evenodd"></path>
                        </svg>
                        <span class="text-xs text-slate-500">Server Indonesia (ID)</span>
                    </div>
                </div>
            </div>
        </main>
    `;
};

const init = () => {
    const toggleBtn = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('loginPassword');
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleBtn.querySelector('.eye-open').classList.toggle('hidden', isPassword);
            toggleBtn.querySelector('.eye-closed').classList.toggle('hidden', !isPassword);
        });
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnLogin = document.getElementById('btnLogin');
            const loginError = document.getElementById('loginError');
            const usernameEl = document.getElementById('loginUsername');
            const passwordEl = document.getElementById('loginPassword');

            if (!usernameEl.value.trim() || !passwordEl.value) {
                showLoginError('Username dan password harus diisi');
                return;
            }

            const email = `${usernameEl.value.trim()}@admin.sistem`;
            const password = passwordEl.value;

            if (loginError) loginError.classList.add('hidden');
            btnLogin.innerText = "Loading...";
            btnLogin.disabled = true;

            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

            btnLogin.innerText = "Masuk ke Sistem";
            btnLogin.disabled = false;

            if (error) {
                showLoginError(error.message);
            } else {
                window.location.hash = '#/dashboard';
            }
        });
    }

    function showLoginError(message) {
        const loginError = document.getElementById('loginError');
        if (loginError) {
            loginError.textContent = message;
            loginError.classList.remove('hidden');
        }
    }
};

export default { render, init };