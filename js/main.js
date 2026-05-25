import { initClock } from './clock.js';
import { initQuotes } from './quotes.js';
import { initTodo } from './todo.js';
import { initTabs } from './tabs.js';
import { initShortcuts } from './shortcuts.js';

document.addEventListener('DOMContentLoaded', () => {
    // Theme & Wallpaper Loading Logic
    if (chrome && chrome.storage) {
        chrome.storage.local.get(['themeMode', 'wallpaperData'], (res) => {
            if (res.themeMode === 'light') document.body.classList.add('light-mode');
            if (res.wallpaperData) {
                const bgLayer = document.getElementById('bg-layer');
                if (bgLayer) {
                    bgLayer.style.backgroundImage = `url(${res.wallpaperData})`;
                    bgLayer.style.backgroundSize = 'cover';
                    bgLayer.style.backgroundPosition = 'center';
                    bgLayer.style.backgroundRepeat = 'no-repeat';
                }
            }
        });
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                if (changes.themeMode) {
                    if (changes.themeMode.newValue === 'light') {
                        document.body.classList.add('light-mode');
                    } else {
                        document.body.classList.remove('light-mode');
                    }
                }
                if (changes.wallpaperData) {
                    const bgLayer = document.getElementById('bg-layer');
                    if (bgLayer) {
                        if (changes.wallpaperData.newValue) {
                            bgLayer.style.backgroundImage = `url(${changes.wallpaperData.newValue})`;
                            bgLayer.style.backgroundSize = 'cover';
                            bgLayer.style.backgroundPosition = 'center';
                            bgLayer.style.backgroundRepeat = 'no-repeat';
                        } else {
                            bgLayer.style.backgroundImage = 'none';
                        }
                    }
                }
            }
        });
    }

    initClock();
    initQuotes();
    initTodo();
    
    // Fetch active tab first, then initialize both tabs and shortcuts
    if (chrome && chrome.storage) {
        chrome.storage.local.get(['activeTab'], (result) => {
            const active = result.activeTab || 'bookmarks';
            initTabs(active);
            initShortcuts(active);
        });
    } else {
        const active = localStorage.getItem('activeTab') || 'bookmarks';
        initTabs(active);
        initShortcuts(active);
    }

    // AI Chat Window Logic
    const aiBtn = document.getElementById('ai-btn');
    let popupWindowId = null;

    if (aiBtn) {
        if (chrome && chrome.windows) {
            chrome.windows.onRemoved.addListener((windowId) => {
                if (windowId === popupWindowId) {
                    popupWindowId = null;
                }
            });
        }

        aiBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (chrome && chrome.windows) {
                if (popupWindowId !== null) {
                    chrome.windows.remove(popupWindowId, () => {
                        popupWindowId = null;
                    });
                    return;
                }

                const width = 400;
                const height = 600;
                const btnRect = aiBtn.getBoundingClientRect();
                
                const screenX = window.screenX || window.screenLeft;
                const screenY = window.screenY || window.screenTop;
                
                const popupLeft = Math.round(screenX + btnRect.left - width - 20);
                const popupTop = Math.round(screenY + (window.outerHeight - window.innerHeight) + btnRect.bottom - height);

                chrome.windows.create({
                    url: 'https://chatgpt.com',
                    type: 'popup',
                    width: width,
                    height: height,
                    left: popupLeft,
                    top: popupTop
                }, (win) => {
                    popupWindowId = win.id;
                });
            } else {
                window.open('https://chatgpt.com', 'ChatGPT', 'width=400,height=600');
            }
        });

        aiBtn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        document.addEventListener('click', () => {
            if (popupWindowId !== null && chrome && chrome.windows) {
                chrome.windows.remove(popupWindowId, () => {
                    popupWindowId = null;
                });
            }
        });
    }
});
