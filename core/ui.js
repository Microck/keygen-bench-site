// DOM widgets in FT2 dress (dropdown, badge, nav buttons).
import { logoURL } from "./logos.js";

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
  return el;
}

export function badge(maker, size = 16) {
  return h("img", { class: "badge", src: logoURL(maker, 1), width: size, height: size, alt: "", title: maker, style: { width: size + "px", height: size + "px" } });
}

// FT2-looking dropdown: sunken face + arrow pushbutton, popup list styled like the Disk Op file list.
// items: [{ value, label, badge?, right? }]
// `onHover(value)`: an item is pointed at or keyboard-highlighted (lets callers prefetch what it opens).
export function dropdown({ items, value, onChange, onHover, label, width }) {
  let open = false, active = Math.max(0, items.findIndex((i) => i.value === value));
  const face = h("div", { class: "dd-face sunken", role: "combobox", tabindex: "0", "aria-expanded": "false", "aria-label": label });
  const arrow = h("button", { class: "btn dd-arrow", tabindex: "-1", "aria-hidden": "true" }, "\u25BC");
  const pop = h("div", { class: "dd-pop ft2-scroll", role: "listbox", hidden: true });
  const root = h("div", { class: "dd", style: width ? { width: width + "px" } : null }, face, arrow, pop);
  const renderFace = () => {
    const it = items.find((i) => i.value === value);
    face.replaceChildren(...(it ? [it.badge ? badge(it.badge) : null, " ", it.label].filter(Boolean) : ["-"]));
    face.title = it?.label ?? "";
    face.style.display = "flex"; face.style.gap = "3px"; face.style.alignItems = "center";
  };
  const renderPop = () => {
    pop.replaceChildren(...items.map((it, i) => h("div", {
      class: "list-row" + (it.value === value ? " sel" : "") + (i === active ? " hl" : ""), role: "option",
      "aria-selected": String(it.value === value), onmousedown: (e) => { e.preventDefault(); pick(it.value); },
      onmouseenter: onHover && (() => onHover(it.value)),
    }, it.badge ? badge(it.badge) : null, h("span", { style: { flex: "1", overflow: "hidden" } }, it.label), it.right ? h("span", { class: "muted" }, it.right) : null)));
    // Keep the active row visible by scrolling the popup only; scrollIntoView would also scroll every
    // scrollable ancestor (the page wells), which shoves the page around.
    const row = pop.children[active];
    if (row) {
      if (row.offsetTop < pop.scrollTop) pop.scrollTop = row.offsetTop;
      else if (row.offsetTop + row.offsetHeight > pop.scrollTop + pop.clientHeight) pop.scrollTop = row.offsetTop + row.offsetHeight - pop.clientHeight;
    }
  };
  // Fit the popup inside the nearest clipping ancestor so it never runs off the bottom of a well.
  const fitPop = () => {
    let clip = root.parentElement;
    while (clip && !/(auto|scroll|hidden)/.test(getComputedStyle(clip).overflowY)) clip = clip.parentElement;
    const bottom = clip ? clip.getBoundingClientRect().bottom : innerHeight;
    const zoom = face.getBoundingClientRect().height / face.offsetHeight || 1; // inherited CSS zoom
    pop.style.maxHeight = Math.max(40, Math.floor((bottom - face.getBoundingClientRect().bottom) / zoom) - 4) + "px";
  };
  const setOpen = (v) => { open = v; pop.hidden = !v; face.setAttribute("aria-expanded", String(v)); arrow.classList.toggle("pressed", v); if (v) { fitPop(); renderPop(); } };
  const pick = (v) => { setOpen(false); if (v !== value) { value = v; renderFace(); onChange(v); } face.focus({ preventScroll: true }); };
  // Mouse focus shows no ring; keyboard focus shows FT2's dotted inset (see .dd-face[data-kb]).
  face.addEventListener("mousedown", (e) => { e.preventDefault(); delete face.dataset.kb; face.focus({ preventScroll: true }); setOpen(!open); });
  arrow.addEventListener("mousedown", (e) => { e.preventDefault(); delete face.dataset.kb; face.focus({ preventScroll: true }); setOpen(!open); });
  face.addEventListener("keyup", (e) => { if (e.key === "Tab") face.dataset.kb = ""; });
  face.addEventListener("blur", () => { delete face.dataset.kb; });
  face.addEventListener("blur", () => setOpen(false));
  face.addEventListener("keydown", (e) => {
    face.dataset.kb = "";
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault(); e.stopPropagation();
      if (!open) setOpen(true);
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; renderPop();
      onHover?.(items[active].value);
    } else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open ? pick(items[active].value) : setOpen(true); }
    else if (e.key === "Escape") setOpen(false);
  });
  renderFace();
  return root;
}

export function makerItems(data) {
  return data.makers.map((m) => ({ value: m.name, label: m.name, badge: m.name, right: String(m.models.length) }));
}
// Tracker model list: each model's best attempt, newest model release first. Unknown dates are last.
// A non-best attempt opened from Rankings replaces its model's best entry while it is current.
export function modelItems(data, maker, current) {
  const mk = data.makers.find((m) => m.name === maker);
  return (mk?.runs ?? []).filter((r) => r.slug === current || (r.isBest && r.model !== data.bySlug[current]?.model)).sort((a, b) =>
    (a.model.releaseDate == null) - (b.model.releaseDate == null)
    || (b.model.releaseDate ?? "").localeCompare(a.model.releaseDate ?? "")
    || a.model.best.label.localeCompare(b.model.best.label)
    || a.model.key.localeCompare(b.model.key))
    .map((r) => ({ value: r.slug, label: r.label, right: r.score.toFixed(1) }));
}

export function scoreColor(s) {
  // 4-bit ramp for ranking bars.
  return s >= 70 ? "#55FF55" : s >= 50 ? "#FFFF55" : s >= 25 ? "#FFAA00" : "#FF5555";
}
