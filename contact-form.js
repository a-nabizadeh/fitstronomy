const contactForm = document.getElementById('contactForm');
const contactStatus = document.getElementById('contactStatus');

function setContactStatus(message, state = '') {
  if (!contactStatus) return;

  contactStatus.textContent = message;
  contactStatus.className = 'contact-status';
  if (state) {
    contactStatus.classList.add(state);
  }
}

async function submitContactForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const endpoint = form.getAttribute('action') || '';

  if (!endpoint.includes('/f/') || endpoint.includes('REPLACE_WITH_YOUR_FORMSPREE_ID')) {
    setContactStatus(
      'Add your real Formspree endpoint in contactForm.action before this form can send messages.',
      'error'
    );
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';
  setContactStatus('Sending your message...', 'pending');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: new FormData(form),
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Form submission failed.');
    }

    form.reset();
    setContactStatus('Message sent successfully. I will get back to you soon.', 'success');
  } catch (error) {
    setContactStatus(
      'The message could not be sent right now. Please try again or email me directly at armin.nabizade@gmail.com.',
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
