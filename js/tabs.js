import { renderShortcuts, reassignOrphans } from './shortcuts.js';
import { showToast } from './toast.js';
import { getItem, setItems } from './storage.js';

let categories = [];

const DEFAULT_CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'bookmarks', label: 'Bookmarks' },
    { id: 'work', label: 'Work' },
    { id: 'social', label: 'Social' }
];

let currentActiveTab = 'bookmarks';

export function getCategories() {
    return categories;
}

export async function initTabs(initialCategory = 'bookmarks') {
    const stored = await getItem('categories');
    if (Array.isArray(stored) && stored.length) {
        categories = stored;
    } else {
        categories = DEFAULT_CATEGORIES.map(c => ({ ...c }));
        await saveCategories();
    }
    // "All" is always present and always first.
    if (!categories.some(c => c.id === 'all')) categories.unshift({ id: 'all', label: 'All' });

    currentActiveTab = categories.some(c => c.id === initialCategory) ? initialCategory : 'all';
    setupTabModalHandlers();
    renderTabs(currentActiveTab);
    return currentActiveTab;
}

function saveCategories() {
    return setItems({ categories });
}

function saveActiveTab(tabId) {
    setItems({ activeTab: tabId });
}

function userCategories() {
    return categories.filter(c => c.id !== 'all');
}

// Where bookmarks go when their category no longer exists.
function fallbackCategoryId() {
    const remaining = userCategories();
    const preferred = remaining.find(c => c.id === 'bookmarks');
    return (preferred || remaining[0] || {}).id;
}

/** Moves bookmarks with a missing category into an existing one. */
export function repairOrphanedBookmarks() {
    const target = fallbackCategoryId();
    if (!target) return 0;
    return reassignOrphans(userCategories().map(c => c.id), target);
}

function selectTab(id) {
    currentActiveTab = id;
    saveActiveTab(id);
    renderTabs(id);
    renderShortcuts(id);
}

function renderTabs(activeTabId) {
    const tabsContainer = document.getElementById('tabs-container');
    tabsContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${cat.id === activeTabId ? 'active' : ''}`;
        btn.textContent = cat.label;
        btn.dataset.category = cat.id;
        btn.addEventListener('click', () => selectTab(cat.id));

        if (cat.id !== 'all') {
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                openTabModal(cat);
            });
        }
        fragment.appendChild(btn);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'tab-btn material-symbols-outlined';
    addBtn.textContent = 'add';
    addBtn.title = 'Add category';
    addBtn.style.padding = '8px 12px';
    addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openTabModal(null);
    });
    fragment.appendChild(addBtn);

    tabsContainer.appendChild(fragment);
}

// ── Category modal ──
let editingTabId = null;
let tabHandlersInitialized = false;

function setupTabModalHandlers() {
    if (tabHandlersInitialized) return;
    tabHandlersInitialized = true;

    document.getElementById('tab-cancel').addEventListener('click', closeTabModal);
    document.getElementById('tab-save').addEventListener('click', saveTabModalData);
    document.getElementById('tab-delete').addEventListener('click', deleteTab);
    document.getElementById('tab-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveTabModalData();
    });

    const modalOverlay = document.getElementById('tab-modal');
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeTabModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeTabModal();
    });
}

function openTabModal(cat) {
    const modal = document.getElementById('tab-modal');
    const title = document.getElementById('tab-modal-title');
    const nameInput = document.getElementById('tab-name');
    const deleteBtn = document.getElementById('tab-delete');

    modal.classList.remove('hidden');
    editingTabId = cat ? cat.id : null;
    title.textContent = cat ? 'Edit Category' : 'Add Category';
    nameInput.value = cat ? cat.label : '';
    deleteBtn.classList.toggle('hidden', !cat);
    nameInput.focus();
}

function closeTabModal() {
    document.getElementById('tab-modal').classList.add('hidden');
    editingTabId = null;
}

function saveTabModalData() {
    const label = document.getElementById('tab-name').value.trim();
    if (!label) return showToast('Category name is required', 'error');

    if (editingTabId) {
        const cat = categories.find(c => c.id === editingTabId);
        if (cat) cat.label = label;
    } else {
        const id = 'cat_' + Date.now();
        categories.push({ id, label });
        currentActiveTab = id;
        saveActiveTab(id);
    }

    saveCategories();
    renderTabs(currentActiveTab);
    renderShortcuts(currentActiveTab);
    closeTabModal();
}

function deleteTab() {
    if (!editingTabId) return;

    if (userCategories().length <= 1) {
        showToast('Keep at least one category', 'error');
        return;
    }

    const deleted = categories.find(c => c.id === editingTabId);
    categories = categories.filter(c => c.id !== editingTabId);
    saveCategories();

    // Move the deleted category's bookmarks instead of leaving them hidden.
    const target = categories.find(c => c.id === fallbackCategoryId());
    const moved = reassignOrphans(userCategories().map(c => c.id), target.id);
    if (moved) {
        showToast(`Moved ${moved} bookmark${moved === 1 ? '' : 's'} from "${deleted.label}" to "${target.label}"`, 'info');
    }

    if (currentActiveTab === editingTabId) currentActiveTab = 'all';
    saveActiveTab(currentActiveTab);
    renderTabs(currentActiveTab);
    renderShortcuts(currentActiveTab);
    closeTabModal();
}
