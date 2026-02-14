let currentQuery = null;

async function getOpenverseImageUrl(query) {
  if (!query) return null;
  const url = `https://api.openverse.org/v1/images/?format=json&q=${encodeURIComponent(query)}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.results || data.results.length === 0) return null;
    const randomImage = data.results[Math.floor(Math.random() * data.results.length)];
    return randomImage?.url || randomImage?.thumbnail || null;
  } catch (err) {
    console.error("Openverse API error:", err);
    return null;
  }
}

async function replaceImageElement(img, query) {
  const imageUrl = await getOpenverseImageUrl(query);
  if (!imageUrl) return;
  try {
    img.src = imageUrl;
    img.removeAttribute("srcset");
    img.style.objectFit = "cover";
  } catch (e) {
  }
}

function replaceAllImages(query) {
  currentQuery = query || null;
  if (!currentQuery) return;
  document.querySelectorAll("img").forEach(img => replaceImageElement(img, currentQuery));
}

/* receive requests from the popup */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "replace-images") {
    replaceAllImages(message.query || "cat");
    sendResponse({ status: "ok" });
    return true;
  }

  if (message?.action === "set-enabled") {
    if (!message.enabled) currentQuery = null;
    sendResponse({ status: "ok", enabled: !!message.enabled });
    return true;
  }

  return false;
});

const observer = new MutationObserver(mutations => {
  if (!currentQuery) return;
  for (const mutation of mutations) {
    mutation.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.tagName === "IMG") {
        replaceImageElement(node, currentQuery);
      } else if (node.querySelectorAll) {
        node.querySelectorAll("img").forEach(img => replaceImageElement(img, currentQuery));
      }
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });
