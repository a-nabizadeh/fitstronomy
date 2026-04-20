const pricingModal = document.getElementById('pricingModal');
const pricingOpeners = document.querySelectorAll('[data-open-pricing]');
const pricingClosers = document.querySelectorAll('[data-close-pricing]');

function openPricingModal() {
  if (!pricingModal) return;
  pricingModal.classList.add('is-open');
  pricingModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closePricingModal() {
  if (!pricingModal) return;
  pricingModal.classList.remove('is-open');
  pricingModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

pricingOpeners.forEach((trigger) => {
  trigger.addEventListener('click', openPricingModal);
});

pricingClosers.forEach((trigger) => {
  trigger.addEventListener('click', closePricingModal);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closePricingModal();
  }
});
