// public/js/modules/progress.js
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
        if (percentEl) percentEl.textContent = `${percent}%`;
    }
}

export function updateProgress(percent, text) {
    const barEl = document.getElementById('progressBar');
    const textEl = document.getElementById('progressText');
    const percentEl = document.getElementById('progressPercent');
    
    if (barEl) barEl.style.width = `${percent}%`;
    if (textEl) textEl.innerText = text;
    if (percentEl) percentEl.textContent = `${percent}%`;
}

export function hideProgress() {
    const modal = document.getElementById('progressModal');
    if (modal) modal.style.display = 'none';
}