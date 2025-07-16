// Salva le opzioni in chrome.storage
function saveOptions() {
    const hourlyCost = document.getElementById('hourlyCost').value;
    chrome.storage.sync.set(
        { hourlyCost: parseFloat(hourlyCost) },
        () => {
            // Mostra un messaggio di conferma
            const status = document.getElementById('status');
            status.textContent = 'Impostazioni salvate.';
            setTimeout(() => {
                status.textContent = '';
            }, 1500);
        }
    );
}

// Carica le opzioni salvate
function restoreOptions() {
    // Usa 50 come valore predefinito
    chrome.storage.sync.get({ hourlyCost: 50 }, (items) => {
        document.getElementById('hourlyCost').value = items.hourlyCost;
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);