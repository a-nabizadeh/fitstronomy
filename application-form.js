(function () {
  var applicationForm = document.getElementById('applicationForm');
  var applicationStatus = document.getElementById('applicationStatus');
  var wizardSections = applicationForm ? Array.from(applicationForm.querySelectorAll('.form-section')) : [];
  var wizardStepButtons = Array.from(document.querySelectorAll('[data-wizard-step]'));
  var wizardBack = document.getElementById('wizardBack');
  var wizardNext = document.getElementById('wizardNext');
  var wizardStepCount = document.getElementById('wizardStepCount');
  var wizardStepTitle = document.getElementById('wizardStepTitle');
  var wizardProgressBar = document.getElementById('wizardProgressBar');
  var validationSummary = document.getElementById('applicationValidationSummary');
  var selectedPlanNotice = document.getElementById('selectedPlanNotice');
  var selectedPlanName = document.getElementById('selectedPlanName');
  var enforceApplicationRequiredFields = true;
  var trustedEndpoint = 'https://api.web3forms.com/submit';
  var maxPayloadCharacters = 15000;
  var currentWizardStep = 0;
  var highestWizardStep = 0;

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

  function clearValidationSummary() {
    if (!validationSummary) return;
    validationSummary.hidden = true;
    validationSummary.replaceChildren();
  }

  function getFieldLabel(field) {
    var fieldset = field.closest('fieldset');
    var legend = fieldset?.querySelector('legend');
    if (legend) return legend.textContent.trim();

    var fieldContainer = field.closest('.form-field');
    var label = fieldContainer?.querySelector('label');
    return label?.textContent.trim() || field.name || 'Required field';
  }

  function showValidationSummary(fields) {
    if (!validationSummary || !fields.length) return;

    var heading = document.createElement('strong');
    heading.textContent = fields.length === 1
      ? 'Please complete this field:'
      : 'Please complete these fields:';
    var list = document.createElement('ul');
    list.style.margin = '8px 0 0 18px';

    fields.slice(0, 5).forEach(function (field) {
      var item = document.createElement('li');
      item.textContent = getFieldLabel(field);
      list.appendChild(item);
    });

    validationSummary.replaceChildren(heading, list);
    validationSummary.hidden = false;
    validationSummary.focus();
  }

  function setWizardStep(index, shouldScroll) {
    if (!applicationForm || !wizardSections.length) return;

    currentWizardStep = Math.max(0, Math.min(index, wizardSections.length - 1));
    highestWizardStep = Math.max(highestWizardStep, currentWizardStep);
    clearValidationSummary();
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

    wizardStepButtons.forEach(function (button, buttonIndex) {
      button.classList.toggle('is-current', buttonIndex === currentWizardStep);
      button.disabled = buttonIndex > highestWizardStep;
      if (buttonIndex === currentWizardStep) {
        button.setAttribute('aria-current', 'step');
      } else {
        button.removeAttribute('aria-current');
      }
    });

    if (shouldScroll) {
      document.querySelector('.form-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function validateFields(fields) {
    if (!enforceApplicationRequiredFields) return true;

    var invalidFields = Array.from(fields).filter(function (field) {
      return !field.checkValidity();
    });

    if (invalidFields.length) {
      showValidationSummary(invalidFields);
      return false;
    }

    clearValidationSummary();
    return true;
  }

  function validateCurrentWizardStep() {
    var activeStep = wizardSections[currentWizardStep];
    if (!activeStep) return true;

    return validateFields(activeStep.querySelectorAll('input, select, textarea'));
  }

  function validateApplicationBeforeSubmit() {
    if (!applicationForm) return false;

    return validateFields(applicationForm.querySelectorAll('input, select, textarea'));
  }

  function updateRequiredFieldsMode() {
    if (!applicationForm) return;

    applicationForm.querySelectorAll('[required]').forEach(function (field) {
      field.required = enforceApplicationRequiredFields;
    });
  }

  function updateSelectedPlanNotice(planInput) {
    if (!planInput) return;
    if (selectedPlanName) {
      selectedPlanName.textContent = planInput.closest('label')?.querySelector('span')?.textContent.trim() || planInput.value;
    }
    if (selectedPlanNotice) selectedPlanNotice.hidden = false;
  }

  function preselectRequestedPlan() {
    if (!applicationForm) return;

    var requestedPlan = new URLSearchParams(window.location.search).get('plan');
    var allowedPlans = ['workout-plan', 'plan-intro', 'in-person', 'online'];
    if (!allowedPlans.includes(requestedPlan)) return;

    var planInput = Array.from(applicationForm.querySelectorAll('input[name="package_interest"][data-plan]')).find(function (input) {
      return input.dataset.plan === requestedPlan;
    });

    if (!planInput) return;
    planInput.checked = true;
    updateSelectedPlanNotice(planInput);
  }

  function setupPlanNotice() {
    if (!applicationForm) return;
    applicationForm.querySelectorAll('input[name="package_interest"]').forEach(function (input) {
      input.addEventListener('change', function () {
        updateSelectedPlanNotice(input);
      });
    });
  }

  function setupConditionalField(groupName, fieldId, inputId) {
    if (!applicationForm) return;

    var field = document.getElementById(fieldId);
    var input = document.getElementById(inputId);
    var options = applicationForm.querySelectorAll('input[name="' + groupName + '"]');
    if (!field || !input || !options.length) return;

    function update() {
      var selected = applicationForm.querySelector('input[name="' + groupName + '"]:checked');
      var shouldShow = selected?.value === 'Yes';
      field.hidden = !shouldShow;
      input.required = shouldShow;
      if (!shouldShow) input.value = '';
    }

    options.forEach(function (option) {
      option.addEventListener('change', update);
    });
    update();
  }

  function updateWizardMode() {
    if (!applicationForm || !wizardSections.length) return;
    applicationForm.classList.add('wizard-active');
    setWizardStep(currentWizardStep);
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
    applicationForm.addEventListener('input', clearValidationSummary);
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

  wizardStepButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var requestedStep = Number(button.dataset.wizardStep);
      if (!Number.isInteger(requestedStep) || requestedStep > highestWizardStep) return;
      if (requestedStep > currentWizardStep && !validateCurrentWizardStep()) return;
      setWizardStep(requestedStep, true);
    });
  });

  updateRequiredFieldsMode();
  preselectRequestedPlan();
  setupPlanNotice();
  setupConditionalField('currently_exercising', 'previousTrainingField', 'previousTrainingType');
  updateWizardMode();
  try {
    sessionStorage.setItem('introSeen', '1');
  } catch (error) {
    // The form remains fully functional when browser storage is unavailable.
  }
})();
