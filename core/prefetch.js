// Optional pointer prediction for controls whose data is safe to load before activation.
// Callbacks live outside the DOM so transition clones never inherit prefetch work.
const callbacks = new WeakMap();
const selector = "[data-prefetch-intent]";

export function prefetchOnIntent(element, callback) {
  callbacks.set(element, callback);
  element.setAttribute("data-prefetch-intent", "");
  return element;
}

let managerPromise;
function loadManager() {
  return managerPromise ??= import("./vendor/foresight.js").then(({ ForesightManager }) =>
    ForesightManager.initialize({
      enableMousePrediction: true,
      enableScrollPrediction: false,
      enableTabPrediction: false,
      touchDeviceStrategy: "none",
      setDataAttributes: false,
    }));
}

// One observer follows the site's replaceChildren-based rendering. Hover, focus and touch
// still warm the same caches if the optional predictor cannot load or is unsupported.
export function observeIntent(root, { getManager = loadManager } = {}) {
  const registrations = new Map();
  let manager = null, destroyed = false;
  const eligible = (element) => !destroyed && element?.isConnected && root.contains(element)
    && callbacks.has(element) && !element.closest("[hidden], .ghost");
  const prefetch = async (element) => {
    if (!eligible(element)) return;
    try { await callbacks.get(element)(); } catch { /* Activation can retry failed preloads. */ }
  };
  const sync = () => {
    if (destroyed || !manager) return;
    for (const [element, registration] of registrations) {
      if (eligible(element)) continue;
      registration.unregister();
      registrations.delete(element);
    }
    for (const element of root.querySelectorAll(selector)) {
      if (!eligible(element) || registrations.has(element)) continue;
      registrations.set(element, manager.register({ element, callback: () => prefetch(element) }));
    }
  };
  const containsTarget = (node) => node.nodeType === 1 && (node.matches(selector) || node.querySelector(selector));
  const Observer = root.ownerDocument.defaultView.MutationObserver;
  const observer = new Observer((records) => {
    // Playback text updates must not repeatedly scan all of the site's controls.
    if (records.some((record) => record.type === "attributes"
      || [...record.addedNodes, ...record.removedNodes].some(containsTarget))) sync();
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true,
    attributeFilter: ["hidden", "data-prefetch-intent"] });
  const onIntent = (event) => {
    const element = event.target.closest?.(selector);
    if (event.type === "pointerover" && element?.contains(event.relatedTarget)) return;
    void prefetch(element);
  };
  const events = ["pointerover", "focusin", "touchstart"];
  for (const event of events) root.addEventListener(event, onIntent, { passive: true });
  Promise.resolve().then(getManager).then((loaded) => {
    if (destroyed) return;
    manager = loaded;
    sync();
  }).catch(() => { /* Prediction is progressive enhancement; navigation stays available. */ });
  return () => {
    destroyed = true;
    observer.disconnect();
    for (const event of events) root.removeEventListener(event, onIntent);
    for (const registration of registrations.values()) registration.unregister();
    registrations.clear();
  };
}
