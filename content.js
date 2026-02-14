async function getOpenverseImageUrl(query = "dog") {
  const url = `https://api.openverse.org/v1/images/?format=json&q=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.results || data.results.length === 0) return null;

    const randomImage = data.results[Math.floor(Math.random() * data.results.length)];
    return randomImage.url;
  } catch (err) {
    console.error("Openverse API error:", err);
    return null;
  }
}

async function replaceImgWithOpenverse(img, query = "cat") {
  const imageUrl = await getOpenverseImageUrl(query);
  if (!imageUrl) return;

  if (img.src) img.src = imageUrl;
  if (img.srcset) img.srcset = imageUrl;

  img.style.objectFit = "cover";
}

document.querySelectorAll("img").forEach(img => replaceImgWithOpenverse(img));

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (node.tagName === "IMG") {
        replaceImgWithOpenverse(node);
      } else if (node.querySelectorAll) {
        node.querySelectorAll("img").forEach(img => replaceImgWithOpenverse(img));
      }
    });
  }
});

observer.observe(document.body, { childList: true, subtree: true });
