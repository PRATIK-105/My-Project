// PromptSave - Background Service Worker

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Seed with example prompts on first install
    const defaultPrompts = [
      {
        id: crypto.randomUUID(),
        title: "Fix my code",
        text: "Please review this code, identify any bugs or issues, and provide a corrected version with a brief explanation of what was wrong.",
        category: "coding",
        uses: 0,
        createdAt: Date.now(),
        pinned: false
      },
      {
        id: crypto.randomUUID(),
        title: "Summarize this",
        text: "Please summarize the following content in 3-5 bullet points, focusing on the key insights and actionable takeaways.",
        category: "productivity",
        uses: 0,
        createdAt: Date.now(),
        pinned: false
      },
      {
        id: crypto.randomUUID(),
        title: "Explain simply",
        text: "Explain the following concept as if I'm a complete beginner. Use simple language, real-world analogies, and a practical example.",
        category: "learning",
        uses: 0,
        createdAt: Date.now(),
        pinned: false
      },
      {
        id: crypto.randomUUID(),
        title: "Write email",
        text: "Write a professional email based on the following context. Keep it concise, clear, and polite. End with a clear call to action.",
        category: "writing",
        uses: 0,
        createdAt: Date.now(),
        pinned: false
      },
      {
        id: crypto.randomUUID(),
        title: "Roast my writing",
        text: "Critically review the following text. Be honest and direct. Point out weak arguments, unclear sentences, and suggest specific improvements.",
        category: "writing",
        uses: 0,
        createdAt: Date.now(),
        pinned: false
      }
    ];

    chrome.storage.local.set({
      prompts: defaultPrompts,
      settings: { theme: 'dark', pasteMode: 'auto' }
    });
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getPrompts') {
    chrome.storage.local.get(['prompts'], (result) => {
      sendResponse({ prompts: result.prompts || [] });
    });
    return true;
  }

  if (message.action === 'incrementUse') {
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      const idx = prompts.findIndex(p => p.id === message.id);
      if (idx !== -1) prompts[idx].uses = (prompts[idx].uses || 0) + 1;
      chrome.storage.local.set({ prompts });
      sendResponse({ ok: true });
    });
    return true;
  }
});
