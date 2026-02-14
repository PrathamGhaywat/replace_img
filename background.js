chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
  });
});

function forEachInjectableTab(cb) {
  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.id || !tab.url || !/^https?:/.test(tab.url)) continue;
      cb(tab);
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;

  if (changes.enabled) {
    const enabled = !!changes.enabled.newValue;
    if (!enabled) {
      forEachInjectableTab(tab => chrome.tabs.sendMessage(tab.id, { action: "set-enabled", enabled: false }, () => {}));
      return;
    }

    chrome.storage.local.get({ term: "cat" }, (items) => {
      const term = items.term || "cat";
      forEachInjectableTab((tab) => {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
          chrome.tabs.sendMessage(tab.id, { action: "replace-images", query: term }, () => {});
        });
      });
    });
    return;
  }

  if (changes.term) {
    chrome.storage.local.get({ enabled: false }, (items) => {
      if (!items.enabled) return;
      const newTerm = changes.term.newValue;
      forEachInjectableTab((tab) => {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
          chrome.tabs.sendMessage(tab.id, { action: "replace-images", query: newTerm }, () => {});
        });
      });
    });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ enabled: true, term: "cat" }, (items) => {
    if (!items.enabled) return;
    forEachInjectableTab((tab) => {
      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
        chrome.tabs.sendMessage(tab.id, { action: "replace-images", query: items.term }, () => {});
      });
    });
  });
});
