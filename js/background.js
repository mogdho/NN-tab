chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchIcon') {
        fetch(request.url, { credentials: 'omit' })
            .then(res => {
                if (!res.ok) throw new Error('Not ok');
                const contentType = res.headers.get('content-type');
                if (contentType && !contentType.startsWith('image/')) throw new Error('Not an image');
                return Promise.all([res.blob(), res.arrayBuffer(), contentType]);
            })
            .then(([blob, buffer, contentType]) => {
                if (blob.size < 50) throw new Error('Too small');
                
                // Convert ArrayBuffer to Base64 manually since FileReader is not in Service Workers
                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                
                const mimeType = contentType || 'image/png';
                const base64 = 'data:' + mimeType + ';base64,' + btoa(binary);
                sendResponse({ base64: base64 });
            })
            .catch(err => {
                sendResponse({ base64: null });
            });
        return true; // Keep message channel open for async response
    }
});
