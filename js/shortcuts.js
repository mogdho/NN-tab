import { getCategories } from './tabs.js';
import { showToast } from './toast.js';
import { getItem, setItems } from './storage.js';
import {
    FALLBACK_SVG, findIcon, hasOnlineIconAccess, requestOnlineIconAccess, normalizeUrl
} from './icons.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PER_CATEGORY = 24;

let shortcutsData = [];
let currentCategory = 'all';
let draggedShortcutId = null;
const resolving = new Set(); // shortcut ids with an icon lookup in flight

// Fresh installs start with an empty grid; users add their own bookmarks.
const DEFAULT_SHORTCUTS = [];

const hasRealIcon = (s) => !!s.iconData && !s.iconData.startsWith('data:image/svg+xml');

export async function initShortcuts(initialCategory = 'bookmarks') {
    currentCategory = initialCategory;
    const stored = await getItem('shortcutsData');
    if (Array.isArray(stored)) {
        shortcutsData = stored;
    } else {
        shortcutsData = DEFAULT_SHORTCUTS.map(s => ({ ...s }));
        await saveShortcuts();
    }
    setupModalHandlers();
    renderShortcuts(currentCategory);
}


function saveShortcuts() {
    return setItems({ shortcutsData });
}

/**
 * Moves every bookmark whose category is not in `validIds` to `targetId`.
 * Returns how many bookmarks were moved.
 */
export function reassignOrphans(validIds, targetId) {
    let moved = 0;
    for (const s of shortcutsData) {
        if (!validIds.includes(s.category)) {
            s.category = targetId;
            moved++;
        }
    }
    if (moved) {
        saveShortcuts();
        renderShortcuts();
    }
    return moved;
}

// Looks up and caches an icon for a shortcut that has none. Local-only
// lookups are cheap (no network), so they retry on every new tab and pick up
// the icon once the site has been visited. Failed online lookups retry daily.
async function resolveIcon(shortcut) {
    if (hasRealIcon(shortcut) || resolving.has(shortcut.id)) return;

    const online = await hasOnlineIconAccess();
    const failed = shortcut.iconFailed;
    if (online && failed && failed.online && Date.now() - failed.at < DAY_MS) return;

    resolving.add(shortcut.id);
    try {
        const result = await findIcon(shortcut.url, 0, { online });
        // The shortcut may have been edited or deleted while we waited.
        const live = shortcutsData.find(s => s.id === shortcut.id);
        if (!live || live.url !== shortcut.url || hasRealIcon(live)) return;

        if (result) {
            live.iconData = result.value;
            live.iconSourceIndex = result.index;
            delete live.iconFailed;
        } else {
            live.iconData = FALLBACK_SVG;
            live.iconFailed = { at: Date.now(), online };
        }
        delete live.iconUrl; // drop any legacy external icon URL
        saveShortcuts();

        const img = document.querySelector(`img.favicon[data-id="${CSS.escape(live.id)}"]`);
        if (img) applyFaviconToImg(img, live.iconData, result ? 1 : 0.3);
    } finally {
        resolving.delete(shortcut.id);
    }
}

function applyFaviconToImg(img, src, opacity = 1) {
    img.style.opacity = '0';
    img.onload = () => {
        img.style.transition = 'opacity 0.25s ease';
        img.style.opacity = String(opacity);
    };
    img.src = src;
}

function moveShortcut(fromId, toIndex) {
    const fromIndex = shortcutsData.findIndex(s => s.id === fromId);
    if (fromIndex === -1) return;
    const [moved] = shortcutsData.splice(fromIndex, 1);
    shortcutsData.splice(toIndex, 0, moved);
    saveShortcuts();
    renderShortcuts();
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

        a.addEventListener('dragleave', () => a.classList.remove('drag-over'));

        a.addEventListener('drop', (e) => {
            e.preventDefault();
            a.classList.remove('drag-over');
            if (!draggedShortcutId || draggedShortcutId === shortcut.id) return;
            const toIndex = shortcutsData.findIndex(s => s.id === shortcut.id);
            if (toIndex !== -1) moveShortcut(draggedShortcutId, toIndex);
        });

        a.addEventListener('dragend', () => {
            a.classList.remove('dragging');
            draggedShortcutId = null;
        });

        const img = document.createElement('img');
        img.className = 'favicon';
        img.alt = shortcut.name;
        img.dataset.id = shortcut.id;

        if (hasRealIcon(shortcut)) {
            img.src = shortcut.iconData;
            img.style.opacity = '1';
        } else {
            img.src = FALLBACK_SVG;
            img.style.opacity = '0.3';
            resolveIcon(shortcut);
        }

        const iconContainer = document.createElement('div');
        iconContainer.className = 'shortcut-icon-container';
        if (shortcut.iconBg === 'white') iconContainer.classList.add('icon-bg-white');
        if (shortcut.iconBg === 'black') iconContainer.classList.add('icon-bg-black');
        iconContainer.appendChild(img);

        const label = document.createElement('span');
        label.className = 'shortcut-label';
        label.textContent = shortcut.name;

        a.appendChild(iconContainer);
        a.appendChild(label);
        fragment.appendChild(a);
    });

    if (filtered.length < MAX_PER_CATEGORY) {
        const addBtn = document.createElement('button');
        addBtn.className = 'shortcut-item';

        addBtn.addEventListener('dragover', (e) => {
            e.preventDefault();
            addBtn.classList.add('drag-over');
        });
        addBtn.addEventListener('dragleave', () => addBtn.classList.remove('drag-over'));
        addBtn.addEventListener('drop', (e) => {
            e.preventDefault();
            addBtn.classList.remove('drag-over');
            if (!draggedShortcutId) return;
            // Drop on "Add" = move to the end of the visible list.
            const without = shortcutsData.filter(s => s.id !== draggedShortcutId);
            const lastVisible = filtered.filter(s => s.id !== draggedShortcutId).pop();
            const toIndex = lastVisible ? without.findIndex(s => s.id === lastVisible.id) + 1 : without.length;
            moveShortcut(draggedShortcutId, toIndex);
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

// ── Bookmark modal ──
let editingId = null;
let tempIconResult = null; // { value, index } shown in the modal preview
let tempUrlValue = '';
let tempIconBg = 'none';
let fetchDebounceTimer = null;
let lookupToken = 0; // discards results of lookups that were superseded
let modalHandlersInitialized = false;

function setupModalHandlers() {
    if (modalHandlersInitialized) return;
    modalHandlersInitialized = true;

    document.getElementById('bm-save').addEventListener('click', saveModalData);
    document.getElementById('bm-delete').addEventListener('click', deleteBookmark);
    document.getElementById('bm-change-icon').addEventListener('click', cycleModalIcon);

    document.querySelectorAll('.icon-bg-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            tempIconBg = target.dataset.bg;
            applyModalIconBg();
        });
    });

    // Save stays disabled from the first keystroke until the icon for the new
    // URL is ready, so a bookmark can't be saved with the previous URL's icon.
    document.getElementById('bm-url').addEventListener('input', (e) => {
        document.getElementById('bm-save').disabled = true;
        clearTimeout(fetchDebounceTimer);
        fetchDebounceTimer = setTimeout(() => handleUrlChange(e.target.value), 800);
    });

    document.getElementById('bm-name').addEventListener('input', checkSaveEnable);

    const modalOverlay = document.getElementById('bookmark-modal');
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal();
    });
}

function applyModalIconBg() {
    document.querySelectorAll('.icon-bg-option').forEach(b => {
        b.classList.toggle('active', b.dataset.bg === tempIconBg);
    });
    const container = document.getElementById('modal-icon-container');
    container.classList.remove('icon-bg-white', 'icon-bg-black');
    if (tempIconBg !== 'none') container.classList.add(`icon-bg-${tempIconBg}`);
}

function showModalSpinner(show) {
    document.getElementById('modal-icon-spinner').style.display = show ? 'block' : 'none';
    document.getElementById('modal-icon-placeholder').style.display = show ? 'none' : 'block';
    if (show) document.getElementById('modal-icon-img').style.display = 'none';
}

function showModalIcon(src) {
    const img = document.getElementById('modal-icon-img');
    const placeholder = document.getElementById('modal-icon-placeholder');
    document.getElementById('modal-icon-spinner').style.display = 'none';
    if (src) {
        img.src = src;
        img.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        img.style.display = 'none';
        placeholder.style.display = 'block';
    }
}

function urlInputMatchesIcon() {
    const current = document.getElementById('bm-url').value.trim();
    return !!tempIconResult && current === tempUrlValue;
}

function checkSaveEnable() {
    const name = document.getElementById('bm-name').value.trim();
    document.getElementById('bm-save').disabled = !(name && urlInputMatchesIcon());
}

function setIconResult(result) {
    tempIconResult = result || { value: FALLBACK_SVG, index: 0 };
    showModalIcon(tempIconResult.value);
    document.getElementById('bm-change-icon').classList.remove('hidden');
    checkSaveEnable();
}

async function handleUrlChange(urlValue) {
    urlValue = urlValue.trim();
    if (!urlValue || !normalizeUrl(urlValue)) {
        checkSaveEnable();
        return;
    }
    if (urlValue === tempUrlValue && tempIconResult) {
        checkSaveEnable();
        return;
    }

    tempUrlValue = urlValue;
    tempIconResult = null;
    const token = ++lookupToken;

    showModalSpinner(true);
    document.getElementById('bm-save').disabled = true;
    document.getElementById('bm-change-icon').classList.add('hidden');

    const result = await findIcon(urlValue, 0);
    if (token !== lookupToken) return; // a newer lookup started
    setIconResult(result);
}

async function cycleModalIcon() {
    if (!tempUrlValue) return;
    const urlObj = normalizeUrl(tempUrlValue);
    if (!urlObj) return;

    // Online sources need host access. This click is the user gesture Chrome
    // requires, so ask here; if the user declines, stay with local icons.
    let online = await hasOnlineIconAccess();
    if (!online) {
        online = await requestOnlineIconAccess([urlObj.origin + '/*']);
        if (!online) showToast('Online icon lookup is off. Using Chrome\'s local icons only.', 'info');
    }

    const token = ++lookupToken;
    showModalSpinner(true);
    document.getElementById('bm-save').disabled = true;

    const nextIndex = tempIconResult ? tempIconResult.index + 1 : 0;
    let result = await findIcon(tempUrlValue, nextIndex, { online });
    // Reached the end of the list: wrap around to the first source.
    if (!result && nextIndex > 0) result = await findIcon(tempUrlValue, 0, { online });
    if (token !== lookupToken) return;
    setIconResult(result);
}

function fillCategorySelect(selectedId) {
    const catSelect = document.getElementById('bm-category');
    const options = getCategories().filter(c => c.id !== 'all');
    catSelect.innerHTML = '';
    for (const cat of options) {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.label;
        catSelect.appendChild(opt);
    }
    const ids = options.map(c => c.id);
    catSelect.value = ids.includes(selectedId) ? selectedId : (ids.includes('bookmarks') ? 'bookmarks' : ids[0] || '');
}

function openModal(shortcut) {
    const modal = document.getElementById('bookmark-modal');
    const title = document.getElementById('modal-title');
    const nameInput = document.getElementById('bm-name');
    const urlInput = document.getElementById('bm-url');
    const deleteBtn = document.getElementById('bm-delete');
    const changeBtn = document.getElementById('bm-change-icon');

    modal.classList.remove('hidden');
    clearTimeout(fetchDebounceTimer);
    lookupToken++;

    tempIconResult = null;
    tempUrlValue = '';
    tempIconBg = shortcut ? (shortcut.iconBg || 'none') : 'none';
    applyModalIconBg();
    showModalIcon(null);
    document.getElementById('bm-save').disabled = true;
    changeBtn.classList.add('hidden');

    if (shortcut) {
        editingId = shortcut.id;
        title.textContent = 'Edit Bookmark';
        nameInput.value = shortcut.name;
        urlInput.value = shortcut.url;
        fillCategorySelect(shortcut.category);
        deleteBtn.classList.remove('hidden');

        tempUrlValue = shortcut.url;
        setIconResult({ value: shortcut.iconData || FALLBACK_SVG, index: shortcut.iconSourceIndex || 0 });
    } else {
        editingId = null;
        title.textContent = 'Add Bookmark';
        nameInput.value = '';
        urlInput.value = '';
        fillCategorySelect(currentCategory === 'all' ? 'bookmarks' : currentCategory);
        deleteBtn.classList.add('hidden');
    }
    nameInput.focus();
}

function closeModal() {
    document.getElementById('bookmark-modal').classList.add('hidden');
    editingId = null;
    clearTimeout(fetchDebounceTimer);
    lookupToken++;
}

function saveModalData() {
    const name = document.getElementById('bm-name').value.trim();
    const urlObj = normalizeUrl(document.getElementById('bm-url').value);
    const category = document.getElementById('bm-category').value;

    if (!name || !urlObj) return showToast('Name and a valid URL are required', 'error');
    if (!category) return showToast('Create a category first', 'error');
    if (!urlInputMatchesIcon()) return; // icon for the current URL not ready yet

    const isFallback = tempIconResult.value.startsWith('data:image/svg+xml');
    const entry = {
        id: editingId || Date.now().toString(),
        name,
        url: urlObj.href,
        category,
        iconBg: tempIconBg,
        iconSourceIndex: tempIconResult.index,
        // Keep the fallback out of storage so the icon is looked up again later.
        iconData: isFallback ? null : tempIconResult.value
    };

    if (editingId) {
        const idx = shortcutsData.findIndex(s => s.id === editingId);
        if (idx !== -1) shortcutsData[idx] = entry;
    } else {
        shortcutsData.push(entry);
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
