import { getCategories, updateCategorySelectInBookmarkModal } from './tabs.js';
import { showToast } from './toast.js';

const FALLBACK_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cpath fill='%238e9192' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'/%3E%3C/svg%3E`;

async function resizeBase64(base64) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            const scale = Math.min(64 / img.width, 64 / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (64 - w) / 2;
            const y = (64 - h) / 2;
            
            ctx.drawImage(img, x, y, w, h);
            resolve(canvas.toDataURL('image/webp', 0.8));
        };
        img.onerror = () => resolve(base64); 
        img.src = base64;
    });
}

// Known high-res icon URLs for subdomains that generic APIs misresolve.
// These are direct gstatic/CDN links to the actual product icons.
const SUBDOMAIN_ICON_OVERRIDES = {
    // Google Workspace & Products
    'docs.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/docs_2020q4_48dp.png',
        'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico'
    ],
    'sheets.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png',
        'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico'
    ],
    'slides.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/slides_2020q4_48dp.png',
        'https://ssl.gstatic.com/docs/presentations/images/favicon5.ico'
    ],
    'drive.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png',
        'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png'
    ],
    'keep.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/keep_2020q4_48dp.png'
    ],
    'calendar.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png',
        'https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_31.ico'
    ],
    'meet.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/meet_2020q4_48dp.png'
    ],
    'maps.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/maps_2020q4_48dp.png'
    ],
    'photos.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/photos_2020q4_48dp.png'
    ],
    'translate.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/translate_2020q4_48dp.png'
    ],
    'forms.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/forms_2020q4_48dp.png'
    ],
    'classroom.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/classroom_2020q4_48dp.png'
    ],
    'chat.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/chat_2020q4_48dp.png'
    ],
    'contacts.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/contacts_2020q4_48dp.png'
    ],
    'earth.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/earth_2020q4_48dp.png'
    ],
    'news.google.com': [
        'https://www.gstatic.com/images/branding/product/2x/googlenews_2020q4_48dp.png'
    ],
    // Other common subdomains
    'music.youtube.com': [
        'https://www.gstatic.com/youtube/media/ytm/images/applauncher/music_icon_144x144.png'
    ],
    'studio.youtube.com': [
        'https://www.gstatic.com/youtube/img/creator/favicon/favicon_144.png'
    ]
};

// Universal unified cascade resolver
async function getNextWorkingIcon(targetUrl, startIndex = 0) {
    let urlObj;
    try { 
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = 'https://' + targetUrl;
        }
        urlObj = new URL(targetUrl); 
    } catch(e) { return null; }
    
    const domain = urlObj.hostname;
    const origin = urlObj.origin;

    let urlsToTry = [];
    const cleanDomain = domain.replace(/^www\./, '');
    const POPULAR_DOMAINS = [
        'youtube.com', 'facebook.com', 'amazon.com', 'wikipedia.org', 
        'instagram.com', 'pinterest.com', 'tiktok.com', 'linkedin.com', 
        'github.com', 'notion.so', 'aliexpress.com', 'canva.com', 
        'booking.com', 'twitter.com', 'x.com', 'reddit.com', 'netflix.com',
        'discord.com', 'twitch.tv', 'spotify.com'
    ];

    // The Mega-Cascade: A massive collection of icon APIs
    const apis = [
        `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(origin)}&size=128`, // 0: Google HD
        `https://logo.clearbit.com/${cleanDomain}`, // 1: Clearbit
        `https://unavatar.io/${cleanDomain}?fallback=false`, // 2: Unavatar (Aggregator)
        `https://api.faviconkit.com/${cleanDomain}/144`, // 3: FaviconKit
        `https://icons.duckduckgo.com/ip3/${cleanDomain}.ico`, // 4: DuckDuckGo
        `https://icon.horse/icon/${cleanDomain}`, // 5: Icon.horse
        `${origin}/apple-touch-icon.png`, // 6: Native Root
        `${origin}/apple-touch-icon-precomposed.png`, // 7: Native Root Precomposed
        `${origin}/favicon.ico` // 8: Native Root ICO
    ];

    // Check for subdomain icon overrides first
    const overrideUrls = SUBDOMAIN_ICON_OVERRIDES[cleanDomain] || [];

    if (overrideUrls.length > 0) {
        // Subdomain with known icons: overrides first, then Google HD, then generic cascade
        urlsToTry = [ ...overrideUrls, apis[0], apis[6], apis[8], apis[4], apis[5] ];
    } else if (POPULAR_DOMAINS.includes(cleanDomain)) {
        // Prioritize Google HD for giants to ensure square app icons
        urlsToTry = [ apis[0], apis[6], apis[1], apis[2], apis[3], apis[4], apis[5], apis[8] ];
    } else {
        // Prioritize native and direct APIs for random sites
        urlsToTry = [ apis[6], apis[1], apis[7], apis[2], apis[4], apis[3], apis[5], apis[8], apis[0] ];
    }
    
    startIndex = startIndex || 0;
    if (startIndex >= urlsToTry.length) startIndex = 0;
    
    const activeUrls = urlsToTry.slice(startIndex);
    let bgWorkerAvailable = false;
    let bgWorkerFailed = true;

    for (let i = 0; i < activeUrls.length; i++) {
        const url = activeUrls[i];
        const actualIndex = startIndex + i;
        
        if (chrome && chrome.runtime) {
            const response = await new Promise(resolve => {
                chrome.runtime.sendMessage({ action: 'fetchIcon', url: url }, res => {
                    if (chrome.runtime.lastError) {
                        resolve(null);
                    } else {
                        bgWorkerAvailable = true;
                        resolve(res);
                    }
                });
            });

            if (response && response.base64) {
                bgWorkerFailed = false;
                const resized = await resizeBase64(response.base64);
                return { type: 'data', value: resized, index: actualIndex };
            }
        }
    }

    if (!bgWorkerAvailable || bgWorkerFailed) {
        for (let i = 0; i < activeUrls.length; i++) {
            const url = activeUrls[i];
            const actualIndex = startIndex + i;
            
            const nativeResponse = await new Promise(resolve => {
                const tester = new Image();
                tester.onload = () => resolve({ type: 'url', value: tester.src, index: actualIndex });
                tester.onerror = () => resolve(null);
                tester.src = url;
            });
            if (nativeResponse) return nativeResponse;
        }
    }
    
    return null;
}

// Resolves and saves icon as Base64 iconData — never as an external URL.
// Called for shortcuts with no cached icon yet.
async function resolveFaviconUrl(shortcut) {
    if (shortcut.iconData && !shortcut.iconData.startsWith('data:image/svg+xml')) return;

    const result = await getNextWorkingIcon(shortcut.url, shortcut.iconSourceIndex || 0);
    let finalData;

    if (result) {
        shortcut.iconSourceIndex = result.index;
        if (result.type === 'data') {
            // Already Base64 from background worker — use directly
            finalData = result.value;
        } else {
            // URL result — convert to Base64 via canvas
            finalData = await urlToBase64(result.value);
        }
    }

    shortcut.iconData = finalData || FALLBACK_SVG;
    delete shortcut.iconUrl; // ensure no leftover URL reference

    saveShortcuts();
    const img = document.querySelector(`img.favicon[data-id="${shortcut.id}"]`);
    if (img) applyFaviconToImg(img, shortcut.iconData);
}

// Silently migrates any shortcut that still has a legacy iconUrl to iconData.
// Runs in the background after the page renders — never blocks UI.
async function migrateIconUrls() {
    const stale = shortcutsData.filter(s => s.iconUrl && !s.iconData);
    if (stale.length === 0) return;

    for (const shortcut of stale) {
        const base64 = await urlToBase64(shortcut.iconUrl);
        if (base64) {
            shortcut.iconData = base64;
            delete shortcut.iconUrl;
            const img = document.querySelector(`img.favicon[data-id="${shortcut.id}"]`);
            if (img) applyFaviconToImg(img, base64);
        }
    }
    saveShortcuts();
}

// Converts an external image URL to a Base64 WebP data URI via canvas.
function urlToBase64(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                const scale = Math.min(64 / img.width, 64 / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                ctx.drawImage(img, (64 - w) / 2, (64 - h) / 2, w, h);
                resolve(canvas.toDataURL('image/webp', 0.8));
            } catch (e) {
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
        img.src = url;
    });
}

// Applies a src to an img element with a smooth fade-in.
function applyFaviconToImg(img, src) {
    img.style.opacity = '0';
    img.onload = () => {
        img.style.transition = 'opacity 0.25s ease';
        img.style.opacity = '1';
    };
    img.src = src;
}

let shortcutsData = [];
let currentCategory = 'all';
let draggedShortcutId = null;

const DEFAULT_SHORTCUTS = [
    { id: '1', name: 'YouTube', url: 'https://youtube.com', category: 'social' },
    { id: '2', name: 'Facebook', url: 'https://facebook.com', category: 'social' },
    { id: '3', name: 'AliExpress', url: 'https://aliexpress.com', category: 'bookmarks' },
    { id: '4', name: 'Canva', url: 'https://canva.com', category: 'work' },
    { id: '5', name: 'Booking', url: 'https://booking.com', category: 'bookmarks' },
    { id: '6', name: 'Amazon', url: 'https://amazon.com', category: 'bookmarks' },
    { id: '7', name: 'Twitter', url: 'https://twitter.com', category: 'social' },
    { id: '8', name: 'Wikipedia', url: 'https://wikipedia.org', category: 'bookmarks' },
    { id: '9', name: 'Instagram', url: 'https://instagram.com', category: 'social' },
    { id: '10', name: 'Pinterest', url: 'https://pinterest.com', category: 'social' },
    { id: '11', name: 'TikTok', url: 'https://tiktok.com', category: 'social' },
    { id: '12', name: 'LinkedIn', url: 'https://linkedin.com', category: 'work' },
    { id: '13', name: 'GitHub', url: 'https://github.com', category: 'work' },
    { id: '14', name: 'Notion', url: 'https://notion.so', category: 'work' }
];

export function initShortcuts(initialCategory = 'bookmarks') {
    currentCategory = initialCategory;
    if (chrome && chrome.storage) {
        chrome.storage.local.get(['shortcutsData'], (result) => {
            if (result.shortcutsData) {
                shortcutsData = result.shortcutsData;
            } else {
                shortcutsData = [...DEFAULT_SHORTCUTS];
                chrome.storage.local.set({ shortcutsData });
            }
            renderShortcuts(currentCategory);
            // Non-blocking background migration of any legacy iconUrl entries
            setTimeout(migrateIconUrls, 0);
        });
    } else {
        const stored = localStorage.getItem('shortcutsData');
        if (stored) {
            shortcutsData = JSON.parse(stored);
        } else {
            shortcutsData = [...DEFAULT_SHORTCUTS];
            localStorage.setItem('shortcutsData', JSON.stringify(shortcutsData));
        }
        renderShortcuts(currentCategory);
        setTimeout(migrateIconUrls, 0);
    }
    setupModalHandlers();
}

export function getShortcutsData() {
    return shortcutsData;
}

function saveShortcuts() {
    if (chrome && chrome.storage) {
        chrome.storage.local.set({ shortcutsData });
    } else {
        localStorage.setItem('shortcutsData', JSON.stringify(shortcutsData));
    }
}

export function renderShortcuts(category) {
    if (category) currentCategory = category;
    const grid = document.getElementById('shortcuts-grid');
    grid.innerHTML = '';

    const filtered = shortcutsData.filter(s => currentCategory === 'all' || s.category === currentCategory);
    const fragment = document.createDocumentFragment();

    filtered.forEach(shortcut => {
        const a = document.createElement('a');
        a.className = 'shortcut-item';
        a.href = shortcut.url;
        a.draggable = true;
        
        a.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            openModal(shortcut);
        });

        a.addEventListener('dragstart', (e) => {
            draggedShortcutId = shortcut.id;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', shortcut.id);
            a.classList.add('dragging');
        });
        
        a.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            a.classList.add('drag-over');
        });
        
        a.addEventListener('dragleave', () => {
            a.classList.remove('drag-over');
        });

        a.addEventListener('drop', (e) => {
            e.preventDefault();
            a.classList.remove('drag-over');
            if (!draggedShortcutId || draggedShortcutId === shortcut.id) return;
            
            const fromIndex = shortcutsData.findIndex(s => s.id === draggedShortcutId);
            const toIndex = shortcutsData.findIndex(s => s.id === shortcut.id);
            
            if (fromIndex !== -1 && toIndex !== -1) {
                const [moved] = shortcutsData.splice(fromIndex, 1);
                shortcutsData.splice(toIndex, 0, moved);
                saveShortcuts();
                renderShortcuts();
            }
        });

        a.addEventListener('dragend', () => {
            a.classList.remove('dragging');
            draggedShortcutId = null;
        });
        
        const img = document.createElement('img');
        img.className = 'favicon';
        img.alt = shortcut.name;
        img.dataset.id = shortcut.id;

        if (shortcut.iconData && !shortcut.iconData.startsWith('data:image/svg+xml')) {
            // Cached Base64 — instant, no network, no flicker
            img.src = shortcut.iconData;
            img.style.opacity = '1';
        } else if (shortcut.iconUrl) {
            // Legacy external URL — show it now, migrate to Base64 in background
            img.style.opacity = '0';
            img.onload = () => {
                img.style.transition = 'opacity 0.25s ease';
                img.style.opacity = '1';
            };
            img.src = shortcut.iconUrl;
        } else {
            // No icon at all — show shimmer placeholder, fetch in background
            img.src = FALLBACK_SVG;
            img.style.opacity = '0.3';
            resolveFaviconUrl(shortcut);
        }

        const iconContainer = document.createElement('div');
        iconContainer.className = 'shortcut-icon-container';
        iconContainer.appendChild(img);
        
        const label = document.createElement('span');
        label.className = 'shortcut-label';
        label.textContent = shortcut.name;

        a.appendChild(iconContainer);
        a.appendChild(label);

        fragment.appendChild(a);
    });

    if (filtered.length < 24) {
        const addBtn = document.createElement('button');
        addBtn.className = 'shortcut-item';
        
        addBtn.addEventListener('dragover', (e) => {
            e.preventDefault();
            addBtn.classList.add('drag-over');
        });
        
        addBtn.addEventListener('dragleave', () => {
            addBtn.classList.remove('drag-over');
        });
        
        addBtn.addEventListener('drop', (e) => {
            e.preventDefault();
            addBtn.classList.remove('drag-over');
            if (!draggedShortcutId) return;
            
            const fromIndex = shortcutsData.findIndex(s => s.id === draggedShortcutId);
            if (fromIndex !== -1) {
                const [moved] = shortcutsData.splice(fromIndex, 1);
                const lastFiltered = filtered[filtered.length - 1];
                if (lastFiltered) {
                    const insertIndex = shortcutsData.findIndex(s => s.id === lastFiltered.id);
                    shortcutsData.splice(insertIndex + 1, 0, moved);
                } else {
                    shortcutsData.push(moved);
                }
                saveShortcuts();
                renderShortcuts();
            }
        });

        addBtn.innerHTML = `
            <div class="shortcut-icon-container">
                <span class="material-symbols-outlined" style="font-size: 48px; color: var(--text-secondary); filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">add</span>
            </div>
            <span class="shortcut-label">Add Bookmark</span>
        `;
        addBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(null);
        });
        fragment.appendChild(addBtn);
    }

    grid.appendChild(fragment);
}

// Modal Logic
let editingId = null;
let tempIconResult = null; // Stores { type, value, index } for the modal live preview
let tempUrlValue = '';
let fetchDebounceTimer = null;

let modalHandlersInitialized = false;

function setupModalHandlers() {
    if (modalHandlersInitialized) return;
    modalHandlersInitialized = true;

    document.getElementById('bm-save').addEventListener('click', saveModalData);
    document.getElementById('bm-delete').addEventListener('click', deleteBookmark);
    document.getElementById('bm-change-icon').addEventListener('click', cycleModalIcon);
    
    // Live Icon Preview
    document.getElementById('bm-url').addEventListener('input', (e) => {
        clearTimeout(fetchDebounceTimer);
        fetchDebounceTimer = setTimeout(() => {
            handleUrlChange(e.target.value);
        }, 800);
    });

    document.getElementById('bm-name').addEventListener('input', checkSaveEnable);
    
    // Allow closing modal by clicking the background overlay
    const modalOverlay = document.getElementById('bookmark-modal');
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
}

function showModalSpinner(show) {
    document.getElementById('modal-icon-spinner').style.display = show ? 'block' : 'none';
    document.getElementById('modal-icon-placeholder').style.display = show ? 'none' : 'block';
    if (show) document.getElementById('modal-icon-img').style.display = 'none';
}

function showModalIcon(src) {
    const img = document.getElementById('modal-icon-img');
    const placeholder = document.getElementById('modal-icon-placeholder');
    const spinner = document.getElementById('modal-icon-spinner');
    
    spinner.style.display = 'none';
    if (src) {
        img.src = src;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        img.style.display = 'none';
        placeholder.style.display = 'block';
    }
}

function checkSaveEnable() {
    const name = document.getElementById('bm-name').value.trim();
    const saveBtn = document.getElementById('bm-save');
    if (name && tempIconResult) {
        saveBtn.disabled = false;
    } else {
        saveBtn.disabled = true;
    }
}

async function handleUrlChange(urlValue) {
    urlValue = urlValue.trim();
    if (!urlValue) return;
    
    if (urlValue === tempUrlValue && tempIconResult) return;
    tempUrlValue = urlValue;
    
    showModalSpinner(true);
    document.getElementById('bm-save').disabled = true;
    document.getElementById('bm-change-icon').classList.add('hidden');
    
    const result = await getNextWorkingIcon(urlValue, 0);
    
    if (result) {
        tempIconResult = result;
        showModalIcon(result.value);
        document.getElementById('bm-change-icon').classList.remove('hidden');
    } else {
        tempIconResult = { type: 'data', value: FALLBACK_SVG, index: 0 };
        showModalIcon(FALLBACK_SVG);
    }
    checkSaveEnable();
}

async function cycleModalIcon() {
    if (!tempUrlValue) return;
    
    showModalSpinner(true);
    document.getElementById('bm-save').disabled = true;
    
    let nextIndex = (tempIconResult ? tempIconResult.index + 1 : 0);
    const result = await getNextWorkingIcon(tempUrlValue, nextIndex);
    
    if (result) {
        tempIconResult = result;
        showModalIcon(result.value);
    } else {
        tempIconResult = { type: 'data', value: FALLBACK_SVG, index: 0 };
        showModalIcon(FALLBACK_SVG);
    }
    checkSaveEnable();
}

function openModal(shortcut) {
    const modal = document.getElementById('bookmark-modal');
    const title = document.getElementById('modal-title');
    const nameInput = document.getElementById('bm-name');
    const urlInput = document.getElementById('bm-url');
    const catSelect = document.getElementById('bm-category');
    const deleteBtn = document.getElementById('bm-delete');
    const changeBtn = document.getElementById('bm-change-icon');

    modal.classList.remove('hidden');
    
    // Reset modal state
    tempIconResult = null;
    tempUrlValue = '';
    showModalIcon(null);
    document.getElementById('bm-save').disabled = true;
    changeBtn.classList.add('hidden');

    if (shortcut) {
        editingId = shortcut.id;
        title.textContent = 'Edit Bookmark';
        nameInput.value = shortcut.name;
        urlInput.value = shortcut.url;
        catSelect.value = shortcut.category;
        deleteBtn.classList.remove('hidden');
        
        // Populate existing icon preview
        tempUrlValue = shortcut.url;
        tempIconResult = { 
            type: shortcut.iconData ? 'data' : 'url', 
            value: shortcut.iconData || shortcut.iconUrl || FALLBACK_SVG, 
            index: shortcut.iconSourceIndex || 0 
        };
        showModalIcon(tempIconResult.value);
        changeBtn.classList.remove('hidden');
        checkSaveEnable();
    } else {
        editingId = null;
        title.textContent = 'Add Bookmark';
        nameInput.value = '';
        urlInput.value = '';
        
        let targetCat = currentCategory === 'all' ? 'bookmarks' : currentCategory;
        const options = Array.from(catSelect.options).map(o => o.value);
        if (!options.includes(targetCat) && options.length > 0) targetCat = options[0];
        catSelect.value = targetCat;
        deleteBtn.classList.add('hidden');
    }
}

function closeModal() {
    document.getElementById('bookmark-modal').classList.add('hidden');
    editingId = null;
    clearTimeout(fetchDebounceTimer);
}

function saveModalData() {
    const name = document.getElementById('bm-name').value.trim();
    let url = document.getElementById('bm-url').value.trim();
    const category = document.getElementById('bm-category').value;

    if (!name || !url) return showToast('Name and URL are required', 'error');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }

    if (editingId) {
        const idx = shortcutsData.findIndex(s => s.id === editingId);
        if (idx !== -1) {
            shortcutsData[idx] = { 
                id: editingId, 
                name, 
                url, 
                category,
                iconSourceIndex: tempIconResult ? tempIconResult.index : 0,
                iconData: tempIconResult && tempIconResult.type === 'data' ? tempIconResult.value : null,
                iconUrl: tempIconResult && tempIconResult.type === 'url' ? tempIconResult.value : null
            };
        }
    } else {
        shortcutsData.push({
            id: Date.now().toString(),
            name,
            url,
            category,
            iconSourceIndex: tempIconResult ? tempIconResult.index : 0,
            iconData: tempIconResult && tempIconResult.type === 'data' ? tempIconResult.value : null,
            iconUrl: tempIconResult && tempIconResult.type === 'url' ? tempIconResult.value : null
        });
    }

    saveShortcuts();
    renderShortcuts();
    closeModal();
}

function deleteBookmark() {
    if (editingId) {
        shortcutsData = shortcutsData.filter(s => s.id !== editingId);
        saveShortcuts();
        renderShortcuts();
    }
    closeModal();
}
