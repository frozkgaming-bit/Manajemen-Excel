export default function NotFound() {
    return `
        <main class="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            <div class="bg-white border border-slate-200/80 rounded-xl shadow-2xs p-12 text-center">
                <svg class="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-width="2"></path>
                </svg>
                <h1 class="text-2xl font-bold text-slate-900 mb-2">Halaman Tidak Ditemukan</h1>
                <p class="text-slate-500 mb-6">Halaman yang Anda cari tidak ditemukan atau telah dipindahkan.</p>
                <button onclick="window.location.hash = '#/dashboard'" class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 focus:outline-hidden transition shadow-xs" type="button">
                    <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                    </svg>
                    Kembali ke Dashboard
                </button>
            </div>
        </main>
    `;
}