import { supabaseClient } from '../config/supabase.js';

const render = () => {
    return `
        <!-- Login Sistem - BOS EDS (Redesigned) -->
        <main class="relative z-10 flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 min-h-screen">
            <div class="w-full max-w-[440px]" data-purpose="login-card-wrapper">
                <div class="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/90 shadow-[0_20px_50px_rgba(15,23,42,0.08)] p-8 sm:p-10 transition-all duration-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
                    <header class="flex flex-col items-center text-center mb-8">
                        <div class="mb-5 flex justify-center items-center h-12">
                            <svg class="h-12 w-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="48" height="48" rx="12" fill="#16A34A"/>
                                <rect x="12" y="9" width="24" height="30" rx="2.5" fill="white" fill-opacity="0.9"/>
                                <line x1="12" y1="16" x2="36" y2="16" stroke="#16A34A" stroke-width="1.5"/>
                                <line x1="12" y1="23" x2="36" y2="23" stroke="#16A34A" stroke-width="1.5"/>
                                <line x1="12" y1="30" x2="36" y2="30" stroke="#16A34A" stroke-width="1.5"/>
                                <line x1="20" y1="9" x2="20" y2="39" stroke="#16A34A" stroke-width="1.5"/>
                                <line x1="28" y1="9" x2="28" y2="39" stroke="#16A34A" stroke-width="1.5"/>
                                <text x="13" y="14" fill="#16A34A" font-size="4.5" font-weight="700" font-family="sans-serif">A1</text>
                            </svg>
                        </div>
                        <h1 class="text-2xl font-bold tracking-tight text-slate-900 mb-1.5">Sistem Manajemen Data Excel</h1>
                        <p class="text-xs text-slate-500 max-w-xs leading-relaxed">
                            Silakan masuk untuk mengakses sistem
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
                                <input class="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/60 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors" id="loginUsername" name="username" placeholder="Masukkan username Anda" required="" type="text">
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
                                <input class="block w-full pl-10 pr-3.5 py-2.5 bg-slate-50/60 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors" id="loginPassword" name="password" placeholder="Masukkan password Anda" required="" type="password">
                            </div>
                        </div>
                        <button class="w-full mt-2 inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 transition-all duration-200" id="btnLogin" type="submit">
                            <span class="">Masuk ke Sistem</span>
                            <svg class="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" stroke-linecap="round" stroke-linejoin="round"></path>
                            </svg>
                        </button>
                    </form>
                    <div id="loginError" class="hidden mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium" role="alert"></div>
                </div>
            </div>
        </main>
    `;
};

const init = () => {
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