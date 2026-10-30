import { showToast } from './toast.js';
import { getItem, setItems } from './storage.js';

let currentQuote = null; // { text, author }

function showQuote(quote) {
    currentQuote = quote;
    document.getElementById('quote-text').textContent = `"${quote.text}"`;
    document.getElementById('quote-author').textContent = `— ${quote.author}`;
}

export async function initQuotes() {
    const quoteWidget = document.getElementById('quote-widget');

    quoteWidget.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openQuoteModal();
    });
    setupQuoteModalHandlers();

    const stored = await getItem('userQuote');
    if (stored && typeof stored.text === 'string') {
        showQuote({ text: stored.text, author: stored.author || 'Unknown' });
    }
}

function setupQuoteModalHandlers() {
    const modalOverlay = document.getElementById('quote-modal');
    document.getElementById('quote-cancel').addEventListener('click', closeQuoteModal);
    document.getElementById('quote-save').addEventListener('click', saveQuoteModal);
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeQuoteModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeQuoteModal();
    });
}

function openQuoteModal() {
    document.getElementById('quote-modal').classList.remove('hidden');

    // Before any custom quote is saved, edit the default shown in the HTML.
    const text = currentQuote ? currentQuote.text : document.getElementById('quote-text').textContent.replace(/^"|"$/g, '');
    const author = currentQuote ? currentQuote.author : document.getElementById('quote-author').textContent.replace(/^— /, '');

    const textInput = document.getElementById('quote-input-text');
    textInput.value = text;
    document.getElementById('quote-input-author').value = author;
    textInput.focus();
}

function closeQuoteModal() {
    document.getElementById('quote-modal').classList.add('hidden');
}

function saveQuoteModal() {
    const text = document.getElementById('quote-input-text').value.trim();
    const author = document.getElementById('quote-input-author').value.trim();
    if (!text) return showToast('Quote text is required', 'error');

    const quote = { text, author: author || 'Unknown' };
    setItems({ userQuote: quote });
    showQuote(quote);
    closeQuoteModal();
}
