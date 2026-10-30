// Bookmark icon lookup.
//
// Privacy model:
//  - By default, icons come only from Chrome's own local favicon cache
//    (the `favicon` permission). Nothing leaves the machine.
//  - Online lookup (third-party icon services and the site's own root icons)
//    runs only after the user grants host access, either from the Settings
//    popup or by clicking "Next Icon" in the bookmark modal.

export const FALLBACK_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24'%3E%3Cpath fill='%238e9192' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z'/%3E%3C/svg%3E`;

// Hosts of the online icon services. Granting these is what "online icon
// lookup" means; the dialog Chrome shows lists exactly these sites.
export const PROVIDER_ORIGINS = [
    'https://t1.gstatic.com/*',
    'https://www.gstatic.com/*',
    'https://ssl.gstatic.com/*',
    'https://unavatar.io/*',
    'https://api.faviconkit.com/*',
    'https://icons.duckduckgo.com/*',
    'https://icon.horse/*'
];

const FETCH_TIMEOUT_MS = 5000;
const ICON_SIZE = 64;

const hasPermissionsApi = () =>
    typeof chrome !== 'undefined' && !!chrome.permissions;
const hasLocalFavicons = () =>
    typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.getURL;

export async function hasOnlineIconAccess() {
    if (!hasPermissionsApi()) return false;
    return chrome.permissions.contains({ origins: PROVIDER_ORIGINS });
}

// Must be called from a user gesture (click / change handler).
export async function requestOnlineIconAccess(extraOrigins = []) {
    if (!hasPermissionsApi()) return false;
    try {
        return await chrome.permissions.request({ origins: [...PROVIDER_ORIGINS, ...extraOrigins] });
    } catch {
        return false;
    }
}

export async function revokeOnlineIconAccess() {
    if (!hasPermissionsApi()) return;
    const { origins = [] } = await chrome.permissions.getAll();
    if (origins.length) await chrome.permissions.remove({ origins });
}

async function hasOriginAccess(origin) {
    if (!hasPermissionsApi()) return false;
    return chrome.permissions.contains({ origins: [origin + '/*'] });
}

export function normalizeUrl(targetUrl) {
    let value = (targetUrl || '').trim();
    if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
    try { return new URL(value); } catch { return null; }
}

// Known high-res icons for subdomains that generic services misresolve.
const SUBDOMAIN_ICON_OVERRIDES = {
    'docs.google.com': ['https://www.gstatic.com/images/branding/product/2x/docs_2020q4_48dp.png'],
    'sheets.google.com': ['https://www.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png'],
    'slides.google.com': ['https://www.gstatic.com/images/branding/product/2x/slides_2020q4_48dp.png'],
    'drive.google.com': ['https://www.gstatic.com/images/branding/product/2x/drive_2020q4_48dp.png'],
    'keep.google.com': ['https://www.gstatic.com/images/branding/product/2x/keep_2020q4_48dp.png'],
    'calendar.google.com': ['https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png'],
    'meet.google.com': ['https://www.gstatic.com/images/branding/product/2x/meet_2020q4_48dp.png'],
    'maps.google.com': ['https://www.gstatic.com/images/branding/product/2x/maps_2020q4_48dp.png'],
    'photos.google.com': ['https://www.gstatic.com/images/branding/product/2x/photos_2020q4_48dp.png'],
    'translate.google.com': ['https://www.gstatic.com/images/branding/product/2x/translate_2020q4_48dp.png'],
    'forms.google.com': ['https://www.gstatic.com/images/branding/product/2x/forms_2020q4_48dp.png'],
    'classroom.google.com': ['https://www.gstatic.com/images/branding/product/2x/classroom_2020q4_48dp.png'],
    'chat.google.com': ['https://www.gstatic.com/images/branding/product/2x/chat_2020q4_48dp.png'],
    'contacts.google.com': ['https://www.gstatic.com/images/branding/product/2x/contacts_2020q4_48dp.png'],
    'earth.google.com': ['https://www.gstatic.com/images/branding/product/2x/earth_2020q4_48dp.png'],
    'news.google.com': ['https://www.gstatic.com/images/branding/product/2x/googlenews_2020q4_48dp.png'],
    'music.youtube.com': ['https://www.gstatic.com/youtube/media/ytm/images/applauncher/music_icon_144x144.png'],
    'studio.youtube.com': ['https://www.gstatic.com/youtube/img/creator/favicon/favicon_144.png']
};

const POPULAR_DOMAINS = new Set([
    'youtube.com', 'facebook.com', 'amazon.com', 'wikipedia.org',
    'instagram.com', 'pinterest.com', 'tiktok.com', 'linkedin.com',
    'github.com', 'notion.so', 'aliexpress.com', 'canva.com',
    'booking.com', 'twitter.com', 'x.com', 'reddit.com', 'netflix.com',
    'discord.com', 'twitch.tv', 'spotify.com'
]);

function localFaviconUrl(pageUrl) {
    return chrome.runtime.getURL(`/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=${ICON_SIZE}`);
}

// Ordered list of icon sources for a URL. Index 0 is always the local cache;
// online sources are appended only when allowed.
async function buildSources(urlObj, online) {
    const sources = [];
    if (hasLocalFavicons()) sources.push({ url: localFaviconUrl(urlObj.href), local: true });
    if (!online) return sources;

    const origin = urlObj.origin;
    const domain = urlObj.hostname.replace(/^www\./, '');
    const google = `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(origin)}&size=128`;
    const unavatar = `https://unavatar.io/${domain}?fallback=false`;
    const faviconKit = `https://api.faviconkit.com/${domain}/144`;
    const duck = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    const horse = `https://icon.horse/icon/${domain}`;

    // The site's own root icons need access to that site, granted per bookmark.
    const siteAllowed = await hasOriginAccess(origin);
    const touch = siteAllowed ? `${origin}/apple-touch-icon.png` : null;
    const touchPre = siteAllowed ? `${origin}/apple-touch-icon-precomposed.png` : null;
    const ico = siteAllowed ? `${origin}/favicon.ico` : null;

    let onlineList;
    const overrides = SUBDOMAIN_ICON_OVERRIDES[domain];
    if (overrides) {
        onlineList = [...overrides, google, touch, ico, duck, horse];
    } else if (POPULAR_DOMAINS.has(domain)) {
        onlineList = [google, touch, unavatar, faviconKit, duck, horse, ico];
    } else {
        onlineList = [touch, unavatar, touchPre, duck, faviconKit, horse, ico, google];
    }
    for (const url of onlineList) if (url) sources.push({ url, local: false });
    return sources;
}

// Draws any image blob onto a 64x64 canvas and returns a WebP data URL.
// Blob URLs belong to this page's origin, so the canvas is never tainted.
function blobToIconDataUrl(blob) {
    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = ICON_SIZE;
                canvas.height = ICON_SIZE;
                const ctx = canvas.getContext('2d');
                const w0 = img.naturalWidth || ICON_SIZE;
                const h0 = img.naturalHeight || ICON_SIZE;
                const scale = Math.min(ICON_SIZE / w0, ICON_SIZE / h0);
                const w = w0 * scale;
                const h = h0 * scale;
                ctx.drawImage(img, (ICON_SIZE - w) / 2, (ICON_SIZE - h) / 2, w, h);
                resolve(canvas.toDataURL('image/webp', 0.8));
            } catch {
                resolve(null);
            } finally {
                URL.revokeObjectURL(objectUrl);
            }
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(null);
        };
        img.src = objectUrl;
    });
}

async function fetchIcon(url) {
    try {
        const res = await fetch(url, {
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        });
        if (!res.ok) return null;
        const type = res.headers.get('content-type') || '';
        if (type.startsWith('text/')) return null;
        const blob = await res.blob();
        if (blob.size < 50) return null;
        return blobToIconDataUrl(blob);
    } catch {
        return null;
    }
}

// Chrome returns a generic globe for sites it has no icon for. Fetch that
// once so a local result equal to it counts as "not found".
let defaultLocalIcon;
function getDefaultLocalIcon() {
    if (defaultLocalIcon === undefined) {
        defaultLocalIcon = fetchIcon(localFaviconUrl('https://nn-tab.invalid/'));
    }
    return defaultLocalIcon;
}

/**
 * Finds the first working icon at or after `startIndex` in the source list.
 * Returns { value: dataUrl, index } or null. Sources are tried in order, each
 * with a timeout, so one slow service cannot stall the lookup.
 */
export async function findIcon(targetUrl, startIndex = 0, { online } = {}) {
    const urlObj = normalizeUrl(targetUrl);
    if (!urlObj) return null;

    if (online === undefined) online = await hasOnlineIconAccess();
    const sources = await buildSources(urlObj, online);
    if (startIndex >= sources.length) startIndex = 0;

    for (let i = startIndex; i < sources.length; i++) {
        const source = sources[i];
        const dataUrl = await fetchIcon(source.url);
        if (!dataUrl) continue;
        if (source.local && dataUrl === await getDefaultLocalIcon()) continue;
        return { value: dataUrl, index: i };
    }
    return null;
}
