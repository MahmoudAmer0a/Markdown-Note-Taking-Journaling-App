# 📝 MarkDown Studio

A lightweight, distraction-free **Interactive Markdown Note-Taking & Journaling App** built entirely with vanilla web technologies. It allows users to write, preview, organize, and export notes seamlessly with zero setup, external dependencies, or backend required. All data is kept 100% private and stored locally in your browser.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Build](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Stack](https://img.shields.io/badge/tech-HTML5%20%7C%20CSS3%20%7C%20JS-orange)

---

## ✨ Features

- **⚡ Real-Time Markdown Preview:** Live side-by-side rendering as you type using standard Markdown syntax.
- **💾 100% Local Data Persistence:** Automatic saving via `localStorage`—your notes never leave your browser.
- **🏷️ Smart Tagging & Search:** Tag notes (e.g., `#work`, `#ideas`) and quickly filter or search through your library.
- **🛠️ Formatting Toolbar:** One-click insertion for common Markdown syntax (bold, italic, headings, code blocks, lists).
- **📥 One-Click Export:** Download active notes directly as `.md` or `.txt` files using client-side Blob URLs.
- **📊 Live Workspace Stats:** Bottom status bar tracking word count, character count, total notes, and estimated storage usage.
- **📱 Fully Responsive:** Clean 3-pane layout on desktop that gracefully adapts to mobile viewports.

---

## 🎨 Color Palette & Design System

Built with a custom palette designed for high contrast and readability during extended writing sessions:

| Hex Code | Visual | Usage |
| :--- | :--- | :--- |
| `#071B2B` | ![#071B2B](https://via.placeholder.com/15/071B2B/071B2B.png) **Deep Navy** | Primary text, headers, and dark mode bases |
| `#167D8D` | ![#167D8D](https://via.placeholder.com/15/167D8D/167D8D.png) **Teal Accent** | Action buttons, toolbars, and active icons |
| `#B9E4E8` | ![#B9E4E8](https://via.placeholder.com/15/B9E4E8/B9E4E8.png) **Soft Cyan** | Active note highlights, tag chips, and hover states |
| `#EEEEEE` | ![#EEEEEE](https://via.placeholder.com/15/EEEEEE/EEEEEE.png) **Off-White** | Main workspace and preview panel backgrounds |

---

## 📁 Project Structure

```text
markdown-studio/
├── index.html       # Semantic HTML5 page layout & UI structure
├── styles.css       # CSS custom properties, grid/flex layouts & styling
├── script.js        # DOM manipulation, Markdown rendering logic & localStorage
└── README.md        # Project documentation
