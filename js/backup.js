function loadTheme() {
    if (chrome && chrome.storage) {
        chrome.storage.local.get(['themeMode'], (res) => {
            const isLight = res.themeMode === 'light';
            document.body.classList.toggle('light-mode', isLight);
            
            const toggle = document.getElementById('theme-toggle');
            const icon = document.getElementById('theme-icon');
            const label = document.getElementById('theme-label');

            if (toggle) toggle.checked = isLight;
            if (icon)  icon.textContent = isLight ? 'light_mode' : 'dark_mode';
            if (label) label.textContent = isLight ? 'Light Mode' : 'Dark Mode';
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadTheme();

    // Theme Toggle (checkbox switch)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            if (chrome && chrome.storage) {
                const newMode = themeToggle.checked ? 'light' : 'dark';
                chrome.storage.local.set({ themeMode: newMode }, () => {
                    loadTheme();
                });
            }
        });
    }

    // Export Data
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (chrome && chrome.storage) {
                chrome.storage.local.get(null, (items) => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(items, null, 2));
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", dataStr);
                    downloadAnchorNode.setAttribute("download", "nn_tab_backup.json");
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                    
                    showStatus('Export successful!', 'success');
                });
            }
        });
    }

    // Import Data
    const importFileInput = document.getElementById('import-file');
    if (importFileInput) {
        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (chrome && chrome.storage) {
                        chrome.storage.local.clear(() => {
                            chrome.storage.local.set(data, () => {
                                showStatus('Import successful! Data restored.', 'success');
                                loadTheme();
                            });
                        });
                    }
                } catch(err) {
                    showStatus('Invalid JSON file.', 'error');
                }
            };
            reader.readAsText(file);
            // Reset input so the same file can be re-imported
            importFileInput.value = '';
        });
    }
});

function showStatus(message, type) {
    const status = document.getElementById('status-msg');
    if (!status) return;
    status.textContent = message;
    status.className = 'status-msg ' + type;
    setTimeout(() => {
        status.textContent = '';
        status.className = 'status-msg';
    }, 3000);
}
