// PromptSave — popup.js

const PLATFORMS = {
  'chatgpt.com':        { name: 'ChatGPT',    active: true },
  'chat.openai.com':    { name: 'ChatGPT',    active: true },
  'claude.ai':          { name: 'Claude',     active: true },
  'gemini.google.com':  { name: 'Gemini',     active: true },
  'perplexity.ai':      { name: 'Perplexity', active: true },
  'copilot.microsoft.com': { name: 'Copilot', active: true },
  'grok.x.com':         { name: 'Grok',       active: true },
  'chat.mistral.ai':    { name: 'Mistral',    active: true },
};

let allPrompts = [];
let activeCategory = 'all';
let searchQuery = '';
let currentTabId = null;
let isOnAISite = false;

// ── Init ──
document.addEventListener('DOMContentLoaded', async () => {
  await loadPrompts();
  await detectPlatform();
  renderList();
  bindEvents();
});

async function loadPrompts() {
  return new Promise(resolve => {
    chrome.storage.local.get(['prompts'], (result) => {
      allPrompts = result.prompts || [];
      resolve();
    });
  });
}

async function detectPlatform() {
  return new Promise(resolve => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) { resolve(); return; }
      currentTabId = tabs[0].id;
      const url = tabs[0].url || '';
      const dot = document.getElementById('platformDot');
      const nameEl = document.getElementById('platformName');

      for (const [domain, info] of Object.entries(PLATFORMS)) {
        if (url.includes(domain)) {
          dot.classList.add('active');
          nameEl.textContent = `On ${info.name} — click to paste`;
          isOnAISite = true;
          resolve();
          return;
        }
      }
      nameEl.textContent = 'Open an AI site to paste';
      resolve();
    });
  });
}

// ── Render ──
function renderList() {
  const wrap = document.getElementById('listWrap');
  const badge = document.getElementById('countBadge');

  let filtered = allPrompts.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const q = searchQuery.toLowerCase();
    const matchQ = !q || p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  // Pinned first
  filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  badge.textContent = `${allPrompts.length} prompt${allPrompts.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2">
          <rect x="4" y="6" width="24" height="20" rx="3"/>
          <path d="M10 12h12M10 17h8" stroke-linecap="round"/>
        </svg>
        <p>${searchQuery ? 'No prompts match your search.' : 'No prompts here yet.\nClick + to add your first one.'}</p>
      </div>`;
    return;
  }

  wrap.innerHTML = filtered.map(p => buildCard(p)).join('');
  bindCardEvents();
}

function buildCard(p) {
  const q = searchQuery.toLowerCase();
  const title = q ? highlight(escHtml(p.title), q) : escHtml(p.title);
  const preview = q ? highlight(escHtml(p.text), q) : escHtml(p.text);

  return `
  <div class="prompt-card ${p.pinned ? 'pinned' : ''}" data-id="${p.id}">
    <div class="card-top">
      <div class="card-title">${title}</div>
      <div class="card-actions">
        <button class="card-btn pin-btn ${p.pinned ? 'pin-active' : ''}" data-id="${p.id}" title="Pin">
          <svg viewBox="0 0 12 12" fill="${p.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.5">
            <path d="M9 1L3 7M7.5 1.5l3 3L9 6 6 9 3 6l1.5-1.5L3 3l4.5-1.5z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="card-btn edit-btn" data-id="${p.id}" title="Edit">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="card-btn copy-btn" data-id="${p.id}" title="Copy">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="4" y="4" width="7" height="7" rx="1"/>
            <path d="M1 8V1h7" stroke-linecap="round"/>
          </svg>
        </button>
        <button class="card-btn danger del-btn" data-id="${p.id}" title="Delete">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2 3h8M5 3V1h2v2M4 5l.5 5h3L8 5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="card-preview">${preview}</div>
    <div class="card-footer">
      <span class="cat-badge cat-${p.category}">${p.category}</span>
      <span class="use-count">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1 9L5 1l4 8H1z" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ${p.uses || 0} uses
      </span>
    </div>
  </div>`;
}

function bindCardEvents() {
  // Click card = paste/copy
  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const id = card.dataset.id;
      const prompt = allPrompts.find(p => p.id === id);
      if (!prompt) return;
      usePrompt(prompt);
    });
  });

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = allPrompts.find(x => x.id === btn.dataset.id);
      if (!p) return;
      navigator.clipboard.writeText(p.text);
      btn.style.color = 'var(--accent)';
      setTimeout(() => btn.style.color = '', 1000);
      incrementUse(p.id);
    });
  });

  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePrompt(btn.dataset.id);
    });
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const p = allPrompts.find(x => x.id === btn.dataset.id);
      if (p) openForm(p);
    });
  });

  document.querySelectorAll('.pin-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      togglePin(btn.dataset.id);
    });
  });
}

// ── Use prompt ──
async function usePrompt(prompt) {
  incrementUse(prompt.id);

  if (isOnAISite && currentTabId) {
    try {
      await chrome.tabs.sendMessage(currentTabId, {
        action: 'injectPrompt',
        text: prompt.text
      });
      window.close();
    } catch {
      // Content script not ready — fallback to clipboard
      navigator.clipboard.writeText(prompt.text);
      showPopupToast('Copied! Paste it in the AI chat.');
    }
  } else {
    navigator.clipboard.writeText(prompt.text);
    showPopupToast('Copied to clipboard!');
  }
}

function incrementUse(id) {
  const idx = allPrompts.findIndex(p => p.id === id);
  if (idx !== -1) {
    allPrompts[idx].uses = (allPrompts[idx].uses || 0) + 1;
    savePrompts();
  }
}

function togglePin(id) {
  const idx = allPrompts.findIndex(p => p.id === id);
  if (idx !== -1) {
    allPrompts[idx].pinned = !allPrompts[idx].pinned;
    savePrompts();
    renderList();
  }
}

function deletePrompt(id) {
  allPrompts = allPrompts.filter(p => p.id !== id);
  savePrompts();
  renderList();
}

function savePrompts() {
  chrome.storage.local.set({ prompts: allPrompts });
}

// ── Form ──
function openForm(existing = null) {
  const overlay = document.getElementById('formOverlay');
  document.getElementById('formTitle').textContent = existing ? 'Edit Prompt' : 'New Prompt';
  document.getElementById('formTitleInput').value = existing ? existing.title : '';
  document.getElementById('formTextInput').value = existing ? existing.text : '';
  document.getElementById('formCatInput').value = existing ? existing.category : 'coding';
  document.getElementById('editingId').value = existing ? existing.id : '';
  overlay.classList.add('show');
  document.getElementById('formTitleInput').focus();
}

function closeForm() {
  document.getElementById('formOverlay').classList.remove('show');
}

function saveForm() {
  const title = document.getElementById('formTitleInput').value.trim();
  const text = document.getElementById('formTextInput').value.trim();
  const category = document.getElementById('formCatInput').value;
  const editingId = document.getElementById('editingId').value;

  if (!title || !text) {
    document.getElementById(title ? 'formTextInput' : 'formTitleInput').style.borderColor = 'var(--danger)';
    setTimeout(() => {
      document.getElementById('formTitleInput').style.borderColor = '';
      document.getElementById('formTextInput').style.borderColor = '';
    }, 1500);
    return;
  }

  if (editingId) {
    const idx = allPrompts.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      allPrompts[idx] = { ...allPrompts[idx], title, text, category };
    }
  } else {
    allPrompts.unshift({
      id: crypto.randomUUID(),
      title, text, category,
      uses: 0,
      createdAt: Date.now(),
      pinned: false
    });
  }

  savePrompts();
  renderList();
  closeForm();
}

// ── Export / Import ──
function exportPrompts() {
  const data = JSON.stringify({ version: 1, prompts: allPrompts }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `promptsave-export-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importPrompts() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        const imported = data.prompts || [];
        // Merge, avoid duplicates by id
        const existingIds = new Set(allPrompts.map(p => p.id));
        const newOnes = imported.filter(p => !existingIds.has(p.id));
        allPrompts = [...allPrompts, ...newOnes];
        savePrompts();
        renderList();
        showPopupToast(`Imported ${newOnes.length} prompt(s)!`);
      } catch {
        showPopupToast('Invalid file format.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ── Events ──
function bindEvents() {
  document.getElementById('addBtn').addEventListener('click', () => openForm());
  document.getElementById('closeFormBtn').addEventListener('click', closeForm);
  document.getElementById('saveFormBtn').addEventListener('click', saveForm);
  document.getElementById('exportBtn').addEventListener('click', exportPrompts);
  document.getElementById('importBtn').addEventListener('click', importPrompts);

  document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderList();
  });

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeCategory = tab.dataset.cat;
      renderList();
    });
  });

  // Enter to save form
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeForm();
    if (e.key === 'Enter' && e.ctrlKey && document.getElementById('formOverlay').classList.contains('show')) {
      saveForm();
    }
  });
}

// ── Helpers ──
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function highlight(str, q) {
  if (!q) return str;
  const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return str.replace(regex, '<mark>$1</mark>');
}

function showPopupToast(msg) {
  const existing = document.getElementById('popup-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'popup-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 50px; left: 50%; transform: translateX(-50%);
    background: var(--bg3); color: var(--accent);
    border: 1px solid var(--accent); border-radius: 8px;
    padding: 8px 16px; font-size: 12px; z-index: 100;
    white-space: nowrap; pointer-events: none;
    animation: fadeToast 2s forwards;
  `;
  document.body.appendChild(toast);

  const style = document.createElement('style');
  style.textContent = `@keyframes fadeToast { 0%{opacity:1} 70%{opacity:1} 100%{opacity:0} }`;
  document.head.appendChild(style);
  setTimeout(() => { toast.remove(); style.remove(); }, 2100);
}
