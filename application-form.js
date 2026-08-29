(function () {
  var applicationForm = document.getElementById('applicationForm');
  var applicationStatus = document.getElementById('applicationStatus');
  var wizardMedia = window.matchMedia('(max-width: 900px)');
  var wizardSections = applicationForm ? Array.from(applicationForm.querySelectorAll('.form-section')) : [];
  var wizardBack = document.getElementById('wizardBack');
  var wizardNext = document.getElementById('wizardNext');
  var wizardStepCount = document.getElementById('wizardStepCount');
  var wizardStepTitle = document.getElementById('wizardStepTitle');
  var wizardProgressBar = document.getElementById('wizardProgressBar');
  var enforceApplicationRequiredFields = true;
  var trustedEndpoint = 'https://api.web3forms.com/submit';
  var maxPayloadCharacters = 15000;
  var currentWizardStep = 0;

  function setApplicationStatus(message, state) {
    if (!applicationStatus) return;

    applicationStatus.textContent = message;
    applicationStatus.className = 'application-status';
    if (state) {
      applicationStatus.classList.add(state);
    }
  }

  function isWizardActive() {
    return Boolean(applicationForm && applicationForm.classList.contains('wizard-active'));
  }

  function getWizardStepTitle(step) {
    return step.querySelector('h3')?.textContent.trim() || 'Application';
  }

  function setWizardStep(index, shouldScroll) {
    if (!applicationForm || !wizardSections.length) return;

    currentWizardStep = Math.max(0, Math.min(index, wizardSections.length - 1));
    wizardSections.forEach(function (section, sectionIndex) {
      section.classList.toggle('is-active', sectionIndex === currentWizardStep);
    });

    var isLastStep = currentWizardStep === wizardSections.length - 1;
    applicationForm.classList.toggle('wizard-last-step', isLastStep);

    if (wizardBack) {
      wizardBack.disabled = currentWizardStep === 0;
    }

    if (wizardStepCount) {
      wizardStepCount.textContent = 'Step ' + (currentWizardStep + 1) + ' of ' + wizardSections.length;
    }

    if (wizardStepTitle) {
      wizardStepTitle.textContent = getWizardStepTitle(wizardSections[currentWizardStep]);
    }

    if (wizardProgressBar) {
      wizardProgressBar.style.width = ((currentWizardStep + 1) / wizardSections.length) * 100 + '%';
    }

    if (shouldScroll) {
      document.querySelector('.form-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function validateFields(fields) {
    if (!enforceApplicationRequiredFields) return true;

    var invalidField = Array.from(fields).find(function (field) {
      return !field.checkValidity();
    });

    if (invalidField) {
      invalidField.reportValidity();
      return false;
    }

    return true;
  }

  function validateCurrentWizardStep() {
    var activeStep = wizardSections[currentWizardStep];
    if (!activeStep) return true;

    return validateFields(activeStep.querySelectorAll('input, select, textarea'));
  }

  function validateApplicationBeforeSubmit() {
    if (!applicationForm) return false;

    if (isWizardActive()) {
      return validateCurrentWizardStep();
    }

    return validateFields(applicationForm.querySelectorAll('input, select, textarea'));
  }

  function updateRequiredFieldsMode() {
    if (!applicationForm) return;

    applicationForm.querySelectorAll('[required]').forEach(function (field) {
      field.required = enforceApplicationRequiredFields;
    });
  }

  function updateWizardMode() {
    if (!applicationForm || !wizardSections.length) return;

    if (wizardMedia.matches) {
      applicationForm.classList.add('wizard-active');
      setWizardStep(currentWizardStep);
      return;
    }

    applicationForm.classList.remove('wizard-active', 'wizard-last-step');
    wizardSections.forEach(function (section) {
      section.classList.remove('is-active');
    });
  }

  function getTrustedEndpoint(form) {
    var endpoint = new URL(form.getAttribute('action') || '', window.location.href);
    if (endpoint.href !== trustedEndpoint) {
      throw new Error('The application form endpoint is not trusted.');
    }
    return endpoint.href;
  }

  function hasHoneypotValue(form) {
    return Array.from(form.querySelectorAll('[data-honeypot]')).some(function (field) {
      if (field.type === 'checkbox') {
        return field.checked;
      }
      return field.value.trim() !== '';
    });
  }

  function payloadIsTooLarge(formData) {
    var size = 0;
    formData.forEach(function (value) {
      if (typeof value === 'string') {
        size += value.length;
      }
    });
    return size > maxPayloadCharacters;
  }

  function hasPositiveParqAnswer(form) {
    return Boolean(form.querySelector('input[name^="parq_"][value="Yes"]:checked'));
  }

  function showSuccessOverlay() {
    var overlay = document.getElementById('successOverlay');
    if (overlay) overlay.classList.add('is-visible');
  }

  async function submitApplicationForm(event) {
    event.preventDefault();

    if (isWizardActive() && currentWizardStep < wizardSections.length - 1) {
      if (validateCurrentWizardStep()) {
        setWizardStep(currentWizardStep + 1, true);
      }
      return;
    }

    var form = event.currentTarget;
    var submitButton = form.querySelector('button[type="submit"]');

    if (!submitButton || !validateApplicationBeforeSubmit()) {
      return;
    }

    if (hasHoneypotValue(form)) {
      form.reset();
      setWizardStep(0, true);
      setApplicationStatus('Application sent successfully.', 'success');
      showSuccessOverlay();
      return;
    }

    var endpoint;
    try {
      endpoint = getTrustedEndpoint(form);
    } catch (error) {
      setApplicationStatus('The application form is not configured safely yet.', 'error');
      return;
    }

    var formData = new FormData(form);

    if (payloadIsTooLarge(formData)) {
      setApplicationStatus('Please shorten the longer answers before sending.', 'error');
      return;
    }

    if (hasPositiveParqAnswer(form)) {
      formData.set('medical_followup_required', 'Yes');
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    setApplicationStatus('Sending your application...', 'pending');

    try {
      var response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json'
        },
        credentials: 'omit',
        referrerPolicy: 'strict-origin-when-cross-origin'
      });

      if (!response.ok) {
        throw new Error('Application submission failed.');
      }

      form.reset();
      setWizardStep(0, true);
      setApplicationStatus('Application sent successfully.', 'success');
      showSuccessOverlay();
    } catch (error) {
      setApplicationStatus(
        'The application could not be sent right now. Please try again later.',
        'error'
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Send Application';
    }
  }

  if (applicationForm) {
    applicationForm.addEventListener('submit', submitApplicationForm);
  }

  if (wizardNext) {
    wizardNext.addEventListener('click', function () {
      if (validateCurrentWizardStep()) {
        setWizardStep(currentWizardStep + 1, true);
      }
    });
  }

  if (wizardBack) {
    wizardBack.addEventListener('click', function () {
      setWizardStep(currentWizardStep - 1, true);
    });
  }

  if (wizardMedia.addEventListener) {
    wizardMedia.addEventListener('change', updateWizardMode);
  } else {
    wizardMedia.addListener(updateWizardMode);
  }

  updateRequiredFieldsMode();
  updateWizardMode();
  sessionStorage.setItem('introSeen', '1');
})();
