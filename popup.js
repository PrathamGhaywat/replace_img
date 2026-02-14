document.addEventListener("DOMContentLoaded", () => {
  const termInput = document.getElementById("term");
  const replaceBtn = document.getElementById("replace");
  const toggleBtn = document.getElementById("toggle-enable");
  const previewImg = document.getElementById("preview");
  const status = document.getElementById("status");
  const lastUsed = document.getElementById("last-used");
  let saveTimer = null;

  function setEnabledState(enabled) {
    toggleBtn.textContent = enabled ? "Disable" : "Enable";
    toggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    replaceBtn.disabled = !enabled;
    toggleBtn.classList.toggle("enabled", enabled);
    toggleBtn.classList.toggle("disabled", !enabled);
  }

  chrome.storage.local.get({ term: "cat", enabled: true }, (items) => {
    termInput.value = items.term || "";
    lastUsed.textContent = items.term || "—";
    updatePreview(items.term || "");
    setEnabledState(!!items.enabled);
  });

  function saveTermAndEnable(value) {
    const q = (typeof value === "string" ? value : termInput.value.trim()) || "cat";
    chrome.storage.local.set({ term: q, enabled: true }, () => {
      lastUsed.textContent = q;
      setEnabledState(true);
      status.textContent = "Applied";
      setTimeout(() => (status.textContent = ""), 900);
    });
  }

  termInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveTermAndEnable(termInput.value.trim());
    }
  });

  termInput.addEventListener("blur", () => saveTermAndEnable(termInput.value.trim()));

  termInput.addEventListener("input", () => {
    updatePreview(termInput.value.trim());
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveTermAndEnable(termInput.value.trim()), 700);
  });

  replaceBtn.addEventListener("click", () => {
    const q = termInput.value.trim() || "cat";
    status.textContent = "Replacing...";
    chrome.storage.local.set({ term: q, enabled: true }, () => {
      lastUsed.textContent = q;
      setEnabledState(true);
    });

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

  toggleBtn.addEventListener("click", () => {
    const currentlyEnabled = toggleBtn.classList.contains("enabled");
    const enabled = !currentlyEnabled;
    chrome.storage.local.set({ enabled }, () => setEnabledState(enabled));

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab) return;

      if (!enabled) {
        chrome.tabs.sendMessage(tab.id, { action: "set-enabled", enabled: false }, (resp) => {
          if (chrome.runtime.lastError) {
            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
              chrome.tabs.sendMessage(tab.id, { action: "set-enabled", enabled: false });
            });
          }
        });
      } else {
        const q = termInput.value.trim() || "cat";
        chrome.tabs.sendMessage(tab.id, { action: "replace-images", query: q }, (resp) => {
          if (chrome.runtime.lastError) {
            chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
              chrome.tabs.sendMessage(tab.id, { action: "replace-images", query: q });
            });
          }
        });
      }
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