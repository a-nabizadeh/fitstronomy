const contactForm = document.getElementById('contactForm');
const contactStatus = document.getElementById('contactStatus');
const trustedContactEndpoint = 'https://api.web3forms.com/submit';
const maxContactPayloadCharacters = 3000;

function setContactStatus(message, state = '') {
  if (!contactStatus) return;

  contactStatus.textContent = message;
  contactStatus.className = 'contact-status';
  if (state) {
    contactStatus.classList.add(state);
  }
}

function getTrustedContactEndpoint(form) {
  const endpoint = new URL(form.getAttribute('action') || '', window.location.href);
  if (endpoint.href !== trustedContactEndpoint) {
    throw new Error('The contact form endpoint is not trusted.');
  }
  return endpoint.href;
}

function hasContactHoneypotValue(form) {
  return Array.from(form.querySelectorAll('[data-honeypot]')).some((field) => {
    if (field.type === 'checkbox') {
      return field.checked;
    }
    return field.value.trim() !== '';
  });
}

function contactPayloadIsTooLarge(formData) {
  let size = 0;
  formData.forEach((value) => {
    if (typeof value === 'string') {
      size += value.length;
    }
  });
  return size > maxContactPayloadCharacters;
}

async function submitContactForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');

  if (!submitButton || !form.checkValidity()) {
    return;
  }

  if (hasContactHoneypotValue(form)) {
    form.reset();
    setContactStatus('Message sent successfully. I will get back to you soon.', 'success');
    return;
  }

  let endpoint;
  try {
    endpoint = getTrustedContactEndpoint(form);
  } catch (error) {
    setContactStatus('The contact form is not configured safely yet.', 'error');
    return;
  }

  const formData = new FormData(form);
  if (contactPayloadIsTooLarge(formData)) {
    setContactStatus('Please shorten your message before sending.', 'error');
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';
  setContactStatus('Sending your message...', 'pending');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
      },
      credentials: 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin',
    });

    if (!response.ok) {
      throw new Error('Form submission failed.');
    }

    form.reset();
    setContactStatus('Message sent successfully. I will get back to you soon.', 'success');
  } catch (error) {
    setContactStatus(
      'The message could not be sent right now. Please try again later.',
      'error'
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Send Message';
  }
}

if (contactForm) {
  contactForm.addEventListener('submit', submitContactForm);
}
