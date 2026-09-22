export function ProgressToast() {
    return `
        <aside id="progressModal" class="fixed bottom-5 right-5 z-40 max-w-sm w-full bg-white border border-slate-200 rounded-xl shadow-lg p-4 transition-all duration-300" style="display: none;">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 mb-2.5">
                <div class="flex items-center space-x-2">
                    <span class="flex h-2 w-2 relative">
                        <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                        <span class="relative inline-flex rounded-full h-2 w-2 bg-brand-600"></span>
                    </span>
                    <h4 id="progressTitle" class="text-xs font-bold text-slate-800">Memproses Data...</h4>
                </div>
                <button aria-label="Minimize" class="text-slate-400 hover:text-slate-600 p-0.5" type="button">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                    </svg>
                </button>
            </div>
            <div class="space-y-1.5">
                <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div id="progressBar" class="bg-brand-600 h-2 rounded-full transition-all duration-500 ease-out" style="width: 0%;"></div>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-500">
                    <span id="progressText" class="">Menyiapkan data...</span>
                    <span id="progressPercent" class="font-semibold text-brand-600">0%</span>
                </div>
            </div>
        </aside>
    `;
}

export function showProgress(title, percent = 0, text = "") {
    const modal = document.getElementById('progressModal');
    const titleEl = document.getElementById('progressTitle');
    const barEl = document.getElementById('progressBar');
    const textEl = document.getElementById('progressText');
    const percentEl = document.getElementById('progressPercent');

    if (modal) {
        modal.style.display = 'block';
        if (titleEl) titleEl.innerText = title;
        if (barEl) barEl.style.width = `${percent}%`;
        if (textEl) textEl.innerText = text;
    }
}

export function updateProgress(percent, text) {
    const barEl = document.getElementById('progressBar');
    const textEl = document.getElementById('progressText');
    
    if (barEl) barEl.style.width = `${percent}%`;
    if (textEl) textEl.innerText = text;
}

export function hideProgress() {
    const modal = document.getElementById('progressModal');
    if (modal) modal.style.display = 'none';
}