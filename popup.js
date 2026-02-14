document.addEventListener("DOMContentLoaded", () => {
  const termInput = document.getElementById("term");
  const replaceBtn = document.getElementById("replace");
  const previewImg = document.getElementById("preview");
  const status = document.getElementById("status");
  const lastUsed = document.getElementById("last-used");

  chrome.storage.local.get({ term: "cat" }, (items) => {
    termInput.value = items.term || "";
    lastUsed.textContent = items.term || "—";
    updatePreview(items.term || "");
  });

  termInput.addEventListener("input", () => updatePreview(termInput.value.trim()));

  replaceBtn.addEventListener("click", () => {
    const q = termInput.value.trim() || "cat";
    status.textContent = "Replacing...";
    chrome.storage.local.set({ term: q }, () => (lastUsed.textContent = q));

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) {
        status.textContent = "No active tab";
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: "replace-images", query: q }, (resp) => {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
            chrome.tabs.sendMessage(tab.id, { action: "replace-images", query: q });
            status.textContent = "Done";
            setTimeout(() => (status.textContent = ""), 1200);
          });
        } else {
          status.textContent = "Done";
          setTimeout(() => (status.textContent = ""), 1200);
        }
      });
    });
  });

  async function updatePreview(query) {
    if (!query) {
      previewImg.src = "";
      return;
    }
    try {
      const url = `https://api.openverse.org/v1/images/?format=json&q=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      previewImg.src = (data.results && data.results[0] && (data.results[0].url || data.results[0].thumbnail)) || "";
    } catch {
      previewImg.src = "";
    }
  }
});