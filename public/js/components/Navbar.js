export default function Navbar({ onLogout }) {
    return `
        <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <!-- Brand Logo and App Status -->
                <div class="flex items-center space-x-4">
                    <div class="flex-shrink-0 flex items-center">
                        <svg class="h-9 w-auto" fill="none" viewBox="0 0 200 48" xmlns="http://www.w3.org/2000/svg">
                            <rect fill="#2563EB" height="36" rx="10" width="36" x="2" y="6"></rect>
                            <path d="M12 24L18 16H28L22 24L28 32H18L12 24Z" fill="white" fill-opacity="0.9"></path>
                            <circle cx="20" cy="24" fill="#60A5FA" r="3"></circle>
                            <text fill="#0F172A" font-family="'Plus Jakarta Sans', sans-serif" font-size="18" font-weight="700" letter-spacing="-0.5" x="48" y="27">BOS <tspan fill="#2563EB">EDS</tspan></text>
                            <text fill="#64748B" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" font-weight="600" letter-spacing="1.2" x="48" y="38">SISTEM DATA PERTANAHAN</text>
                        </svg>
                    </div>
                    <div class="hidden md:flex items-center space-x-2 pl-4 border-l border-slate-200">
                        <h1 class="text-sm font-semibold text-slate-800 tracking-tight">DATA EXCEL BOS EDS</h1>
                        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span class="w-1.5 h-1.5 mr-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Online Database
                        </span>
                    </div>
                </div>
                <!-- User Profile & Action -->
                <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                            AD
                        </div>
                        <div class="hidden sm:block text-left">
                            <p class="text-xs font-semibold text-slate-900 leading-tight">Admin Sistem</p>
                            <p class="text-[11px] text-slate-500 leading-tight">Petugas Validasi</p>
                        </div>
                    </div>
                    <button id="btnLogout" class="inline-flex items-center px-3 py-1.5 border border-slate-200 text-xs font-medium rounded-lg text-slate-700 bg-white hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-2xs" type="button">
                        <svg class="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                        </svg>
                        Logout
                    </button>
                </div>
            </div>
        </header>
    `;
}

export function initNavbar(onLogout) {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout && onLogout) {
        btnLogout.addEventListener('click', onLogout);
    }
}