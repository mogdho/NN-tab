# Aether New Tab

A sleek, ultra-minimalist, and high-performance New Tab dashboard for Google Chrome. Built entirely with vanilla web technologies, Aether strips away distractions while providing a meticulously crafted "Nocturnal Minimalism" aesthetic.

![Aether Showcase](https://via.placeholder.com/1200x600/121212/ffffff?text=Aether+New+Tab) *(Replace with actual screenshot)*

## ✨ Features

- **Nocturnal Minimalism Aesthetic:** A beautiful, distraction-free dark theme powered by glassmorphic UI elements and smooth micro-animations.
- **Smart Bookmarks Grid:** A highly customizable bookmarking system supporting drag-and-drop reordering, categories, and custom names.
- **The Ultimate Favicon Resolver:** Ensure your dashboard always looks stunning. Aether uses a 9-step intelligent fallback cascade to fetch the highest resolution, pixel-perfect icon for any website.
- **Dynamic Clock:** A sleek, real-time digital clock serving as the centerpiece of the dashboard.
- **Built-in To-Do List:** Keep track of your daily tasks right from your new tab.
- **Lightweight & Fast:** Zero heavy frameworks. Built exclusively with Vanilla JavaScript, HTML, and CSS for instant load times.
- **Privacy-First:** All your bookmarks, tasks, and settings are stored locally on your device via Chrome's Local Storage.

## 🔮 The Universal Favicon Cascade

Most bookmark managers struggle to find good icons for less popular websites. Aether features an advanced **Favicon Resolver Cascade** that cycles through multiple high-quality APIs to guarantee a beautiful icon. 

The fallback chain checks these providers sequentially until a high-res icon is found:
1. **Google Favicon V2 (Ultra HD)** - *Prioritized for tech giants.*
2. **Website Native Root** (`apple-touch-icon.png`)
3. **Clearbit Logo API**
4. **Unavatar Aggregator**
5. **FaviconKit API**
6. **DuckDuckGo Favicon API**
7. **Icon.horse API**
8. **Native Root Fallbacks** (`favicon.ico`)

> **Live Preview & Manual Cycling:** Don't like the fetched icon? When adding a bookmark, you can cycle through the different providers in real-time until you find the perfect one.

## 🛠️ Tech Stack

- **HTML5:** Semantic and accessible structure.
- **CSS3:** Vanilla CSS with custom properties, grid/flexbox layouts, and glassmorphism styling.
- **JavaScript (ES6+):** Modular, object-oriented vanilla JS handling UI logic, drag-and-drop, and API requests.
- **Chrome Extension API:** Manifest V3, utilizing `chrome.storage` and Service Workers (`background.js`) to bypass CORS for image fetching.

## 🚀 Installation & Usage

Since this extension is not currently listed on the Chrome Web Store, you can easily install it manually:

1. **Download or Clone the Repository:**
   ```bash
   git clone https://github.com/yourusername/aether-new-tab.git
   ```
2. **Open Chrome Extension Settings:**
   - Type `chrome://extensions/` in your Chrome address bar and hit Enter.
3. **Enable Developer Mode:**
   - Toggle the **Developer mode** switch in the top right corner.
4. **Load the Extension:**
   - Click the **Load unpacked** button in the top left corner.
   - Select the folder containing the Aether repository (where the `manifest.json` file is located).
5. **Open a New Tab:**
   - Open a new tab (`Ctrl + T` or `Cmd + T`) to see Aether in action!

## 📂 Project Structure

```text
├── css/
│   ├── base.css          # Color variables and global resets
│   ├── layout.css        # Main grid and structural styling
│   └── components.css    # Cards, modals, widgets, and buttons
├── js/
│   ├── main.js           # Core initialization
│   ├── background.js     # Service worker (CORS bypass & API fetching)
│   ├── clock.js          # Time widget logic
│   ├── shortcuts.js      # Bookmark data, drag-and-drop, and icon resolution
│   ├── tabs.js           # Category filtering logic
│   └── todo.js           # Task management logic
├── index.html            # Main markup
└── manifest.json         # Chrome Extension V3 configurations
```

## 🤝 Contributing

Contributions are always welcome! Feel free to open an issue or submit a Pull Request if you have ideas for new features or improvements.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
