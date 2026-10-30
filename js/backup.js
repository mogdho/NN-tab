import { hasOnlineIconAccess, requestOnlineIconAccess, revokeOnlineIconAccess } from './icons.js';

// ── Backup format ──
// Only these keys are imported, and each value must pass its check, so a
// wrong or hand-edited file can't put broken data into storage.
const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isImageDataUrl = (v) => typeof v === 'string' && v.startsWith('data:image/');

const BACKUP_SCHEMA = {
    themeMode: (v) => v === 'light' || v === 'dark',
    wallpaperData: isImageDataUrl,
    activeTab: (v) => typeof v === 'string',
    userQuote: (v) => isObject(v) && typeof v.text === 'string' && typeof v.author === 'string',
    todos: (v) => Array.isArray(v) && v.every(t => typeof t === 'string'),
    categories: (v) => Array.isArray(v) && v.length > 0 &&
        v.every(c => isObject(c) && typeof c.id === 'string' && typeof c.label === 'string'),
    shortcutsData: (v) => Array.isArray(v) && v.every(s =>
        isObject(s) &&
        typeof s.id === 'string' &&
        typeof s.name === 'string' &&
        typeof s.url === 'string' && /^https?:\/\//i.test(s.url) &&
        (s.iconData == null || isImageDataUrl(s.iconData)))
};

function validateBackup(raw) {
    if (!isObject(raw)) throw new Error('This file is not an NN Tab backup.');
    const data = {};
    const rejected = [];
    for (const [key, check] of Object.entries(BACKUP_SCHEMA)) {
        if (!(key in raw)) continue;
        if (check(raw[key])) data[key] = raw[key];
        else rejected.push(key);
    }
    if (Object.keys(data).length === 0) throw new Error('No NN Tab data found in this file.');
    return { data, rejected };
}

function describeBackup(data) {
    const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
    const parts = [];
    if (data.shortcutsData) parts.push(count(data.shortcutsData.length, 'bookmark', 'bookmarks'));
    if (data.categories) parts.push(count(data.categories.filter(c => c.id !== 'all').length, 'category', 'categories'));
    if (data.todos) parts.push(count(data.todos.length, 'note', 'notes'));
    if (data.wallpaperData) parts.push('a wallpaper');
    return parts.length ? parts.join(', ') : 'settings';
}

// ── UI ──
function showStatus(message, type) {
    const status = document.getElementById('status-msg');
    if (!status) return;
    status.textContent = message;
    status.className = 'status-msg ' + type;
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => {
        status.textContent = '';
        status.className = 'status-msg';
    }, 4000);
}

async function loadTheme() {
    const { themeMode } = await chrome.storage.local.get(['themeMode']);
    const isLight = themeMode === 'light';
    document.body.classList.toggle('light-mode', isLight);
    document.getElementById('theme-toggle').checked = isLight;
    document.getElementById('theme-icon').textContent = isLight ? 'light_mode' : 'dark_mode';
    document.getElementById('theme-label').textContent = isLight ? 'Light Mode' : 'Dark Mode';
}

function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('change', async () => {
        await chrome.storage.local.set({ themeMode: themeToggle.checked ? 'light' : 'dark' });
        loadTheme();
    });
    loadTheme();
}

async function initOnlineIcons() {
    const toggle = document.getElementById('online-icons-toggle');
    toggle.checked = await hasOnlineIconAccess();

    toggle.addEventListener('change', async () => {
        if (toggle.checked) {
            // The change event is the user gesture Chrome requires for the prompt.
            const granted = await requestOnlineIconAccess();
            toggle.checked = granted;
            showStatus(granted ? 'Online icon lookup on.' : 'Online icon lookup stays off.', granted ? 'success' : 'error');
        } else {
            await revokeOnlineIconAccess();
            showStatus('Online icon lookup off. Saved icons are kept.', 'success');
        }
    });
}

function initWallpaper() {
    const wallpaperFile = document.getElementById('wallpaper-file');
    const wallpaperRemove = document.getElementById('wallpaper-remove');
    const wallpaperPreview = document.getElementById('wallpaper-preview');
    const wallpaperIcon = document.getElementById('wallpaper-icon');

    function updatePreview(dataUrl) {
        const has = isImageDataUrl(dataUrl);
        wallpaperPreview.style.backgroundImage = has ? `url(${JSON.stringify(dataUrl)})` : 'none';
        wallpaperIcon.style.display = has ? 'none' : 'block';
        wallpaperRemove.style.display = has ? 'flex' : 'none';
    }

    chrome.storage.local.get(['wallpaperData']).then(res => updatePreview(res.wallpaperData));

    wallpaperFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        wallpaperFile.value = '';
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = async () => {
            const MAX_WIDTH = 1920;
            let { width, height } = img;
            if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(objectUrl);

            const dataUrl = canvas.toDataURL('image/webp', 0.85);
            await chrome.storage.local.set({ wallpaperData: dataUrl });
            updatePreview(dataUrl);
            showStatus('Wallpaper set!', 'success');
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            showStatus('That file could not be read as an image.', 'error');
        };
        img.src = objectUrl;
    });

    wallpaperRemove.addEventListener('click', async () => {
        await chrome.storage.local.remove(['wallpaperData']);
        updatePreview(null);
        showStatus('Wallpaper removed.', 'success');
    });
}

function initBackup() {
    const exportBtn = document.getElementById('export-btn');
    const importFileInput = document.getElementById('import-file');
    const confirmBox = document.getElementById('import-confirm');
    const summary = document.getElementById('import-summary');
    let pendingImport = null;

    exportBtn.addEventListener('click', async () => {
        const all = await chrome.storage.local.get(Object.keys(BACKUP_SCHEMA));
        const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nn_tab_backup.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showStatus('Export successful!', 'success');
    });

    importFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        importFileInput.value = ''; // allow re-importing the same file
        if (!file) return;

        try {
            const { data, rejected } = validateBackup(JSON.parse(await file.text()));
            pendingImport = data;
            summary.textContent =
                `Replace your current data with ${describeBackup(data)} from "${file.name}"?` +
                (rejected.length ? ` Skipping invalid parts: ${rejected.join(', ')}.` : '');
            confirmBox.hidden = false;
        } catch (err) {
            pendingImport = null;
            confirmBox.hidden = true;
            showStatus(err instanceof SyntaxError ? 'Invalid JSON file.' : err.message, 'error');
        }
    });

    document.getElementById('import-cancel').addEventListener('click', () => {
        pendingImport = null;
        confirmBox.hidden = true;
    });

    document.getElementById('import-apply').addEventListener('click', async () => {
        if (!pendingImport) return;
        const data = pendingImport;
        pendingImport = null;
        confirmBox.hidden = true;

        // Write the new data first, then drop NN Tab keys the backup didn't
        // include. Storage is never left empty partway through.
        await chrome.storage.local.set(data);
        const missing = Object.keys(BACKUP_SCHEMA).filter(k => !(k in data));
        if (missing.length) await chrome.storage.local.remove(missing);

        showStatus('Import successful! Open a new tab to see it.', 'success');
        loadTheme();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initOnlineIcons();
    initWallpaper();
    initBackup();
});
