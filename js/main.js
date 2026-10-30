import { initClock } from './clock.js';
import { initQuotes } from './quotes.js';
import { initTodo } from './todo.js';
import { initTabs, repairOrphanedBookmarks } from './tabs.js';
import { initShortcuts } from './shortcuts.js';
import { getItems, onStorageChange } from './storage.js';

const AI_URL = 'https://chatgpt.com';

function applyTheme(mode) {
    document.body.classList.toggle('light-mode', mode === 'light');
}

function applyWallpaper(dataUrl) {
    const bgLayer = document.getElementById('bg-layer');
    if (!bgLayer) return;
    if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
        bgLayer.style.backgroundImage = `url(${JSON.stringify(dataUrl)})`;
        bgLayer.style.backgroundSize = 'cover';
        bgLayer.style.backgroundPosition = 'center';
        bgLayer.style.backgroundRepeat = 'no-repeat';
    } else {
        bgLayer.style.backgroundImage = 'none';
    }
}

async function initAppearance() {
    const { themeMode, wallpaperData } = await getItems(['themeMode', 'wallpaperData']);
    applyTheme(themeMode);
    applyWallpaper(wallpaperData);
    onStorageChange((changes) => {
        if (changes.themeMode) applyTheme(changes.themeMode.newValue);
        if (changes.wallpaperData) applyWallpaper(changes.wallpaperData.newValue);
    });
}

async function initBookmarks() {
    const { activeTab } = await getItems(['activeTab']);
    // Categories must load first so bookmarks can be checked against them.
    const active = await initTabs(activeTab || 'bookmarks');
    await initShortcuts(active);
    repairOrphanedBookmarks();
}

function initAiButton() {
    const aiBtn = document.getElementById('ai-btn');
    if (!aiBtn) return;

    const hasWindows = typeof chrome !== 'undefined' && !!chrome.windows;
    let popupWindowId = null;

    if (hasWindows) {
        chrome.windows.onRemoved.addListener((windowId) => {
            if (windowId === popupWindowId) popupWindowId = null;
        });
    }

    const closePopup = () => {
        if (popupWindowId === null) return;
        const id = popupWindowId;
        popupWindowId = null;
        chrome.windows.remove(id).catch(() => {});
    };

    aiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!hasWindows) {
            window.open(AI_URL, 'ChatGPT', 'width=400,height=600,noopener');
            return;
        }
        if (popupWindowId !== null) {
            closePopup();
            return;
        }

        const width = 400;
        const height = 600;
        const btnRect = aiBtn.getBoundingClientRect();
        const left = Math.round(window.screenX + btnRect.left - width - 20);
        const top = Math.round(window.screenY + (window.outerHeight - window.innerHeight) + btnRect.bottom - height);

        chrome.windows.create({ url: AI_URL, type: 'popup', width, height, left, top }, (win) => {
            if (win) popupWindowId = win.id;
        });
    });

    aiBtn.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('click', closePopup);
}

document.addEventListener('DOMContentLoaded', () => {
    initAppearance();
    initClock();
    initQuotes();
    initTodo();
    initBookmarks();
    initAiButton();
});
