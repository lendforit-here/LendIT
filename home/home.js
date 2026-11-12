function imageMarkup(item) {
  return item.image ? '<img src="../' + item.image + '" alt="' + item.title + '">' : item.emoji;
}

function cardMarkup(item, classes) {
  const available = isAvailable(item.id);
  return (
    '<article class="card ' + classes + " " + (available ? "clickable" : "locked") +
    '" data-id="' + item.id + '"' + (available ? ' tabindex="0"' : "") + ">" +
    '<div class="img">' + imageMarkup(item) + "</div>" +
    "<h3>" + item.name + "</h3>" +
    '<span class="status ' + (available ? "available" : "unavailable") + '">' +
    (available ? "Available" : "Unavailable") + "</span></article>"
  );
}

function openItemPage(card) {
  if (card && card.classList.contains("clickable")) {
    window.location.href = "homeItems.html?item=" + card.dataset.id; 
  }
}

function initCarousel(options) {
  const carousel = options.carousel;
  const render = options.render;
  const prevBtn = options.prevBtn;
  const nextBtn = options.nextBtn;

  let items = [];
  let blockWidth = 0;
  let lastWidth = 0;
  let idleTimer;
  let resizeTimer;

  const cards = () => [...carousel.children];

  function highlight() {
    const list = cards();
    if (!list.length) return;
    const center = carousel.scrollLeft + carousel.clientWidth / 2;
    let closest = null;
    let min = Infinity;

    list.forEach((card) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (distance < min) {
        min = distance;
        closest = card;
      }
    });

    list.forEach((card) => card.classList.toggle("active", card === closest));
  }

  function normalize() {
    if (!blockWidth) return;
    const center = carousel.scrollLeft + carousel.clientWidth / 2;
    let shift = 0;
    while (center + shift < blockWidth) shift += blockWidth;
    while (center + shift >= blockWidth * 2) shift -= blockWidth;
    if (shift) carousel.scrollLeft += shift;
  }

  function centerOn(index) {
    const card = carousel.children[index];
    if (!card) return;
    carousel.scrollLeft = card.offsetLeft + card.offsetWidth / 2 - carousel.clientWidth / 2;
    highlight();
  }

  function build(list, startIndex) {
    items = list;
    blockWidth = 0;
    lastWidth = carousel.clientWidth;
    carousel.classList.remove("single");
    carousel.innerHTML = "";

    const count = list.length;
    if (prevBtn) prevBtn.hidden = count < 2;
    if (nextBtn) nextBtn.hidden = count < 2;
    if (!count) return;

    const markup = list.map(render).join("");
    carousel.innerHTML = markup;

    if (count === 1) {
      carousel.classList.add("single");
      highlight();
      return;
    }

    const gap = parseFloat(getComputedStyle(carousel).columnGap) || 0;
    const step = parseFloat(getComputedStyle(carousel.children[0]).width) + gap;
    if (!isFinite(step) || step <= 0) {
      highlight();
      return;
    }

    const setWidth = step * count;
    const sets = Math.max(1, Math.ceil((carousel.clientWidth * 3) / setWidth));
    carousel.innerHTML = markup.repeat(sets * 3);
    blockWidth = setWidth * sets;
    centerOn(sets * count + (startIndex % count));
    startAuto();
  }

  function step(direction) {
    const list = cards();
    const current = list.findIndex((c) => c.classList.contains("active"));
    if (current < 0) return;
    const target = list[current + direction];
    if (!target) return;
    const delta = target.offsetLeft + target.offsetWidth / 2 - (carousel.scrollLeft + carousel.clientWidth / 2);
    carousel.scrollBy({ left: delta, behavior: "smooth" });
  }

  // Carousel auto-scroll
  const SPEED = 45; // Scroll speed
  const area = carousel.parentElement;
  let hovered = false;
  let touching = false;
  let focused = false;
  let pos = 0;
  let lastTime = 0;
  let rafId = 0;

  const paused = () => hovered || touching || focused || document.hidden;

  function tick(time) {
    rafId = requestAnimationFrame(tick);
    const dt = Math.min(time - (lastTime || time), 64) / 1000;
    lastTime = time;
    if (paused() || !blockWidth) {
      pos = carousel.scrollLeft; 
      return;
    }
    pos += SPEED * dt;
    const center = pos + carousel.clientWidth / 2;
    if (center >= blockWidth * 2) pos -= blockWidth;
    carousel.scrollLeft = pos;
  }

  function startAuto() {
    if (rafId) return;
    carousel.classList.add("autoplay");
    pos = carousel.scrollLeft;
    lastTime = 0;
    rafId = requestAnimationFrame(tick);
  }

  area.addEventListener("mouseenter", () => { hovered = true; });
  area.addEventListener("mouseleave", () => { hovered = false; });
  area.addEventListener("touchstart", () => { touching = true; }, { passive: true });
  area.addEventListener("touchend", () => { setTimeout(() => { touching = false; }, 1500); }, { passive: true });
  area.addEventListener("touchcancel", () => { touching = false; }, { passive: true });
  carousel.addEventListener("focusin", () => { focused = true; });
  carousel.addEventListener("focusout", () => { focused = false; });

  if (prevBtn) prevBtn.addEventListener("click", () => step(-1));
  if (nextBtn) nextBtn.addEventListener("click", () => step(1));

  carousel.addEventListener("scroll", () => {
    requestAnimationFrame(highlight);
    clearTimeout(idleTimer);
    idleTimer = setTimeout(normalize, 140);
  }, { passive: true });

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!items.length || carousel.clientWidth === lastWidth) return;
      const active = cards().findIndex((c) => c.classList.contains("active"));
      build(items, active >= 0 ? active % items.length : 0);
    }, 200);
  });

  return {
    setItems: (list, startIndex) => build(list, startIndex || 0)
  };
}

function initHome() {
  const carouselEl = document.getElementById("carousel");
  const gridEl = document.getElementById("itemGrid");
  const searchInput = document.getElementById("searchInput");
  const noResults = document.getElementById("noResults");
  const featuredSection = carouselEl.closest(".section");

  const slider = initCarousel({
    carousel: carouselEl,
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    render: (item) => cardMarkup(item, "featured-card")
  });

  const urlQuery = new URLSearchParams(window.location.search).get("q") || "";
  searchInput.value = urlQuery;
  let query = urlQuery.trim().toLowerCase();
  let observer = null;

  function observeReveals() {
    const els = gridEl.querySelectorAll(".reveal");
    if (observer) observer.disconnect();
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("show"));
      return;
    }
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add("show"), (i % 4) * 80);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    els.forEach((el) => observer.observe(el));
  }

  function render() {
    const matches = (item) => item.name.toLowerCase().includes(query);
    const available = ITEMS.filter((i) => isAvailable(i.id) && matches(i));
    const matching = ITEMS.filter(matches);
    const everything = matching
      .filter((i) => isAvailable(i.id))
      .concat(matching.filter((i) => !isAvailable(i.id)));

    featuredSection.hidden = available.length === 0;
    slider.setItems(available, 0);

    gridEl.innerHTML = everything.map((i) => cardMarkup(i, "item reveal")).join("");
    observeReveals();

    noResults.hidden = everything.length !== 0;
  }

  [carouselEl, gridEl].forEach((container) => {
    container.addEventListener("click", (e) => openItemPage(e.target.closest(".card")));
    container.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openItemPage(e.target.closest(".card"));
    });
  });

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLowerCase();
    render();
  });

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) render();
  });

  render();
}

function initDetail() {
  const params = new URLSearchParams(window.location.search);
  const current = getItem(params.get("item"));

  if (!current) {
    window.location.replace("home.html");
    return;
  }

  const nameEl = document.getElementById("itemName");
  const imgEl = document.getElementById("itemImg");
  const countEl = document.getElementById("itemCount");
  const conditionEl = document.getElementById("itemCondition");
  const damagedEl = document.getElementById("itemDamaged");
  const availEl = document.getElementById("itemAvail");
  const liabilityEl = document.getElementById("itemLiability");
  const borrowBtn = document.getElementById("borrowBtn");
  const reserveBtn = document.getElementById("reserveBtn");
  const toast = document.getElementById("toast");
  const carouselEl = document.getElementById("otherCarousel");
  const searchInput = document.getElementById("searchInput");

  const waiver = document.getElementById("waiverModal");
  const agreeBtn = document.getElementById("agreeBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const reserveModal = document.getElementById("reserveModal");
  const reserveMessage = document.getElementById("reserveMessage");
  const reserveOkBtn = document.getElementById("reserveOkBtn");

  nameEl.textContent = current.title;
  imgEl.innerHTML = imageMarkup(current);
  conditionEl.textContent = current.condition;
  damagedEl.textContent = DAMAGED_TEXT;
  liabilityEl.textContent = LIABILITY_TEXT;

  function refresh() {
    const count = getCount(current.id);
    const available = count > 0;
    countEl.textContent = count;
    availEl.textContent = available ? "Available" : "Unavailable";
    availEl.className = "avail-text " + (available ? "available" : "unavailable");
    borrowBtn.disabled = !available;
  }

  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function openModal(modal) {
    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector(".modal-box").focus();
  }

  function closeModal(modal, returnTo) {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    if (returnTo) returnTo.focus();
  }

  /* Borrow request */
  function borrowItem() {
    if (getCount(current.id) <= 0) return;
    if (hasPendingRequest(current.id)) {
      showToast("You already have a pending request for this item");
      return;
    }
    addLoan(current.id, "REQUESTED");
    refresh();
    showToast("Request sent. Waiting for admin approval");
  }

  borrowBtn.addEventListener("click", () => {
    if (getCount(current.id) > 0) openModal(waiver);
  });
  cancelBtn.addEventListener("click", () => closeModal(waiver, borrowBtn));
  agreeBtn.addEventListener("click", () => {
    closeModal(waiver, borrowBtn);
    borrowItem();
  });

  reserveBtn.addEventListener("click", () => {
    if (hasPendingRequest(current.id)) {
      showToast("You already have a pending request for this item");
      return;
    }
    addLoan(current.id, "REQUESTED");
    reserveMessage.textContent =
      "Your request to reserve " + current.title +
      " has been sent and is now pending for approval. You can check its status in My Borrows.";
    openModal(reserveModal);
  });
  reserveOkBtn.addEventListener("click", () => closeModal(reserveModal, reserveBtn));

  [waiver, reserveModal].forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!waiver.hidden) closeModal(waiver, borrowBtn);
    if (!reserveModal.hidden) closeModal(reserveModal, reserveBtn);
  });

  refresh();
  window.addEventListener("pageshow", refresh);

  const otherBand = document.getElementById("otherBand");
  const otherSection = document.getElementById("otherSection");

  const slider = initCarousel({
    carousel: carouselEl,
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    render: (item) => cardMarkup(item, "featured-card other-card")
  });

  function renderOthers() {
    const q = searchInput.value.trim().toLowerCase();
    const available = ITEMS.filter((i) => i.id !== current.id && isAvailable(i.id));
    otherBand.hidden = available.length === 0;
    otherSection.hidden = available.length === 0;
    slider.setItems(available.filter((i) => i.name.toLowerCase().includes(q)), 0);
  }

  renderOthers();

  carouselEl.addEventListener("click", (e) => openItemPage(e.target.closest(".card")));
  carouselEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") openItemPage(e.target.closest(".card"));
  });

  searchInput.addEventListener("input", renderOthers);

  window.addEventListener("pageshow", (e) => {
    if (e.persisted) renderOthers();
  });
}

if (document.getElementById("itemGrid")) initHome();
if (document.getElementById("otherCarousel")) initDetail();