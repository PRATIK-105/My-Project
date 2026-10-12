// PromptSave - Content Script
// Runs on all supported AI platforms and handles prompt injection

const PLATFORM_SELECTORS = {
  'chatgpt.com': '#prompt-textarea, [data-id="root"] textarea',
  'chat.openai.com': '#prompt-textarea, textarea',
  'claude.ai': '[contenteditable="true"].ProseMirror, div[contenteditable="true"]',
  'gemini.google.com': '.ql-editor, [contenteditable="true"], rich-textarea .ql-editor',
  'perplexity.ai': 'textarea[placeholder], .overflow-auto textarea',
  'copilot.microsoft.com': 'textarea, [contenteditable="true"]',
  'grok.x.com': 'textarea, [contenteditable="true"]',
  'chat.mistral.ai': 'textarea, [contenteditable="true"]'
};

function getInputSelector() {
  const host = window.location.hostname.replace('www.', '');
  for (const [domain, selector] of Object.entries(PLATFORM_SELECTORS)) {
    if (host.includes(domain)) return selector;
  }
  return 'textarea, [contenteditable="true"]';
}

function injectPrompt(text) {
  const selector = getInputSelector();
  const el = document.querySelector(selector);

  if (!el) {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard! (Could not find input box)');
    return;
  }

  el.focus();

  // Handle contenteditable divs (Claude, Gemini)
  if (el.isContentEditable) {
    // Clear and set
    el.innerHTML = '';
    document.execCommand('insertText', false, text);

    // Dispatch events so React/Vue picks it up
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // Handle textarea (ChatGPT, Perplexity)
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeInputValueSetter.call(el, text);

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  el.scrollTop = el.scrollHeight;
  showToast('✓ Prompt injected!');
}

function showToast(msg) {
  const existing = document.getElementById('promptsave-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'promptsave-toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: #18181b;
    color: #a3e635;
    font-family: 'DM Mono', monospace, sans-serif;
    font-size: 13px;
    padding: 10px 18px;
    border-radius: 8px;
    border: 1px solid #a3e635;
    z-index: 999999;
    pointer-events: none;
    opacity: 1;
    transition: opacity 0.4s ease;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; }, 1800);
  setTimeout(() => toast.remove(), 2300);
}

// Listen for inject messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'injectPrompt') {
    injectPrompt(message.text);
    sendResponse({ ok: true });
  }
});
