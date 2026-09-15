// Contoh fungsi kirim ke Backend Vercel
async function sendToBackend(endpoint, dataArray) {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataList: dataArray })
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
        alert(result.message);
    } catch (err) {
        alert("Gagal menyimpan ke server: " + err.message);
    }
}