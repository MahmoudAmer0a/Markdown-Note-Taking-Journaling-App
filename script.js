(() => {
  'use strict';

  const STORAGE_KEY = 'markdown-studio-notes-v1';
  const THEME_KEY = 'markdown-studio-theme';
  const DEFAULT_TAGS = ['work', 'personal', 'ideas'];
  const $ = (selector) => document.querySelector(selector);
  const elements = {
    workspace: $('.workspace'), notesList: $('#notesList'), tagFilters: $('#tagFilters'),
    search: $('#searchInput'), title: $('#titleInput'), tags: $('#tagsInput'), editor: $('#markdownInput'),
    preview: $('#markdownPreview'), lineNumbers: $('#lineNumbers'), saveStatus: $('#saveStatus'),
    saveStatusText: $('#saveStatusText'), sidebarCount: $('#sidebarNoteCount'), footerCount: $('#footerNoteCount'),
    filteredCount: $('#filteredNoteCount'), wordCount: $('#wordCount'), charCount: $('#charCount'),
    storageLabel: $('#storageLabel'), storageFill: $('#storageFill'), breadcrumb: $('#breadcrumbTitle'),
    clearFilter: $('#clearFilterButton'), exportButton: $('#exportMenuButton'), exportMenu: $('#exportMenu'),
    toast: $('#toast'),
  };

  let notes = loadNotes();
  let activeNoteId = notes[0]?.id ?? null;
  let activeFilter = 'all';
  let searchTerm = '';
  let saveTimer;
  let toastTimer;
  let isLoadingNote = false;
  let previewWasHidden = false;

  function createStarterNote() {
    const now = new Date().toISOString();
    return {
      id: createId(),
      title: 'A little space to think',
      content: '# Welcome to MarkDown Studio\n\nA calm, private place for your notes and thoughts. Everything you write is saved **only on this device**.\n\n## Make it yours\n\n- Start writing in the editor\n- Use the toolbar or Markdown shortcuts\n- Add tags like `personal` or `ideas`\n- Export a note whenever you need it\n\n> Your next great idea can start with a single line.\n',
      tags: ['personal', 'ideas'],
      createdAt: now,
      updatedAt: now,
    };
  }

  function loadNotes() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(stored)) {
        return stored.filter((note) => note && typeof note.id === 'string').map((note) => ({
          id: note.id,
          title: typeof note.title === 'string' ? note.title : '',
          content: typeof note.content === 'string' ? note.content : '',
          tags: Array.isArray(note.tags) ? note.tags.filter((tag) => typeof tag === 'string') : [],
          createdAt: note.createdAt || new Date().toISOString(),
          updatedAt: note.updatedAt || note.createdAt || new Date().toISOString(),
        }));
      }
    } catch (error) {
      console.warn('Could not read saved notes:', error);
      showToast('Saved notes could not be read.');
    }

    const starter = createStarterNote();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([starter])); } catch (error) { console.warn('Could not save starter note:', error); }
    return [starter];
  }

  function createId() {
    return globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function saveNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
      setSaveStatus(false);
      updateStorageMeter();
      return true;
    } catch (error) {
      console.error('Could not save notes:', error);
      setSaveStatus(false, 'Storage full');
      showToast('Could not save — browser storage may be full. Export a backup.');
      return false;
    }
  }

  function setSaveStatus(isSaving, message) {
    elements.saveStatus.classList.toggle('is-saving', isSaving);
    elements.saveStatusText.textContent = message || (isSaving ? 'Typing...' : 'All changes saved');
  }

  function queueSave() {
    setSaveStatus(true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      saveNotes();
      renderNotesList();
      renderFilters();
    }, 350);
  }

  function updateActiveNoteFromInputs() {
    if (isLoadingNote || !activeNoteId) return;
    const note = notes.find((item) => item.id === activeNoteId);
    if (!note) return;
    note.title = elements.title.value.trimStart();
    note.content = elements.editor.value;
    note.tags = parseTags(elements.tags.value);
    note.updatedAt = new Date().toISOString();
    elements.breadcrumb.textContent = displayTitle(note);
    renderMarkdown(note.content);
    updateCounts(note.content);
    queueSave();
  }

  function parseTags(value) {
    return [...new Set(value.split(',').map((tag) => tag.trim().replace(/^#/, '').slice(0, 30)).filter(Boolean))].slice(0, 12);
  }

  function displayTitle(note) {
    return note.title.trim() || 'Untitled note';
  }

  function renderActiveNote() {
    const note = notes.find((item) => item.id === activeNoteId);
    isLoadingNote = true;
    if (note) {
      elements.title.value = note.title;
      elements.tags.value = note.tags.join(', ');
      elements.editor.value = note.content;
      elements.breadcrumb.textContent = displayTitle(note);
      renderMarkdown(note.content);
      updateCounts(note.content);
    } else {
      elements.title.value = '';
      elements.tags.value = '';
      elements.editor.value = '';
      elements.breadcrumb.textContent = 'UNTITLED NOTE';
      renderMarkdown('');
      updateCounts('');
    }
    isLoadingNote = false;
    updateLineNumbers();
    renderNotesList();
    renderFilters();
    setSaveStatus(false);
  }

  function selectNote(id) {
    if (id === activeNoteId) return;
    flushPendingSave();
    activeNoteId = id;
    renderActiveNote();
    if (window.matchMedia('(max-width: 640px)').matches) setMobilePanel('editor');
  }

  function createNote() {
    flushPendingSave();
    const now = new Date().toISOString();
    const note = { id: createId(), title: '', content: '', tags: [], createdAt: now, updatedAt: now };
    notes.unshift(note);
    activeNoteId = note.id;
    saveNotes();
    renderActiveNote();
    if (window.matchMedia('(max-width: 640px)').matches) setMobilePanel('editor');
    elements.title.focus();
    showToast('A fresh page, just for you.');
  }

  function deleteNote(id) {
    const note = notes.find((item) => item.id === id);
    if (!note || !window.confirm(`Delete “${displayTitle(note)}”? This cannot be undone.`)) return;
    flushPendingSave();
    notes = notes.filter((item) => item.id !== id);
    if (activeNoteId === id) activeNoteId = notes[0]?.id ?? null;
    saveNotes();
    renderActiveNote();
    showToast('Note deleted.');
  }

  function flushPendingSave() {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    saveNotes();
    renderNotesList();
    renderFilters();
  }

  function renderNotesList() {
    const filteredNotes = getFilteredNotes();
    elements.notesList.replaceChildren();
    elements.filteredCount.textContent = `${filteredNotes.length}`;
    elements.sidebarCount.textContent = String(notes.length);
    elements.footerCount.textContent = `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`;

    if (!filteredNotes.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-notes';
      empty.innerHTML = searchTerm || activeFilter !== 'all'
        ? '<strong>No notes found</strong>Try a different search or tag.'
        : '<strong>Your notebook is empty</strong>Create a note to get started.';
      elements.notesList.append(empty);
      return;
    }

    for (const note of filteredNotes) {
      const card = document.createElement('div');
      card.className = `note-card${note.id === activeNoteId ? ' is-active' : ''}`;
      card.setAttribute('role', 'group');
      card.setAttribute('aria-label', `Open ${displayTitle(note)}`);
      card.addEventListener('click', () => selectNote(note.id));

      const title = document.createElement('button');
      title.type = 'button';
      title.className = 'note-card-title';
      title.textContent = displayTitle(note);
      const excerpt = document.createElement('span');
      excerpt.className = 'note-card-excerpt';
      excerpt.textContent = note.content.trim().replace(/^#+\s*/gm, '').replace(/[*_`>#\[\]]/g, '').replace(/\s+/g, ' ').slice(0, 100) || 'No content yet';
      const meta = document.createElement('span');
      meta.className = 'note-card-meta';
      const date = document.createElement('span');
      date.className = 'note-date';
      date.textContent = formatDate(note.updatedAt);
      meta.append(date);
      note.tags.slice(0, 2).forEach((tag) => {
        const badge = document.createElement('span');
        badge.className = 'note-tag';
        badge.textContent = `#${tag}`;
        meta.append(badge);
      });
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'delete-note-button';
      deleteButton.setAttribute('aria-label', `Delete ${displayTitle(note)}`);
      deleteButton.title = 'Delete note';
      deleteButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6 4.5V3h4v1.5m2-0  -.6 8.5H4.6L4 4.5m2.5 2v4m3-4v4"/></svg>';
      deleteButton.addEventListener('click', (event) => { event.stopPropagation(); deleteNote(note.id); });
      card.append(title, excerpt, meta, deleteButton);
      elements.notesList.append(card);
    }
  }

  function getFilteredNotes() {
    return [...notes].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).filter((note) => {
      const matchesTag = activeFilter === 'all' || note.tags.some((tag) => tag.toLowerCase() === activeFilter);
      const haystack = `${note.title} ${note.content} ${note.tags.join(' ')}`.toLowerCase();
      return matchesTag && (!searchTerm || haystack.includes(searchTerm));
    });
  }

  function renderFilters() {
    const tags = [...new Set([...DEFAULT_TAGS, ...notes.flatMap((note) => note.tags.map((tag) => tag.toLowerCase()))])].sort((a, b) => {
      const aDefault = DEFAULT_TAGS.indexOf(a);
      const bDefault = DEFAULT_TAGS.indexOf(b);
      if (aDefault !== -1 || bDefault !== -1) return (aDefault === -1 ? 99 : aDefault) - (bDefault === -1 ? 99 : bDefault);
      return a.localeCompare(b);
    });
    elements.tagFilters.replaceChildren();
    const chips = ['all', ...tags];
    if (!chips.includes(activeFilter)) activeFilter = 'all';
    chips.forEach((tag) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `filter-chip${activeFilter === tag ? ' is-active' : ''}`;
      button.textContent = `#${tag}`;
      button.setAttribute('aria-pressed', String(activeFilter === tag));
      button.addEventListener('click', () => {
        activeFilter = tag;
        elements.clearFilter.hidden = tag === 'all';
        renderFilters();
        renderNotesList();
      });
      elements.tagFilters.append(button);
    });
    elements.clearFilter.hidden = activeFilter === 'all';
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function updateCounts(content) {
    const words = content.trim() ? content.trim().split(/\s+/u).length : 0;
    elements.wordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
    elements.charCount.textContent = `${content.length} ${content.length === 1 ? 'character' : 'characters'}`;
  }

  function updateStorageMeter() {
    let used = 0;
    try {
      used = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;
    } catch { /* Storage may be disabled in private browsing. */ }
    const kilobytes = used / 1024;
    const label = kilobytes < 1 ? `${used} B` : `${kilobytes.toFixed(kilobytes < 10 ? 1 : 0)} KB`;
    elements.storageLabel.textContent = `${label} / 5 MB`;
    elements.storageFill.style.width = `${Math.min(100, (used / (5 * 1024 * 1024)) * 100)}%`;
  }

  function updateLineNumbers() {
    const lineCount = elements.editor.value.split('\n').length;
    elements.lineNumbers.textContent = Array.from({ length: lineCount }, (_, index) => index + 1).join('\n');
    elements.lineNumbers.scrollTop = elements.editor.scrollTop;
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }

  function safeUrl(rawUrl) {
    const value = rawUrl.trim().replace(/&amp;/g, '&');
    if (/^(https?:|mailto:)/i.test(value)) return value;
    if (/^(\/|#|\?|\.\/|\.\.\/)/.test(value) && !/^\/\//.test(value)) return value;
    return null;
  }

  function renderInline(source) {
    let text = escapeHtml(source);
    const fragments = [];
    const stash = (html) => {
      const token = `\u0000${fragments.length}\u0000`;
      fragments.push(html);
      return token;
    };

    text = text.replace(/`([^`]+)`/g, (_, code) => stash(`<code>${code}</code>`));
    text = text.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g, (match, alt, rawUrl, title) => {
      const url = safeUrl(rawUrl);
      return url ? stash(`<img src="${escapeHtml(url)}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy">`) : alt;
    });
    text = text.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)/g, (match, label, rawUrl, title) => {
      const url = safeUrl(rawUrl);
      return url ? stash(`<a href="${escapeHtml(url)}"${title ? ` title="${title}"` : ''} target="_blank" rel="noopener noreferrer">${label}</a>`) : label;
    });
    text = text.replace(/\*\*(.+?)\*\*|__(.+?)__/g, '<strong>$1$2</strong>');
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
    text = text.replace(/\*(?!\s)(.+?)(?<!\s)\*|_(?!\s)(.+?)(?<!\s)_/g, '<em>$1$2</em>');
    text = text.replace(/\u0000(\d+)\u0000/g, (_, index) => fragments[Number(index)] || '');
    return text;
  }

  function renderMarkdown(markdown) {
    if (!markdown.trim()) {
      elements.preview.innerHTML = '<p class="preview-placeholder">Your rendered note will appear here as you write.</p>';
      return;
    }

    const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
    const output = [];
    let index = 0;
    const isBlockStart = (line) => /^(\s*```|\s{0,3}#{1,6}\s|\s{0,3}>|\s{0,3}(?:[-*_]\s*){3,}$|\s{0,3}(?:[-+*]|\d+\.)\s+)/.test(line);

    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) { index += 1; continue; }

      const fence = line.match(/^\s*```\s*([\w-]*)\s*$/);
      if (fence) {
        const code = [];
        index += 1;
        while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) code.push(lines[index++]);
        if (index < lines.length) index += 1;
        output.push(`<pre><code${fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`);
        continue;
      }

      const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (heading) {
        const level = heading[1].length;
        output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
        index += 1;
        continue;
      }

      if (/^\s{0,3}(?:(?:[-*_]\s*){3,})\s*$/.test(line)) {
        output.push('<hr>');
        index += 1;
        continue;
      }

      if (/^\s{0,3}>/.test(line)) {
        const quoteLines = [];
        while (index < lines.length && /^\s{0,3}>/.test(lines[index])) quoteLines.push(lines[index++].replace(/^\s{0,3}>\s?/, ''));
        output.push(`<blockquote>${renderMarkdownFragment(quoteLines.join('\n'))}</blockquote>`);
        continue;
      }

      const listStart = line.match(/^\s{0,3}([-+*]|\d+\.)\s+(.+)$/);
      if (listStart) {
        const ordered = /^\d/.test(listStart[1]);
        const tag = ordered ? 'ol' : 'ul';
        const items = [];
        while (index < lines.length) {
          const item = lines[index].match(/^\s{0,3}([-+*]|\d+\.)\s+(.+)$/);
          if (!item || /^\d/.test(item[1]) !== ordered) break;
          let content = item[2];
          let taskClass = '';
          const task = content.match(/^\[([ xX])\]\s*(.*)$/);
          if (task) {
            taskClass = ' class="task-item"';
            content = `<input type="checkbox" disabled${task[1].toLowerCase() === 'x' ? ' checked' : ''}>${renderInline(task[2])}`;
          } else content = renderInline(content);
          items.push(`<li${taskClass}>${content}</li>`);
          index += 1;
        }
        output.push(`<${tag}>${items.join('')}</${tag}>`);
        continue;
      }

      if (/^\s{0,3}\|/.test(line) && index + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1])) {
        const rows = [line];
        index += 2;
        while (index < lines.length && /^\s*\|/.test(lines[index])) rows.push(lines[index++]);
        const splitRow = (row) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
        const headers = splitRow(rows[0]);
        const body = rows.slice(1).map(splitRow);
        output.push(`<table><thead><tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${headers.map((_, cellIndex) => `<td>${renderInline(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
        continue;
      }

      const paragraph = [line.trim()];
      index += 1;
      while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) paragraph.push(lines[index++].trim());
      output.push(`<p>${paragraph.map((part) => renderInline(part)).join('<br>')}</p>`);
    }

    elements.preview.innerHTML = output.join('\n');
  }

  function renderMarkdownFragment(markdown) {
    return markdown.split(/\n\s*\n/).map((part) => `<p>${part.split('\n').map((line) => renderInline(line)).join('<br>')}</p>`).join('');
  }

  function insertFormatting(type) {
    const textarea = elements.editor;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end);
    let before = '';
    let after = '';
    let replacement = selected;
    let selectionStart = start;
    let selectionEnd = end;

    if (type === 'bold') { before = '**'; after = '**'; }
    if (type === 'italic') { before = '*'; after = '*'; }
    if (type === 'link') {
      before = '[';
      after = '](https://)';
      selectionEnd = start + (selected || 'link text').length;
      if (!selected) replacement = 'link text';
    }
    if (type === 'code') {
      before = '\n```\n';
      after = '\n```\n';
      if (!selected) replacement = 'code goes here';
    }
    if (type === 'heading' || type === 'list' || type === 'quote') {
      const lineStart = textarea.value.lastIndexOf('\n', start - 1) + 1;
      const lineEnd = textarea.value.indexOf('\n', end);
      const actualEnd = lineEnd === -1 ? textarea.value.length : lineEnd;
      const line = textarea.value.slice(lineStart, actualEnd);
      const prefix = type === 'heading' ? '## ' : type === 'list' ? '- ' : '> ';
      replacement = line.split('\n').map((part) => part.startsWith(prefix) ? part.slice(prefix.length) : `${prefix}${part}`).join('\n');
      textarea.setRangeText(replacement, lineStart, actualEnd, 'select');
      textarea.focus();
      updateActiveNoteFromInputs();
      updateLineNumbers();
      return;
    }

    const insertion = `${before}${replacement}${after}`;
    textarea.setRangeText(insertion, start, end, 'select');
    if (type === 'link') {
      textarea.setSelectionRange(selectionStart + 1, selectionEnd + 1);
    } else if (selected) {
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    } else {
      const cursor = start + before.length + replacement.length;
      textarea.setSelectionRange(cursor, cursor);
    }
    textarea.focus();
    updateActiveNoteFromInputs();
    updateLineNumbers();
  }

  function exportNote(format) {
    const note = notes.find((item) => item.id === activeNoteId);
    if (!note) { showToast('Create or select a note before exporting.'); return; }
    let content = note.content;
    if (format === 'txt') {
      content = content
        .replace(/^```.*$/gm, '')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/^\s{0,3}>\s?/gm, '')
        .replace(/^\s*[-+*]\s+/gm, '• ')
        .replace(/^\s*\d+\.\s+/gm, '')
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*|__|~~|[*_]/g, '')
        .trim();
    }
    const blob = new Blob([content], { type: format === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slugify(displayTitle(note))}.${format}`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    closeExportMenu();
    showToast(`Exported ${format.toUpperCase()} file.`);
  }

  function slugify(value) {
    return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'note';
  }

  function showToast(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 2600);
  }

  function closeExportMenu() {
    elements.exportMenu.hidden = true;
    elements.exportButton.setAttribute('aria-expanded', 'false');
  }

  function setMobilePanel(panelName) {
    elements.workspace.dataset.mobilePanel = panelName;
    document.querySelectorAll('.mobile-tab').forEach((tab) => {
      const active = tab.dataset.panel === panelName;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
  }

  function setTheme(theme) {
    document.body.dataset.theme = theme;
    const dark = theme === 'dark';
    $('#themeToggleButton').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    $('#themeToggleButton').title = dark ? 'Switch to light theme' : 'Switch to dark theme';
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Theme still applies for this session. */ }
  }

  function setPreviewHidden(hidden) {
    elements.workspace.classList.toggle('preview-hidden', hidden);
    $('#togglePreviewButton').setAttribute('aria-pressed', String(!hidden));
    if (window.matchMedia('(max-width: 640px)').matches && !hidden) setMobilePanel('preview');
    if (window.matchMedia('(max-width: 640px)').matches && hidden && elements.workspace.dataset.mobilePanel === 'preview') setMobilePanel('editor');
  }

  document.querySelectorAll('[data-format]').forEach((button) => button.addEventListener('click', () => insertFormatting(button.dataset.format)));
  [elements.title, elements.tags, elements.editor].forEach((input) => input.addEventListener('input', updateActiveNoteFromInputs));
  elements.editor.addEventListener('input', updateLineNumbers);
  elements.editor.addEventListener('scroll', () => { elements.lineNumbers.scrollTop = elements.editor.scrollTop; });
  elements.editor.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      elements.editor.setRangeText('  ', elements.editor.selectionStart, elements.editor.selectionEnd, 'end');
      updateActiveNoteFromInputs();
      updateLineNumbers();
    }
    if ((event.ctrlKey || event.metaKey) && ['b', 'i'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      insertFormatting(event.key.toLowerCase() === 'b' ? 'bold' : 'italic');
    }
  });
  $('#newNoteButton').addEventListener('click', createNote);
  $('#sidebarNewNoteButton').addEventListener('click', createNote);
  elements.search.addEventListener('input', () => {
    searchTerm = elements.search.value.trim().toLowerCase();
    renderNotesList();
  });
  elements.clearFilter.addEventListener('click', () => {
    activeFilter = 'all';
    renderFilters();
    renderNotesList();
  });
  $('#togglePreviewButton').addEventListener('click', () => {
    if (window.matchMedia('(max-width: 900px)').matches) {
      setPreviewHidden(elements.workspace.dataset.mobilePanel === 'preview');
      return;
    }
    const hidden = !elements.workspace.classList.contains('preview-hidden');
    setPreviewHidden(hidden);
  });
  $('#themeToggleButton').addEventListener('click', () => setTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark'));
  $('#focusModeButton').addEventListener('click', (event) => {
    const entering = !elements.workspace.classList.contains('focus-mode');
    if (entering) {
      previewWasHidden = elements.workspace.classList.contains('preview-hidden');
      elements.workspace.classList.remove('preview-hidden');
    } else if (previewWasHidden) {
      elements.workspace.classList.add('preview-hidden');
    }
    elements.workspace.classList.toggle('focus-mode', entering);
    event.currentTarget.setAttribute('aria-pressed', String(entering));
    if (window.matchMedia('(max-width: 640px)').matches) setMobilePanel(entering ? 'preview' : 'editor');
  });
  elements.exportButton.addEventListener('click', () => {
    const isOpen = elements.exportButton.getAttribute('aria-expanded') === 'true';
    elements.exportMenu.hidden = isOpen;
    elements.exportButton.setAttribute('aria-expanded', String(!isOpen));
  });
  elements.exportMenu.querySelectorAll('[data-export]').forEach((button) => button.addEventListener('click', () => exportNote(button.dataset.export)));
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.export-wrap')) closeExportMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeExportMenu();
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      elements.search.focus();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') createNote();
  });
  document.querySelectorAll('.mobile-tab').forEach((tab) => tab.addEventListener('click', () => setMobilePanel(tab.dataset.panel)));
  window.addEventListener('beforeunload', flushPendingSave);
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      notes = loadNotes();
      if (!notes.some((note) => note.id === activeNoteId)) activeNoteId = notes[0]?.id ?? null;
      renderActiveNote();
      showToast('Notes updated in another tab.');
    }
  });

  try { setTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'); } catch { setTheme('light'); }
  setMobilePanel('notes');
  renderActiveNote();
  updateStorageMeter();
  if (!notes.length) setSaveStatus(false);
})();
