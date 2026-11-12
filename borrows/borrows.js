(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const CONTACT_EMAIL = 'lendforit@gmail.com';

  // Action button text
  const ACTION_TEXT = { BORROWED: 'RETURN', REQUESTED: 'CONTACT', RETURNED: 'VIEW RATING', OVERDUE: 'RETURN', DECLINED: 'CONTACT' };

  let currentFilter = 'ALL';
  let pendingUid = null;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Format date
  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function thumb(item) {
    const box = el('span', 'item-img');
    if (item.image) {
      const img = document.createElement('img');
      img.src = '../' + item.image;
      img.alt = '';
      img.addEventListener('error', () => { img.remove(); box.textContent = item.emoji; });
      box.appendChild(img);
    } else {
      box.textContent = item.emoji;
    }
    return box;
  }

  function cell(cls, label, valueNode) {
    const d = el('div', cls);
    d.append(el('span', 'cell-label', label), valueNode);
    return d;
  }

  function buildRow(loan, item) {
    const row = el('div', 'table-row');
    const effStatus = getEffectiveStatus(loan);

    const info = el('div', 'item-info');
    // Picture zoom button
    const imgLink = el('button', 'img-zoom-btn');
    imgLink.type = 'button';
    imgLink.setAttribute('aria-label', 'Zoom picture of ' + item.name);
    imgLink.dataset.name = item.name;
    if (item.image) imgLink.dataset.src = '../' + item.image;
    imgLink.appendChild(thumb(item));

    const text = el('div', 'item-text');
    text.append(el('span', 'cell-label', 'ITEM'), el('span', 'item-name', item.name));
    info.append(imgLink, text);

    const date = cell('item-date', 'DATE BORROWED', el('span', 'cell-value', fmtDate(loan.date)));
    const due = cell('item-due' + (effStatus === 'OVERDUE' ? ' is-overdue' : ''),
      'DUE DATE', el('span', 'cell-value', fmtDate(getDueDate(loan))));
    const status = cell('item-status', 'STATUS', el('span', 'badge ' + effStatus.toLowerCase(), effStatus));

    const action = el('div', 'item-action');
    const btn = el('button', 'action-btn', ACTION_TEXT[effStatus] || 'VIEW');
    btn.type = 'button';
    btn.dataset.uid = loan.uid;
    action.appendChild(btn);

    row.append(info, date, due, status, action);
    return row;
  }

  function openZoom(btn) {
    const dlg = $('zoom-dialog');
    const img = $('zoom-img');
    const fallback = $('zoom-fallback');
    if (!dlg) return;

    if (btn.dataset.src) {
      img.src = btn.dataset.src;
      img.alt = btn.dataset.name || '';
      img.hidden = false;
      fallback.hidden = true;
    } else {
      // Emoji fallback
      img.hidden = true;
      fallback.textContent = btn.textContent.trim();
      fallback.hidden = false;
    }
    $('zoom-caption').textContent = btn.dataset.name || '';
    dlg.showModal();
  }

  function displayItems(loans) {
    const box = $('items-list-container');
    if (!box) return;
    box.innerHTML = '';

    const rows = loans
      .map(loan => ({ loan: loan, item: getItem(loan.itemId) }))
      .filter(x => x.item)
      .sort((a, b) => new Date(b.loan.date) - new Date(a.loan.date));

    if (!rows.length) {
      box.appendChild(el('div', 'empty-msg', 'No items found for this status yet.'));
      return;
    }
    rows.forEach(x => box.appendChild(buildRow(x.loan, x.item)));
  }

  function filterItems(status) {
    const normalized = String(status).trim().toUpperCase();
    currentFilter = normalized;

    const all = getLoans();
    displayItems(normalized === 'ALL' ? all : all.filter(l => getEffectiveStatus(l) === normalized));

    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.textContent.trim().toUpperCase() === normalized);
    });
    const dropdown = $('filter-select');
    if (dropdown) dropdown.value = normalized;
  }
  window.filterItems = filterItems;

  function handleAction(uid) {
    const loan = getLoans().find(l => l.uid === uid);
    if (!loan) return;

    if (loan.status === 'RETURNED') {
      window.location.href = '../ratings/ratings.html';
    } else if (loan.status === 'BORROWED') {
      pendingUid = uid;
      $('confirm-dialog').showModal();
    } else {
      const item = getItem(loan.itemId);
      const subject = 'Reservation request: ' + (item ? item.name : '');
      window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject);
    }
  }

  function confirmReturn() {
    const list = getLoans();
    const loan = list.find(l => l.uid === pendingUid);
    pendingUid = null;
    $('confirm-dialog').close();
    if (!loan) return;

    loan.status = 'RETURNED';
    loan.returnedAt = new Date().toISOString();
    saveLoans(list);
    if (loan.uid.indexOf('seed-') !== 0) setCount(loan.itemId, getCount(loan.itemId) + 1);

    filterItems(currentFilter);
    $('success-dialog').showModal();
  }

  function cancelReturn() {
    pendingUid = null;
    $('confirm-dialog').close();
  }

  window.addEventListener('DOMContentLoaded', () => {
    filterItems('ALL');

    $('items-list-container').addEventListener('click', e => {
      const zoomBtn = e.target.closest('.img-zoom-btn');
      if (zoomBtn) { openZoom(zoomBtn); return; }
      const btn = e.target.closest('.action-btn');
      if (btn) handleAction(btn.dataset.uid);
    });
    $('zoom-close').addEventListener('click', () => $('zoom-dialog').close());
    $('confirm-yes').addEventListener('click', confirmReturn);
    $('confirm-no').addEventListener('click', cancelReturn);
    $('success-ok').addEventListener('click', () => $('success-dialog').close());
    ['confirm-dialog', 'success-dialog', 'zoom-dialog'].forEach(id => {
      const d = $(id);
      d.addEventListener('click', e => { if (e.target === d) d.close(); });
    });
    window.addEventListener('pageshow', e => { if (e.persisted) filterItems(currentFilter); });
    window.addEventListener('storage', e => { if (e.key === 'lendit_loans') filterItems(currentFilter); });
  });
})();