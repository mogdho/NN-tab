import { renderShortcuts } from './shortcuts.js';

export let categories = [];

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

export function initTabs(initialCategory = 'bookmarks') {
    currentActiveTab = initialCategory;
    
    if (chrome && chrome.storage) {
        chrome.storage.local.get(['categories'], (result) => {
            if (result.categories) {
                categories = result.categories;
            } else {
                categories = [...DEFAULT_CATEGORIES];
                chrome.storage.local.set({ categories });
            }
            renderTabs(currentActiveTab);
        });
    } else {
        const stored = localStorage.getItem('categories');
        if (stored) {
            categories = JSON.parse(stored);
        } else {
            categories = [...DEFAULT_CATEGORIES];
            localStorage.setItem('categories', JSON.stringify(categories));
        }
        renderTabs(currentActiveTab);
    }

    setupTabModalHandlers();
}

function saveCategories() {
    if (chrome && chrome.storage) {
        chrome.storage.local.set({ categories });
    } else {
        localStorage.setItem('categories', JSON.stringify(categories));
    }
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
        
        btn.addEventListener('click', () => {
            currentActiveTab = cat.id;
            saveActiveTab(cat.id);
            renderTabs(cat.id);
            renderShortcuts(cat.id);
        });

        if (cat.id !== 'all') {
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                openTabModal(cat);
            });
        }
        
        fragment.appendChild(btn);
    });

    // Add Tab Button
    const addBtn = document.createElement('button');
    addBtn.className = 'tab-btn material-symbols-outlined';
    addBtn.textContent = 'add';
    addBtn.style.padding = '8px 12px';
    addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openTabModal(null);
    });
    fragment.appendChild(addBtn);
    
    tabsContainer.appendChild(fragment);
    
    updateCategorySelectInBookmarkModal();
}

export function updateCategorySelectInBookmarkModal() {
    const catSelect = document.getElementById('bm-category');
    if (!catSelect) return;
    catSelect.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    categories.forEach(cat => {
        if (cat.id !== 'all') {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.label;
            fragment.appendChild(opt);
        }
    });
    catSelect.appendChild(fragment);
}

function saveActiveTab(tabId) {
    if (chrome && chrome.storage) {
        chrome.storage.local.set({ activeTab: tabId });
    } else {
        localStorage.setItem('activeTab', tabId);
    }
}

// Tab Modal Logic
let editingTabId = null;

function setupTabModalHandlers() {
    const saveBtn = document.getElementById('tab-save');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    const cancelBtn = document.getElementById('tab-cancel');
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    const deleteBtn = document.getElementById('tab-delete');
    const newDeleteBtn = deleteBtn.cloneNode(true);
    deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

    document.getElementById('tab-cancel').addEventListener('click', closeTabModal);
    document.getElementById('tab-save').addEventListener('click', saveTabModalData);
    document.getElementById('tab-delete').addEventListener('click', deleteTab);
}

function openTabModal(cat) {
    const modal = document.getElementById('tab-modal');
    const title = document.getElementById('tab-modal-title');
    const nameInput = document.getElementById('tab-name');
    const deleteBtn = document.getElementById('tab-delete');

    modal.classList.remove('hidden');

    if (cat) {
        editingTabId = cat.id;
        title.textContent = 'Edit Category';
        nameInput.value = cat.label;
        deleteBtn.classList.remove('hidden');
    } else {
        editingTabId = null;
        title.textContent = 'Add Category';
        nameInput.value = '';
        deleteBtn.classList.add('hidden');
    }
}

function closeTabModal() {
    document.getElementById('tab-modal').classList.add('hidden');
    editingTabId = null;
}

function saveTabModalData() {
    const label = document.getElementById('tab-name').value.trim();
    if (!label) return alert('Category Name is required');

    if (editingTabId) {
        const idx = categories.findIndex(c => c.id === editingTabId);
        if (idx !== -1) {
            categories[idx].label = label;
        }
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
    if (editingTabId) {
        categories = categories.filter(c => c.id !== editingTabId);
        if (currentActiveTab === editingTabId) {
            currentActiveTab = 'all';
            saveActiveTab('all');
        }
        saveCategories();
        renderTabs(currentActiveTab);
        renderShortcuts(currentActiveTab);
        closeTabModal();
    }
}
