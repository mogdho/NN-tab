export function initQuotes() {
    const quoteWidget = document.getElementById('quote-widget');
    const quoteText = document.getElementById('quote-text');
    const quoteAuthor = document.getElementById('quote-author');

    // Load from local storage synchronously
    const storedQuote = localStorage.getItem('userQuote');
    if (storedQuote) {
        try {
            const parsed = JSON.parse(storedQuote);
            quoteText.textContent = `"${parsed.text}"`;
            quoteAuthor.textContent = `— ${parsed.author}`;
        } catch(e) {}
    }

    // Context Menu to edit
    quoteWidget.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        openQuoteModal();
    });

    setupQuoteModalHandlers();
}

function setupQuoteModalHandlers() {
    const cancelBtn = document.getElementById('quote-cancel');
    const saveBtn = document.getElementById('quote-save');
    if (!cancelBtn || !saveBtn) return;

    cancelBtn.addEventListener('click', closeQuoteModal);
    saveBtn.addEventListener('click', saveQuoteModal);
}

function openQuoteModal() {
    const modal = document.getElementById('quote-modal');
    const textInput = document.getElementById('quote-input-text');
    const authorInput = document.getElementById('quote-input-author');
    const quoteText = document.getElementById('quote-text');
    const quoteAuthor = document.getElementById('quote-author');

    modal.classList.remove('hidden');
    
    // Extract current text for editing
    let currentText = quoteText.textContent;
    if (currentText.startsWith('"') && currentText.endsWith('"')) {
        currentText = currentText.slice(1, -1);
    }
    let currentAuthor = quoteAuthor.textContent;
    if (currentAuthor.startsWith('— ')) {
        currentAuthor = currentAuthor.slice(2);
    }

    textInput.value = currentText;
    authorInput.value = currentAuthor;
}

function closeQuoteModal() {
    document.getElementById('quote-modal').classList.add('hidden');
}

function saveQuoteModal() {
    const text = document.getElementById('quote-input-text').value.trim();
    const author = document.getElementById('quote-input-author').value.trim();

    if (!text) return alert('Quote text is required');

    const quoteData = { text, author: author || 'Unknown' };
    localStorage.setItem('userQuote', JSON.stringify(quoteData));

    const quoteText = document.getElementById('quote-text');
    const quoteAuthor = document.getElementById('quote-author');
    
    quoteText.textContent = `"${quoteData.text}"`;
    quoteAuthor.textContent = `— ${quoteData.author}`;

    closeQuoteModal();
}
