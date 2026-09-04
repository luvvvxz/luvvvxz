// ---------------- NAV SCROLL ----------------
const nav = document.getElementById('siteNav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// ---------------- MOBILE NAV TOGGLE ----------------
const toggle = document.getElementById('navToggle');
const links = document.getElementById('navLinks');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  links.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}));

// ---------------- SCROLL REVEAL ----------------
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

// ---------------- HELPERS ----------------
function money(n) { return n.toLocaleString('th-TH') + ' ฿'; }

const toastEl = document.getElementById('toast');
let toastTimer = null;
function showToast(msg) {
  clearTimeout(toastTimer);
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

function setScrollLock(on) {
  document.body.classList.toggle('no-scroll', on);
}

// ---------------- CART SYSTEM (localStorage) ----------------
const CART_KEY = 'tandl_cart';
const cart = {};

// ---------------- PROMO / DISCOUNT CODES ----------------
const PROMO_KEY = 'tandl_promo';
const PROMO_CODES = {
  TL10: { label: 'ลด 10% ออเดอร์แรก', type: 'percent', value: 10 },
  TLCHEER: { label: 'ลด 5% ออเดอร์แรก', type: 'percent', value: 5 },
  TLFRIEND: { label: 'ลด 20 ฿', type: 'flat', value: 20 }
};
let appliedPromo = null;

function loadPromo() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROMO_KEY));
    if (saved && PROMO_CODES[saved.code]) appliedPromo = saved;
  } catch (_) { appliedPromo = null; }
}
function savePromo() {
  try {
    if (appliedPromo) localStorage.setItem(PROMO_KEY, JSON.stringify(appliedPromo));
    else localStorage.removeItem(PROMO_KEY);
  } catch (_) { /* ignore */ }
}
function discountAmount() {
  if (!appliedPromo) return 0;
  const p = PROMO_CODES[appliedPromo.code];
  const total = cartTotal();
  if (p.type === 'percent') return Math.round(total * (p.value / 100));
  return Math.min(p.value, total);
}
function netTotal() { return Math.max(0, cartTotal() - discountAmount()); }

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY));
    if (saved && typeof saved === 'object') {
      Object.entries(saved).forEach(([id, item]) => {
        if (item && item.name && item.price && item.qty > 0) {
          cart[id] = item;
        }
      });
    }
  } catch (_) { /* ignore corrupted data */ }
}

function saveCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch (_) { /* storage full or private mode */ }
}

function cartEntries() { return Object.entries(cart); }
function cartTotal() { return cartEntries().reduce((s, [, i]) => s + i.price * i.qty, 0); }
function cartItemCount() { return cartEntries().reduce((s, [, i]) => s + i.qty, 0); }

const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const overlay = document.getElementById('overlay');
const cartCloseBtn = document.getElementById('cartCloseBtn');
const cartBody = document.getElementById('cartBody');
const cartEmptyMsg = document.getElementById('cartEmptyMsg');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.getElementById('cartCount');
const checkoutBtn = document.getElementById('checkoutBtn');
const promoInput = document.getElementById('promoInput');
const promoApplyBtn = document.getElementById('promoApplyBtn');
const promoMsg = document.getElementById('promoMsg');
const cartDiscountRow = document.getElementById('cartDiscountRow');
const cartDiscountEl = document.getElementById('cartDiscount');
const cartNetTotalEl = document.getElementById('cartNetTotal');
const cartDiscountLabel = document.getElementById('cartDiscountLabel');
const promoActiveRow = document.getElementById('promoActiveRow');
const promoActiveLabel = document.getElementById('promoActiveLabel');
const discardPromoBtn = document.getElementById('discardPromoBtn');

const checkoutModal = document.getElementById('checkoutModal');
const checkoutForm = document.getElementById('checkoutForm');
const cancelCheckoutBtn = document.getElementById('cancelCheckoutBtn');

const confirmModal = document.getElementById('confirmModal');
const confirmCode = document.getElementById('confirmCode');
const confirmSummary = document.getElementById('confirmSummary');
const copyOrderBtn = document.getElementById('copyOrderBtn');
const closeConfirmBtn = document.getElementById('closeConfirmBtn');

const promoFab = document.getElementById('promoFab');
const promoModal = document.getElementById('promoModal');
const closePromoBtn = document.getElementById('closePromoBtn');
const promoToMenuBtn = document.getElementById('promoToMenuBtn');
const usePromoBtn = document.getElementById('usePromoBtn');
const promoCodeText = document.getElementById('promoCodeText');

const viewAllReviewsBtn = document.getElementById('viewAllReviewsBtn');
const reviewsModal = document.getElementById('reviewsModal');
const closeReviewsBtn = document.getElementById('closeReviewsBtn');

const memberBtn = document.getElementById('memberBtn');
const memberModal = document.getElementById('memberModal');
const cancelMemberBtn = document.getElementById('cancelMemberBtn');
const memberForm = document.getElementById('memberForm');
const memberFormWrap = document.getElementById('memberFormWrap');
const memberResultWrap = document.getElementById('memberResultWrap');
const memberResultName = document.getElementById('memberResultName');
const memberCode = document.getElementById('memberCode');
const closeMemberResultBtn = document.getElementById('closeMemberResultBtn');

function addToCart(id, name, price) {
  if (!cart[id]) cart[id] = { name, price, qty: 0 };
  cart[id].qty += 1;
  saveCart();
  renderCart();
  openDrawer();
  showToast(`${name} เพิ่มลงตะกร้าแล้ว`);
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];
  saveCart();
  renderCart();
}

function removeItem(id) {
  delete cart[id];
  saveCart();
  renderCart();
}

function renderCart() {
  const entries = cartEntries();
  cartBody.innerHTML = '';

  if (entries.length === 0) {
    cartBody.appendChild(cartEmptyMsg);
    checkoutBtn.disabled = true;
  } else {
    checkoutBtn.disabled = false;
    entries.forEach(([id, item]) => {
      const line = document.createElement('div');
      line.className = 'cart-line';
      line.innerHTML = `
        <div>
          <span class="cart-line-name">${item.name}</span>
          <span class="cart-line-unit">${money(item.price)} ต่อแก้ว</span>
          <div style="margin-top:8px;">
            <button type="button" class="cart-remove" data-remove="${id}">นำออก</button>
          </div>
        </div>
        <div class="qty-stepper">
          <button type="button" data-minus="${id}" aria-label="ลดจำนวน">−</button>
          <span>${item.qty}</span>
          <button type="button" data-plus="${id}" aria-label="เพิ่มจำนวน">+</button>
        </div>
        <span class="cart-line-price">${money(item.price * item.qty)}</span>
      `;
      cartBody.appendChild(line);
    });
  }

  cartTotalEl.textContent = money(cartTotal());
  const count = cartItemCount();
  cartCountEl.textContent = count;
  cartCountEl.hidden = count === 0;

  const disc = discountAmount();
  const hasPromo = !!appliedPromo;
  showDiscountUI(hasPromo, disc);
}

cartBody.addEventListener('click', (e) => {
  const plus = e.target.closest('[data-plus]');
  const minus = e.target.closest('[data-minus]');
  const remove = e.target.closest('[data-remove]');
  if (plus) changeQty(plus.dataset.plus, 1);
  if (minus) changeQty(minus.dataset.minus, -1);
  if (remove) removeItem(remove.dataset.remove);
});

// ---------------- DISCOUNT UI ----------------
function showDiscountUI(hasPromo, disc) {
  cartDiscountRow.hidden = !hasPromo;
  cartNetTotalEl.textContent = money(netTotal());
  if (hasPromo) {
    cartDiscountLabel.textContent = `ส่วนลด (${appliedPromo.code})`;
    cartDiscountEl.textContent = '−' + money(disc);
  } else {
    cartNetTotalEl.textContent = money(cartTotal());
  }
  if (promoInput) {
    promoInput.value = hasPromo ? appliedPromo.code : promoInput.value;
  }
  if (promoActiveRow) {
    promoActiveRow.style.display = hasPromo ? 'flex' : 'none';
    if (hasPromo) promoActiveLabel.textContent =
      `กำลังใช้โค้ด ${appliedPromo.code} — ${PROMO_CODES[appliedPromo.code].label}`;
  }
}

function applyPromo(rawCode, { silent = false } = {}) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) {
    if (!silent) {
      promoMsg.textContent = 'กรอกโค้ดส่วนลดก่อนครับ';
      promoMsg.className = 'cart-promo-msg err';
    }
    return false;
  }
  if (!PROMO_CODES[code]) {
    if (!silent) {
      promoMsg.textContent = 'โค้ดนี้ไม่ถูกต้อง หรือใช้ไม่ได้แล้ว';
      promoMsg.className = 'cart-promo-msg err';
    }
    return false;
  }
  appliedPromo = { code };
  savePromo();
  renderCart();
  showToast(`ใช้โค้ด ${code} แล้ว — ${PROMO_CODES[code].label}`);
  return true;
}

function discardPromo() {
  appliedPromo = null;
  savePromo();
  promoMsg.textContent = '';
  renderCart();
  showToast('ยกเลิกส่วนลดแล้ว');
}

promoApplyBtn.addEventListener('click', () => applyPromo(promoInput.value));
discardPromoBtn.addEventListener('click', discardPromo);
promoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); applyPromo(promoInput.value); }
});
promoInput.addEventListener('input', () => {
  promoMsg.textContent = '';
  promoMsg.className = 'cart-promo-msg';
});

document.querySelectorAll('.menu-item[data-id]').forEach(item => {
  const btn = item.querySelector('.add-btn');
  btn.addEventListener('click', () => {
    btn.classList.remove('pulse');
    void btn.offsetWidth;
    btn.classList.add('pulse');

    const countEl = cartCountEl;
    countEl.classList.remove('bounce');
    void countEl.offsetWidth;
    countEl.classList.add('bounce');

    addToCart(item.dataset.id, item.dataset.name, Number(item.dataset.price));
  });
});

// ---------------- DRAWER OPEN / CLOSE ----------------
function openDrawer() {
  cartDrawer.classList.add('open');
  overlay.classList.add('open');
  setScrollLock(true);
}
function closeDrawer() {
  cartDrawer.classList.remove('open');
  overlay.classList.remove('open');
  setScrollLock(false);
}

cartBtn.addEventListener('click', openDrawer);
cartCloseBtn.addEventListener('click', closeDrawer);

function closeAllPanels() {
  closeDrawer();
  checkoutModal.classList.remove('open');
  confirmModal.classList.remove('open');
  promoModal.classList.remove('open');
  reviewsModal.classList.remove('open');
  memberModal.classList.remove('open');
  overlay.classList.remove('open');
  setScrollLock(false);
}

overlay.addEventListener('click', closeAllPanels);

// ---------------- ESCAPE KEY CLOSES ALL ----------------
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllPanels();
});

// ---------------- CHECKOUT FLOW ----------------
checkoutBtn.addEventListener('click', () => {
  if (cartItemCount() === 0) return;
  closeDrawer();
  checkoutModal.classList.add('open');
  overlay.classList.add('open');
  setScrollLock(true);
});

cancelCheckoutBtn.addEventListener('click', () => {
  checkoutModal.classList.remove('open');
  setScrollLock(false);
  openDrawer();
});

checkoutForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const orderType = checkoutForm.querySelector('input[name="orderType"]:checked').value;
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const note = document.getElementById('custNote').value.trim();

  const code = '#' + Math.floor(1000 + Math.random() * 9000);
  const lines = cartEntries().map(([, item]) => `${item.name} x${item.qty}  ${money(item.price * item.qty)}`);
  const disc = discountAmount();
  const promoLine = appliedPromo
    ? [`ส่วนลด (${appliedPromo.code} ${PROMO_CODES[appliedPromo.code].label}): -${money(disc)}`, `สุทธิ: ${money(netTotal())}`]
    : [`ยอดรวม: ${money(cartTotal())}`];
  const summary = [
    `รหัสออเดอร์ ${code}`,
    `ผู้สั่ง: ${name} (${phone})`,
    `รูปแบบ: ${orderType}`,
    '',
    ...lines,
    '',
    ...promoLine,
    note ? `หมายเหตุ: ${note}` : ''
  ].filter(Boolean).join('\n');

  confirmCode.textContent = code;
  confirmSummary.textContent = summary;
  document.getElementById('confirmGreeting').textContent =
    `คุณ${name || ''} กรุณาแจ้งรหัส ${code} กับพนักงานเมื่อมาถึงร้าน`;

  checkoutModal.classList.remove('open');
  confirmModal.classList.add('open');
  overlay.classList.add('open');
  setScrollLock(true);

  Object.keys(cart).forEach(k => delete cart[k]);
  saveCart();
  appliedPromo = null;
  savePromo();
  renderCart();
  checkoutForm.reset();
});

copyOrderBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(confirmSummary.textContent);
    copyOrderBtn.textContent = 'คัดลอกแล้ว ✓';
    setTimeout(() => { copyOrderBtn.textContent = 'คัดลอกออเดอร์'; }, 1800);
  } catch (_) {
    copyOrderBtn.textContent = 'คัดลอกไม่สำเร็จ';
  }
});

closeConfirmBtn.addEventListener('click', () => {
  confirmModal.classList.remove('open');
  overlay.classList.remove('open');
  setScrollLock(false);
});

// ---------------- PROMO MODAL ----------------
function openPromo() {
  promoModal.classList.add('open');
  overlay.classList.add('open');
  setScrollLock(true);
}
promoFab.addEventListener('click', openPromo);
closePromoBtn.addEventListener('click', closeAllPanels);
promoToMenuBtn.addEventListener('click', () => {
  closeAllPanels();
  document.querySelector('#menu').scrollIntoView({ behavior: 'smooth' });
});
usePromoBtn.addEventListener('click', () => {
  const ok = applyPromo(promoCodeText.textContent, { silent: true });
  closeAllPanels();
  if (ok) openDrawer();
});
setTimeout(openPromo, 1400);

// ---------------- REVIEWS MODAL ----------------
viewAllReviewsBtn.addEventListener('click', () => {
  reviewsModal.classList.add('open');
  overlay.classList.add('open');
  setScrollLock(true);
});
closeReviewsBtn.addEventListener('click', closeAllPanels);

// ---------------- MEMBER MODAL (localStorage) ----------------
const MEMBER_KEY = 'tandl_member';

function loadMember() {
  try {
    return JSON.parse(localStorage.getItem(MEMBER_KEY));
  } catch (_) { return null; }
}

function showMemberResult(name, code) {
  memberResultName.textContent = name;
  memberCode.textContent = code;
  memberFormWrap.style.display = 'none';
  memberResultWrap.style.display = '';
}

memberBtn.addEventListener('click', () => {
  const saved = loadMember();
  if (saved && saved.name && saved.code) {
    showMemberResult(saved.name, saved.code);
  } else {
    memberFormWrap.style.display = '';
    memberResultWrap.style.display = 'none';
  }
  memberModal.classList.add('open');
  overlay.classList.add('open');
  setScrollLock(true);
});
cancelMemberBtn.addEventListener('click', closeAllPanels);

memberForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('memberName').value.trim();
  const code = 'MG-' + Math.floor(1000 + Math.random() * 9000);

  try {
    localStorage.setItem(MEMBER_KEY, JSON.stringify({ name, code }));
  } catch (_) { /* ignore */ }

  showMemberResult(name, code);
  memberForm.reset();
});

closeMemberResultBtn.addEventListener('click', closeAllPanels);

// ---------------- INIT ----------------
loadCart();
loadPromo();
renderCart();
