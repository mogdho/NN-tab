// One place for persistence. Uses chrome.storage.local inside the extension
// and falls back to localStorage when the page is opened as a plain web page.

const hasChromeStorage =
    typeof chrome !== 'undefined' && !!chrome.storage && !!chrome.storage.local;

export async function getItems(keys) {
    if (hasChromeStorage) return chrome.storage.local.get(keys);
    const out = {};
    for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        try { out[key] = JSON.parse(raw); } catch { out[key] = raw; }
    }
    return out;
}

export async function getItem(key) {
    return (await getItems([key]))[key];
}

export async function setItems(items) {
    if (hasChromeStorage) return chrome.storage.local.set(items);
    for (const [key, value] of Object.entries(items)) {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

export function onStorageChange(callback) {
    if (hasChromeStorage) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') callback(changes);
        });
    }
}
