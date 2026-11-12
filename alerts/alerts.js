const CONFIG = {
  USE_MOCK: true,
  API_BASE: "/api",
  PAGE_SIZE: 10,
  DEFAULT_LINK: "../borrows/borrows.html"
};


const list = document.getElementById("alertList");
const statusEl = document.getElementById("status");
const pagination = document.getElementById("pagination");
const viewSelect = document.getElementById("viewSelect");
const markAllBtn = document.getElementById("markAll");
const tabs = document.querySelectorAll(".tab");
const toast = document.getElementById("toast");
const toastMsg = document.getElementById("toastMsg");
const toastUndo = document.getElementById("toastUndo");

let page = 1;            // Current page
let view = "inbox";      // Current tab
let viewToken = 0;       // Tab change counter
let lastRemoved = null;  // Undo data
let toastTimer = null;

// Icons
const ICON_ARCHIVE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>';
const ICON_UNARCHIVE = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.55 5.22l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.15.55L3.46 5.22C3.17 5.57 3 6.02 3 6.5V19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.45-1.28zM12 9.5l5.5 5.5H14v2h-4v-2H6.5L12 9.5zM5.12 5l.82-1h12l.94 1H5.12z"/></svg>';

/* ---------- API ---------- */
async function apiFetch(path, options = {}) {
  const res = await fetch(CONFIG.API_BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!res.ok) throw new Error("Request failed: " + res.status);
  return res.status === 204 ? null : res.json();
}

// Get alerts
function getAlerts(offset, v) {
  const archived = v === "archived";
  if (CONFIG.USE_MOCK) return mockGetAlerts(offset, archived);
  return apiFetch(`/alerts?offset=${offset}&limit=${CONFIG.PAGE_SIZE}&archived=${archived}`);
}
function markRead(id) {
  if (CONFIG.USE_MOCK) { markDueAlertRead(id); return Promise.resolve(); }
  return apiFetch(`/alerts/${encodeURIComponent(id)}/read`, { method: "PATCH" });
}
function markAllRead() {
  if (CONFIG.USE_MOCK) { markAllDueAlertsRead(); return Promise.resolve(); }
  return apiFetch("/alerts/read-all", { method: "POST" });
}
function archiveAlert(id, archived) {
  if (CONFIG.USE_MOCK) { setDueAlertArchived(id, archived); return Promise.resolve(); }
  return apiFetch(`/alerts/${encodeURIComponent(id)}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ archived })
  });
}

/* ---------- Mock data ---------- */
function mockGetAlerts(offset, archived) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const all = getDueAlerts().filter(a => a.is_archived === archived);
        const end = offset + CONFIG.PAGE_SIZE;
        resolve({ alerts: all.slice(offset, end), total: all.length });
      } catch (err) {
        reject(err);
      }
    }, 400);
  });
}

/* ---------- Helpers ---------- */
function timeAgo(iso) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso)) / 60000));
  if (mins < 60) return `${mins} ${mins === 1 ? "min" : "mins"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

// Safe link check
function safeLink(link) {
  try {
    const url = new URL(link || CONFIG.DEFAULT_LINK, window.location.href);
    return url.origin === window.location.origin ? url.href : CONFIG.DEFAULT_LINK;
  } catch {
    return CONFIG.DEFAULT_LINK;
  }
}

function setStatus(text) { statusEl.textContent = text; }

function emptyText() {
  return view === "archived"
    ? "No archived alerts."
    : "No alerts yet. We’ll let you know when something needs your attention.";
}

/* ---------- Rendering ---------- */
function buildAlert(a) {
  const li = document.createElement("li");
  li.className = "alert " + (a.is_read ? "is-read" : "is-unread");
  li.dataset.id = a.id;

  const link = document.createElement("a");
  link.className = "alert__link";
  link.dataset.href = safeLink(a.link);   // Link destination
  link.href = "#";

  const dot = document.createElement("i");
  dot.className = "dot";
  dot.setAttribute("aria-hidden", "true");

  const time = document.createElement("time");
  time.className = "alert__time";
  time.dateTime = a.created_at;
  time.innerHTML = timeAgo(a.created_at).replace(/\d+/g, '<span class="num">$&</span>');

  const msg = document.createElement("span");
  msg.className = "alert__msg";
  msg.textContent = a.message;

  link.append(dot, time, msg);

  // Archive button
  const archiveBtn = document.createElement("button");
  const label = view === "archived" ? "Move to inbox" : "Archive alert";
  archiveBtn.type = "button";
  archiveBtn.className = "alert__archive";
  archiveBtn.title = label;
  archiveBtn.setAttribute("aria-label", label);
  archiveBtn.innerHTML = view === "archived" ? ICON_UNARCHIVE : ICON_ARCHIVE;

  li.append(link, archiveBtn);
  return li;
}

async function loadAlerts() {
  const token = viewToken;
  pagination.hidden = true;
  setStatus("Loading…");

  try {
    const data = await getAlerts((page - 1) * CONFIG.PAGE_SIZE, view);
    if (token !== viewToken) return;   // Ignore old response
    const pages = Math.max(1, Math.ceil(data.total / CONFIG.PAGE_SIZE));
    if (page > pages) { page = pages; return loadAlerts(); }   // Fix page number

    list.replaceChildren(...data.alerts.map(buildAlert));
    setStatus(data.alerts.length ? "" : emptyText());
    renderPagination(pages);
  } catch (err) {
    if (token === viewToken) setStatus("We couldn’t load your alerts. Check your connection and try again.");
  }
}

function renderPagination(pages) {
  pagination.replaceChildren();
  pagination.hidden = false;
  const add = (label, target, opts) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "page-btn" + (opts.active ? " is-active" : "");
    b.textContent = label;
    b.setAttribute("aria-label", opts.aria);
    if (opts.active) b.setAttribute("aria-current", "page");
    b.disabled = !!opts.disabled;
    b.addEventListener("click", () => {
      page = target;
      hideToast();
      loadAlerts();
      list.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    pagination.appendChild(b);
  };
  add("‹ Prev", page - 1, { disabled: page === 1, aria: "Previous page" });
  for (let i = 1; i <= pages; i++) add(String(i), i, { active: i === page, aria: "Page " + i });
  add("Next ›", page + 1, { disabled: page === pages, aria: "Next page" });
}

/* ---------- Undo toast ---------- */
function showToast(text) {
  toastMsg.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hideToast, 6000);
}
function hideToast() {
  toast.hidden = true;
  clearTimeout(toastTimer);
  lastRemoved = null;
}

/* ---------- Archive / Unarchive ---------- */
function removeRow(li) {
  li.style.height = li.offsetHeight + "px";
  void li.offsetHeight;
  li.classList.add("is-leaving");
  return setTimeout(() => li.remove(), 250);
}

async function archiveRow(li) {
  const archiving = view !== "archived";
  const btn = li.querySelector(".alert__archive");
  btn.disabled = true;

  try {
    await archiveAlert(li.dataset.id, archiving);
  } catch {
    btn.disabled = false;
    setStatus("We couldn’t update that alert. Please try again.");
    return;
  }

  setStatus("");
  const id = li.dataset.id;
  const token = viewToken;
  removeRow(li);
  lastRemoved = { id, archived: archiving };
  showToast(archiving ? "Alert archived." : "Alert moved to inbox.");
  // Reload list
  setTimeout(() => { if (token === viewToken) loadAlerts(); }, 260);
}

async function undoArchive() {
  if (!lastRemoved) return;
  const { id, archived } = lastRemoved;
  hideToast();

  try {
    await archiveAlert(id, !archived);
  } catch {
    setStatus("We couldn’t undo that. Please try again.");
    return;
  }
  loadAlerts();
}

toastUndo.addEventListener("click", undoArchive);

/* ---------- Tabs ---------- */
function switchView(v) {
  if (v === view) return;
  view = v;
  page = 1;
  viewToken++;
  hideToast();
  tabs.forEach(t => {
    const on = t.dataset.view === v;
    t.classList.toggle("is-active", on);
    t.setAttribute("aria-pressed", String(on));
  });
  viewSelect.value = v;
  list.replaceChildren();
  loadAlerts();
}
tabs.forEach(t => t.addEventListener("click", () => switchView(t.dataset.view)));
viewSelect.addEventListener("change", () => switchView(viewSelect.value));

/* ---------- Dialog helpers ---------- */
function openDialog(d) {
  d.setAttribute("open", "");
  d.classList.add("modal--fallback");
  document.body.classList.add("modal-open");
  d._openedAt = Date.now();

  // Backdrop
  const back = document.createElement("div");
  back.className = "modal-backdrop";
  back.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    if (Date.now() - d._openedAt > 400) closeDialog(d);
  });
  document.body.appendChild(back);
  d._backdrop = back;
}
function closeDialog(d) {
  d.removeAttribute("open");
  d.classList.remove("modal--fallback");
  if (d._backdrop) { d._backdrop.remove(); d._backdrop = null; }
  if (!document.querySelector(".modal[open]")) document.body.classList.remove("modal-open");
}
document.addEventListener("keydown", e => {
  if (e.key === "Escape") document.querySelectorAll(".modal[open]").forEach(closeDialog);
});

/* ---------- Events ---------- */
// Open alert
const modal = document.getElementById("alertModal");
const modalTime = document.getElementById("modalTime");
const modalMsg = document.getElementById("modalMsg");
const modalLink = document.getElementById("modalLink");

// View details button
modalLink.dataset.href = modalLink.getAttribute("href") || "../borrows/borrows.html";
modalLink.removeAttribute("href");
modalLink.setAttribute("role", "button");
modalLink.setAttribute("tabindex", "0");
function goToDetails() {
  const url = modalLink.dataset.href;
  if (typeof window.lxGo === "function") window.lxGo(new URL(url, window.location.href).href);
  else window.location.href = url;
}
modalLink.addEventListener("click", e => {
  e.preventDefault();
  e.stopPropagation();
  if (Date.now() - (modal._openedAt || 0) < 1000) return;
  goToDetails();
});
modalLink.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); modalLink.click(); }
});

function openModal(li, link) {
  const time = li.querySelector("time");
  modalTime.innerHTML = time.innerHTML;
  modalTime.dateTime = time.dateTime;
  modalMsg.textContent = li.querySelector(".alert__msg").textContent;
  modalLink.dataset.href = link.dataset.href;
  openDialog(modal);
}

list.addEventListener("click", async e => {
  const archiveBtn = e.target.closest(".alert__archive");
  if (archiveBtn) {
    archiveRow(archiveBtn.closest(".alert"));
    return;
  }

  const link = e.target.closest(".alert__link");
  if (!link) return;
  e.preventDefault();
  e.stopPropagation();
  const li = link.closest(".alert");
  try { openModal(li, link); }
  catch (err) { console.error("Could not open the reminder card:", err); return; }

  if (li.classList.contains("is-unread")) {
    li.classList.replace("is-unread", "is-read");
    try { await markRead(li.dataset.id); } catch { }
  }
});

// Close modal
document.getElementById("modalClose").addEventListener("click", () => closeDialog(modal));
document.getElementById("modalDismiss").addEventListener("click", () => closeDialog(modal));
modal.addEventListener("click", e => { if (e.target === modal) closeDialog(modal); });

// Mark all as read
const confirmModal = document.getElementById("confirmModal");

markAllBtn.addEventListener("click", () => {
  if (!list.querySelector(".is-unread")) {
    setStatus("You’re all caught up. No unread alerts.");
    return;
  }
  openDialog(confirmModal);
});
document.getElementById("confirmNo").addEventListener("click", () => closeDialog(confirmModal));
confirmModal.addEventListener("click", e => { if (e.target === confirmModal) closeDialog(confirmModal); });

document.getElementById("confirmYes").addEventListener("click", async () => {
  closeDialog(confirmModal);
  markAllBtn.disabled = true;
  try {
    await markAllRead();
    list.querySelectorAll(".is-unread").forEach(li => li.classList.replace("is-unread", "is-read"));
    setStatus("All alerts marked as read.");
  } catch {
    setStatus("We couldn’t mark your alerts as read. Please try again.");
  } finally {
    markAllBtn.disabled = false;
  }
});

/* ---------- Start ---------- */
loadAlerts();