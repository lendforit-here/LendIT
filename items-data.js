const DAMAGED_TEXT = "No reported issues";
const LIABILITY_TEXT = "30 - 40% Penalty Fee";

// Bump this number to reset saved browser counts on next load.
const DATA_VERSION = 2;

const ITEMS = [
  { id: "speaker", name: "SPEAKER", title: "SPEAKER", emoji: "🔊", image: "images/speaker.png", count: 0, condition: "9/10" },
  { id: "hdmi-cable", name: "HDMI CABLE", title: "HDMI CABLE", emoji: "🔌", image: "images/hdmi.png", count: 2, condition: "10/10" },
  { id: "scientific-calculator", name: "SCIENTIFIC CALCULATOR", title: "CALCULATOR", emoji: "🧮", image: "images/scical.png", count: 8, condition: "10/10" },
  { id: "power-cable", name: "POWER CABLE", title: "POWER CABLE", emoji: "🔋", image: "images/powercable.png", count: 0, condition: "8/10" },
  { id: "remote-control", name: "REMOTE CONTROL", title: "REMOTE CONTROL", emoji: "🎛️", image: "images/remotecontrol.png", count: 2, condition: "9/10" },
  { id: "monoblock", name: "MONOBLOCK", title: "MONOBLOCK", emoji: "🪑", image: "images/monoblock.png", count: 6, condition: "9/10" },
  { id: "broom", name: "BROOM", title: "BROOM", emoji: "🧹", image: "images/broom.png", count: 3, condition: "8/10" },
  { id: "stapler", name: "STAPLER", title: "STAPLER", emoji: "📎", image: "images/stapler.png", count: 5, condition: "10/10" },
  { id: "adapter", name: "ADAPTER", title: "ADAPTER", emoji: "🔌", image: "images/adapter.png", count: 2, condition: "9/10" },
  { id: "tape-dispenser", name: "TAPE DISPENSER", title: "TAPE DISPENSER", emoji: "📼", image: "images/tapedispenser.png", count: 3, condition: "10/10" },
  { id: "extension", name: "EXTENSION", title: "EXTENSION", emoji: "🔗", image: "/images/extension.png", count: 2, condition: "9/10" },
  { id: "scissor", name: "SCISSOR", title: "SCISSOR", emoji: "✂️", image: "images/scissor.png", count: 4, condition: "9/10" },
  { id: "umbrella", name: "UMBRELLA", title: "UMBRELLA", emoji: "☂️", image: "images/umbrella.png", count: 3, condition: "8/10" },
  { id: "charger", name: "CHARGER", title: "CHARGER", emoji: "🔋", image: "images/charger.png", count: 0, condition: "9/10" }
];

function readStore(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value === null || value === undefined ? fallback : value;
  } catch (e) {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

/* Clear saved counts once whenever DATA_VERSION changes */
(function resetCountsIfDataChanged() {
  try {
    if (localStorage.getItem("lendit_data_version") !== String(DATA_VERSION)) {
      localStorage.removeItem("lendit_counts");
      localStorage.setItem("lendit_data_version", String(DATA_VERSION));
    }
  } catch (e) {}
})();

function getItem(id) {
  return ITEMS.find((item) => item.id === id);
}

function getCount(id) {
  const stored = readStore("lendit_counts", {});
  return id in stored ? stored[id] : getItem(id).count;
}

function setCount(id, number) {
  const stored = readStore("lendit_counts", {});
  stored[id] = number;
  writeStore("lendit_counts", stored);
}

function isAvailable(id) {
  return getCount(id) > 0;
}

// Loans: status = BORROWED | REQUESTED | RETURNED (OVERDUE is computed).
// BACKEND: Replace getLoans() / saveLoans() with API calls.
const LOAN_KEY = "lendit_loans";

function seedLoans() {
  return [
    // Borrowed May 5 -> due May 6 -> already OVERDUE, so it shows up in Alerts as a sample
    { uid: "seed-1", itemId: "scientific-calculator", date: "2026-05-05T12:00:00", status: "BORROWED" },
    { uid: "seed-2", itemId: "hdmi-cable", date: "2026-04-19T12:00:00", status: "REQUESTED" },
    { uid: "seed-3", itemId: "power-cable", date: "2026-02-13T12:00:00", status: "RETURNED" }
  ];
}

function getLoans() {
  const stored = readStore(LOAN_KEY, null);
  if (Array.isArray(stored)) return stored;
  const seed = seedLoans();
  writeStore(LOAN_KEY, seed);
  return seed;
}

function saveLoans(list) {
  writeStore(LOAN_KEY, list);
}

function hasPendingRequest(itemId) {
  return getLoans().some((loan) => loan.itemId === itemId && loan.status === "REQUESTED");
}

function addLoan(itemId, status) {
  const list = getLoans();
  list.push({ uid: "l" + Date.now(), itemId: itemId, date: new Date().toISOString(), status: status });
  saveLoans(list);
}

/* ---------- Due dates & due alerts ---------- */
const BORROW_HOURS = 24;       // max borrow period
const ALERT_HOURS_BEFORE = 6;  // alert starts this many hours before due
const HOUR_MS = 3600 * 1000;

function getDueDate(loan) {
  return new Date(new Date(loan.date).getTime() + BORROW_HOURS * HOUR_MS);
}

// BORROWED past its due date is shown as OVERDUE
function getEffectiveStatus(loan) {
  if (loan.status === "BORROWED" && Date.now() > getDueDate(loan).getTime()) return "OVERDUE";
  return loan.status;
}

// Alerts are created for unreturned loans within 6 hours of due date (or overdue), and for returned loans.
// BACKEND: Move alert creation to the server.
const ALERT_READ_KEY = "lendit_read_alerts";

/* Archive (like Gmail): archived alerts leave the inbox but stay in the Archived tab.
   BACKEND: save this flag on the alert in your database instead. */
const ALERT_ARCHIVE_KEY = "lendit_archived_alerts";

function getDueAlerts() {
  const now = Date.now();
  const read = readStore(ALERT_READ_KEY, {});
  const archived = readStore(ALERT_ARCHIVE_KEY, {});
  const loans = getLoans();

  // Reminders: one per unreturned loan that is near its due date (or overdue)
  const dueAlerts = loans
    .filter((loan) => loan.status === "BORROWED")
    .map((loan) => {
      const due = getDueDate(loan).getTime();
      const item = getItem(loan.itemId);
      const name = item ? item.name : "item";
      const hoursLeft = Math.ceil((due - now) / HOUR_MS);
      const id = "due-" + loan.uid;
      return {
        id: id,
        triggerAt: due - ALERT_HOURS_BEFORE * HOUR_MS,
        message: now > due
          ? `Your borrow period for ${name} has ended. Please return it now.`
          : `Your borrow period for ${name} ends in ${hoursLeft} ${hoursLeft === 1 ? "hour" : "hours"}`,
        // overdue alerts are stamped with the moment the period ended
        created_at: new Date(now > due ? due : due - ALERT_HOURS_BEFORE * HOUR_MS).toISOString(),
        is_read: !!read[id],
        is_archived: !!archived[id],
        link: "../borrows/borrows.html?item=" + encodeURIComponent(loan.itemId)
      };
    })
    .filter((a) => now >= a.triggerAt);


  const returnedAlerts = loans
    .filter((loan) => loan.status === "RETURNED" && loan.returnedAt)
    .map((loan) => {
      const item = getItem(loan.itemId);
      const name = item ? item.name : "item";
      const id = "returned-" + loan.uid;
      return {
        id: id,
        triggerAt: new Date(loan.returnedAt).getTime(),
        message: `You successfully returned ${name}.`,
        created_at: new Date(loan.returnedAt).toISOString(),
        is_read: !!read[id],
        is_archived: !!archived[id],
        link: "../borrows/borrows.html?item=" + encodeURIComponent(loan.itemId)
      };
    });

  return dueAlerts.concat(returnedAlerts)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function markDueAlertRead(id) {
  const read = readStore(ALERT_READ_KEY, {});
  read[id] = true;
  writeStore(ALERT_READ_KEY, read);
}

function markAllDueAlertsRead() {
  getDueAlerts().forEach((a) => markDueAlertRead(a.id));
}

function setDueAlertArchived(id, archived) {
  const store = readStore(ALERT_ARCHIVE_KEY, {});
  if (archived) store[id] = true;
  else delete store[id];
  writeStore(ALERT_ARCHIVE_KEY, store);
}