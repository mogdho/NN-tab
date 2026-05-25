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

    // Wallpaper Logic
    const wallpaperFile = document.getElementById('wallpaper-file');
    const wallpaperRemove = document.getElementById('wallpaper-remove');
    const wallpaperPreview = document.getElementById('wallpaper-preview');
    const wallpaperIcon = document.getElementById('wallpaper-icon');

    function updateWallpaperPreview(dataUrl) {
        if (dataUrl) {
            wallpaperPreview.style.backgroundImage = `url(${dataUrl})`;
            if (wallpaperIcon) wallpaperIcon.style.display = 'none';
            if (wallpaperRemove) wallpaperRemove.style.display = 'flex';
        } else {
            wallpaperPreview.style.backgroundImage = 'none';
            if (wallpaperIcon) wallpaperIcon.style.display = 'block';
            if (wallpaperRemove) wallpaperRemove.style.display = 'none';
        }
    }

    if (chrome && chrome.storage) {
        chrome.storage.local.get(['wallpaperData'], (res) => {
            updateWallpaperPreview(res.wallpaperData);
        });
    }

    if (wallpaperFile) {
        wallpaperFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    const MAX_WIDTH = 1920;
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    const dataUrl = canvas.toDataURL('image/webp', 0.85);
                    
                    if (chrome && chrome.storage) {
                        chrome.storage.local.set({ wallpaperData: dataUrl }, () => {
                            updateWallpaperPreview(dataUrl);
                            showStatus('Wallpaper set!', 'success');
                        });
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
            wallpaperFile.value = ''; // reset
        });
    }

    if (wallpaperRemove) {
        wallpaperRemove.addEventListener('click', () => {
            if (chrome && chrome.storage) {
                chrome.storage.local.remove(['wallpaperData'], () => {
                    updateWallpaperPreview(null);
                    showStatus('Wallpaper removed.', 'success');
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
