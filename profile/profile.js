// LendIT profile page code. Nav, search, and footer are handled in other files.
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  // Saves data in this browser
  const store = {
    get(k, fallback) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  // Small pop-up message
  let toastTimer;
  function toast(text) {
    const t = $('toast');
    if (!t) return;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function safe(name, fn) {
    try { fn(); } catch (err) { console.error('[LendIT] "' + name + '" failed:', err); }
  }

  const ui = { editing: false, modalOpen: false, viewerOpen: false };

  // 1. Confirm pop-up
  safe('modal', () => {
    const modal = $('modal');
    let done = null;
    ui.confirm = function (title, text, okText) {
      return new Promise(resolve => {
        $('modalTitle').textContent = title;
        $('modalText').textContent = text;
        $('modalOk').textContent = okText || 'Yes';
        modal.hidden = false; ui.modalOpen = true;
        $('modalCancel').focus();
        done = ok => { modal.hidden = true; ui.modalOpen = false; done = null; resolve(ok); };
      });
    };
    $('modalOk').addEventListener('click', () => done && done(true));
    $('modalCancel').addEventListener('click', () => done && done(false));
    modal.addEventListener('click', e => { if (e.target === modal && done) done(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && done) { e.stopImmediatePropagation(); done(false); }
    });
  });

  // 2. Date
  safe('date', () => {
    const el = $('today');
    if (!el) return;
    const d = new Date();
    const wd = d.toLocaleDateString('en-GB', { weekday: 'short' });
    const mon = d.toLocaleDateString('en-GB', { month: 'short' });
    el.textContent = 'Today: ' + wd + ', ' + d.getDate() + ' ' + mon + ' ' + d.getFullYear();
  });

  // 3. Profile
  safe('profile', () => {
    const ids = ['username', 'name', 'section', 'phone', 'email', 'campus'];
    const fields = ids.map($);
    const card = $('userCard'), editBtn = $('editBtn'), cancelBtn = $('cancelBtn');
    const editLabel = $('editLabel'), msg = $('formMsg');
    if (fields.some(f => !f) || !editBtn || !editLabel) throw new Error('profile elements are missing from profile.html');

    let backup = {};

    const validators = {
      username: v => v.trim().replace(/^@/, '').length >= 1 || 'Enter a username.',
      name:     v => v.trim().length >= 1 || 'Enter your name.',
      section:  () => true,
      phone:    () => true,
      email:    () => true,
      campus:   () => true
    };

    function showMsg(text, isError) {
      if (!msg) return;
      msg.textContent = text;
      msg.classList.toggle('error', !!isError);
    }

    function setEditing(on) {
      ui.editing = on;
      fields.forEach(f => { if (f.tagName === 'SELECT') f.disabled = !on; else f.readOnly = !on; });
      if (card) card.classList.toggle('editing', on);
      editLabel.textContent = on ? 'Save Changes' : 'Edit Profile';
      if (cancelBtn) cancelBtn.hidden = !on;
    }

    function startEdit() {
      fields.forEach(f => { backup[f.id] = f.value; });
      setEditing(true);
      fields[1].focus();
      showMsg('Edit your details, then press Save Changes.');
      toast('Edit mode: change your details, then press Save Changes');
    }

    function saveEdit() {
      let firstError = null;
      fields.forEach(f => {
        const ok = validators[f.id](f.value);
        f.classList.toggle('invalid', ok !== true);
        if (ok !== true && !firstError) firstError = { field: f, text: ok };
      });
      if (firstError) {
        showMsg(firstError.text, true);
        toast(firstError.text);
        firstError.field.focus();
        return;
      }
      ui.confirm('Save changes?', 'Are you sure you want to save these changes?', 'Yes, save').then(ok => {
        if (!ok) return;
        const u = $('username');
        u.value = '@' + u.value.trim().replace(/^@/, '');
        const data = {};
        fields.forEach(f => { data[f.id] = f.value.trim(); f.value = data[f.id]; });
        store.set('lendit_profile', data);
        setEditing(false);
        showMsg('');
        toast('Profile saved');
      });
    }

    function cancelEdit() {
      fields.forEach(f => { f.value = backup[f.id]; f.classList.remove('invalid'); });
      setEditing(false);
      showMsg('');
      toast('Changes canceled');
    }

    editBtn.addEventListener('click', () => { if (ui.editing) saveEdit(); else startEdit(); });
    if (cancelBtn) cancelBtn.addEventListener('click', cancelEdit);
    fields.forEach(f => f.addEventListener('keydown', e => {
      if (e.key === 'Enter' && ui.editing) { e.preventDefault(); saveEdit(); }
    }));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && ui.editing && !ui.modalOpen && !ui.viewerOpen) cancelEdit();
    });
    const form = $('profileForm');
    if (form) form.addEventListener('submit', e => e.preventDefault());

    const saved = store.get('lendit_profile', null);
    if (saved) ids.forEach((id, i) => {
      const f = fields[i];
      const valid = f.tagName !== 'SELECT' || Array.prototype.some.call(f.options, o => o.value === saved[id]);
      if (typeof saved[id] === 'string' && valid) f.value = saved[id];
    });
  });

  // 4. Photo
  safe('photo', () => {
    const avatar = $('avatar'), avatarImg = $('avatarImg'), avatarInput = $('avatarInput');
    if (!avatar || !avatarImg || !avatarInput) return;

    function showAvatar(src) { avatarImg.src = src; avatar.classList.add('has-photo'); }
    const savedPhoto = store.get('lendit_avatar', null);
    if (savedPhoto) showAvatar(savedPhoto);

    const viewer = $('photoViewer');
    function openViewer() {
      const body = $('viewerBody');
      body.innerHTML = '';
      if (avatar.classList.contains('has-photo')) {
        const im = new Image(); im.src = avatarImg.src; im.alt = 'Profile photo'; body.appendChild(im);
      } else {
        body.appendChild(avatar.querySelector('svg').cloneNode(true));
      }
      viewer.hidden = false; ui.viewerOpen = true;
      $('viewerClose').focus();
    }
    function closeViewer() { viewer.hidden = true; ui.viewerOpen = false; avatar.focus(); }

    avatar.addEventListener('click', e => { if (e.target.closest('.hint, input')) return; openViewer(); });
    avatar.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target === avatar) { e.preventDefault(); openViewer(); }
    });
    $('viewerClose').addEventListener('click', closeViewer);
    viewer.addEventListener('click', e => { if (e.target === viewer) closeViewer(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.viewerOpen) closeViewer(); });

    avatarInput.addEventListener('change', () => {
      const file = avatarInput.files[0];
      if (!file || file.type.indexOf('image/') !== 0) { toast('Please choose an image file'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const size = 240, c = document.createElement('canvas');
          c.width = c.height = size;
          const s = Math.min(img.width, img.height);
          c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
          const url = c.toDataURL('image/jpeg', 0.85);
          showAvatar(url);
          store.set('lendit_avatar', url);
          toast('Photo updated');
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  });

  // 5. Rating
  safe('rating', () => {
    const starsEl = $('stars');
    if (!starsEl) return;

    const WEIGHTS = { ontime: 0.5, condition: 0.3, reliability: 0.2 };
    const PRIOR_SCORE = 0.75, PRIOR_WEIGHT = 2, RECENT = 10;
    const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.2 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8z';

    const rec = (item, daysLate, condition, status) => ({ item: item, status: status || 'returned', daysLate: daysLate, condition: condition });
    const seedHistory = () => [
      rec('Calculator', 0, 'good'), rec('HDMI cable', 0, 'good'), rec('Arduino kit', 1, 'good'),
      rec('Laptop', 0, 'minor'),    rec('Textbook', 0, 'good'),   rec('Headset', 3, 'minor'),
      rec('Camera', 0, 'good', 'noshow')
    ];
    function loadHistory() {
      const h = store.get('lendit_history', null);
      return Array.isArray(h) && h.length ? h : seedHistory();
    }
    function saveHistory(h) { store.set('lendit_history', h); }

    const timeScore = r => r.status === 'noshow' ? 0 : r.daysLate <= 0 ? 1 : r.daysLate <= 1 ? 0.6 : r.daysLate <= 3 ? 0.3 : 0;
    const condScore = r => r.condition === 'damaged' ? 0 : r.condition === 'minor' ? 0.6 : 1;
    const avgOf = (arr, fn) => arr.length ? arr.reduce((a, r) => a + fn(r), 0) / arr.length : 1;

    function calcRating(list0) {
      const list = list0.slice(-RECENT);
      const returned = list.filter(r => r.status === 'returned');
      const n = list.length;
      const metrics = {
        ontime:      avgOf(list, timeScore),
        condition:   avgOf(returned, condScore),
        reliability: n ? 1 - list.filter(r => r.status === 'noshow').length / n : 1
      };
      const raw = WEIGHTS.ontime * metrics.ontime + WEIGHTS.condition * metrics.condition + WEIGHTS.reliability * metrics.reliability;
      const score = (raw * n + PRIOR_SCORE * PRIOR_WEIGHT) / (n + PRIOR_WEIGHT);
      const stars = 1 + 4 * score;
      const tier = stars >= 4.5 ? 'Excellent' : stars >= 3.5 ? 'Good' : stars >= 2.5 ? 'Fair' : 'Needs improvement';
      return { stars: stars, n: n, metrics: metrics, tier: tier };
    }
    window.LendITRating = { calcRating: calcRating };

    let borrows = loadHistory();

    const starEls = [];
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.className = 'star';
      s.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '" fill="none" stroke="#fff" stroke-width="1" stroke-linejoin="round" opacity=".6"/></svg>' +
        '<svg class="fill" viewBox="0 0 24 24" aria-hidden="true"><path d="' + STAR_PATH + '" fill="#fff"/></svg>';
      starsEl.appendChild(s);
      starEls.push(s);
    }

    const METRIC_INFO = [
      { key: 'ontime',      name: 'On-time returns' },
      { key: 'condition',   name: 'Item condition' },
      { key: 'reliability', name: 'Reliability' }
    ];
    const TIPS = {
      ontime:      'Tip: return items on or before the due date to raise your rating.',
      condition:   'Tip: take good care of borrowed items and return them in the same condition.',
      reliability: 'Tip: show up for pickups. No-shows lower your rating.'
    };

    function renderRating() {
      const r = calcRating(borrows);

      starEls.forEach((s, idx) => {
        const fill = Math.max(0, Math.min(1, Math.round(r.stars) - idx));
        s.querySelector('.fill').style.clipPath = 'inset(0 ' + ((1 - fill) * 100) + '% 0 0)';
      });
      starsEl.setAttribute('role', 'img');
      const whole = Math.round(r.stars);
      starsEl.setAttribute('aria-label', 'Rating ' + whole + ' out of 5 stars');

      if ($('ratingNum')) $('ratingNum').textContent = whole + (whole === 1 ? ' Star' : ' Stars');
      if ($('ratingTier')) $('ratingTier').textContent = r.tier;

      if ($('breakdown')) {
        $('breakdown').innerHTML = METRIC_INFO.map(m => {
          const pct = Math.round(r.metrics[m.key] * 100);
          return '<div class="metric">' +
            '<span class="m-name">' + m.name + ' <small>(' + Math.round(WEIGHTS[m.key] * 100) + '% of score)</small></span>' +
            '<span class="m-pct">' + pct + '%</span>' +
            '<span class="bar" role="progressbar" aria-label="' + m.name + '" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + pct + '%"></i></span>' +
            '</div>';
        }).join('');
      }

      if ($('ratingTip')) {
        const worst = METRIC_INFO.map(m => ({ key: m.key, loss: WEIGHTS[m.key] * (1 - r.metrics[m.key]) }))
                                 .sort((a, b) => b.loss - a.loss)[0];
        $('ratingTip').textContent = worst.loss < 0.02
          ? 'Great job! Keep returning items on time and in good condition.'
          : TIPS[worst.key];
      }
    }

    const SIM = {
      ontime:  () => rec('Demo item', 0, 'good'),
      late:    () => rec('Demo item', 2, 'good'),
      damaged: () => rec('Demo item', 0, 'damaged'),
      noshow:  () => rec('Demo item', 0, 'good', 'noshow')
    };
    document.querySelectorAll('[data-sim]').forEach(btn => btn.addEventListener('click', () => {
      const before = calcRating(borrows).stars;
      borrows.push(SIM[btn.dataset.sim]());
      saveHistory(borrows);
      renderRating();
      const after = calcRating(borrows).stars;
      const diff = after - before;
      toast('Rating ' + (diff >= 0.005 ? 'went up' : diff <= -0.005 ? 'went down' : 'stayed the same') + ': ' + before.toFixed(1) + ' to ' + after.toFixed(1));
    }));

    const resetBtn = $('resetRatings');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      borrows = seedHistory();
      store.del('lendit_history');
      renderRating();
      toast('History reset');
    });

    renderRating();
  });

  // 6. Logout
  safe('logout', () => {
    const LOGIN_PAGE = '../login.html';   // one folder up, where login.html lives
    const btn = $('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      ui.confirm('Log out?', 'Are you sure you want to log out?', 'Log out').then(ok => {
        if (!ok) return;

        // Clear the session
        try {
          localStorage.removeItem('lendit_session');
          sessionStorage.removeItem('lendit_session');
        } catch (e) {}

        if (LOGIN_PAGE) { window.location.href = LOGIN_PAGE; return; }
        toast('Logged out');
      });
    });
  });
})();