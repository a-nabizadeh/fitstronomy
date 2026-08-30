const pricingModal = document.getElementById('pricingModal');
const pricingDialog = pricingModal?.querySelector('.pricing-dialog');
const pricingOpeners = document.querySelectorAll('[data-open-pricing]');
const pricingClosers = document.querySelectorAll('[data-close-pricing]');
const pricingCards = Array.from(document.querySelectorAll('.pricing-card'));
const mobilePricing = window.matchMedia('(max-width: 768px)');
let pricingTrigger = null;

function setPricingCardMode() {
  pricingCards.forEach((card) => {
    card.open = !mobilePricing.matches || card.classList.contains('featured');
    const summary = card.querySelector('summary');
    if (summary) summary.tabIndex = mobilePricing.matches ? 0 : -1;
  });
}

function getPricingFocusableElements() {
  if (!pricingDialog) return [];

  return Array.from(pricingDialog.querySelectorAll(
    'a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => element.getClientRects().length > 0 && element.tabIndex >= 0);
}

function openPricingModal(event) {
  if (!pricingModal) return;

  pricingTrigger = event?.currentTarget || document.activeElement;
  pricingModal.classList.add('is-open');
  pricingModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  if (pricingDialog) pricingDialog.scrollTop = 0;

  requestAnimationFrame(() => {
    pricingModal.querySelector('.pricing-close')?.focus();
  });
}

function closePricingModal() {
  if (!pricingModal || !pricingModal.classList.contains('is-open')) return;

  pricingModal.classList.remove('is-open');
  pricingModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');

  if (pricingTrigger instanceof HTMLElement) {
    const mobileNavTrigger = mobilePricing.matches && pricingTrigger.closest('#navLinks');
    const focusTarget = mobileNavTrigger
      ? document.querySelector('.hamburger')
      : pricingTrigger;
    focusTarget?.focus();
  }
  pricingTrigger = null;
}

pricingCards.forEach((card) => {
  const summary = card.querySelector('summary');

  summary?.addEventListener('click', (event) => {
    if (!mobilePricing.matches) event.preventDefault();
  });

  card.addEventListener('toggle', () => {
    if (!mobilePricing.matches || !card.open) return;

    pricingCards.forEach((otherCard) => {
      if (otherCard !== card) otherCard.open = false;
    });
  });
});

pricingOpeners.forEach((trigger) => {
  trigger.addEventListener('click', openPricingModal);
});

pricingClosers.forEach((trigger) => {
  trigger.addEventListener('click', closePricingModal);
});

window.addEventListener('keydown', (event) => {
  if (!pricingModal?.classList.contains('is-open')) return;

  if (event.key === 'Escape') {
    closePricingModal();
    return;
  }

  if (event.key !== 'Tab') return;

  const focusable = getPricingFocusableElements();
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

if (mobilePricing.addEventListener) {
  mobilePricing.addEventListener('change', setPricingCardMode);
} else {
  mobilePricing.addListener(setPricingCardMode);
}

setPricingCardMode();
