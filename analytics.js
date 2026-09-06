(function () {
  'use strict';

  var measurementId = 'G-JW5VSQTHQJ';
  var consentKey = 'fitsronomy:analytics-consent';
  var loaded = false;
  var banner = null;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });

  function getConsent() {
    try {
      return window.localStorage.getItem(consentKey);
    } catch (error) {
      return null;
    }
  }

  function saveConsent(value) {
    try {
      window.localStorage.setItem(consentKey, value);
    } catch (error) {
      // The current choice still applies until the page is closed.
    }
  }

  function loadAnalytics() {
    if (loaded) return;
    loaded = true;

    window.gtag('consent', 'update', { analytics_storage: 'granted' });

    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }

  function clearAnalyticsCookies() {
    var hostname = window.location.hostname;
    var parentDomain = hostname.split('.').length > 1 ? '.' + hostname.replace(/^www\./, '') : '';

    document.cookie.split(';').forEach(function (cookie) {
      var name = cookie.split('=')[0].trim();
      if (!/^(_ga|_gid|_gat)/.test(name)) return;

      document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
      if (parentDomain) {
        document.cookie = name + '=; Max-Age=0; path=/; domain=' + parentDomain + '; SameSite=Lax';
      }
    });
  }

  function removeBanner() {
    if (!banner) return;
    banner.remove();
    banner = null;
  }

  function choose(value) {
    saveConsent(value);
    if (value === 'granted') {
      loadAnalytics();
    } else {
      window.gtag('consent', 'update', { analytics_storage: 'denied' });
      clearAnalyticsCookies();
    }
    removeBanner();
  }

  function showBanner() {
    if (banner) return;

    banner = document.createElement('aside');
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'cookieConsentTitle');
    banner.innerHTML = [
      '<div class="cookie-consent-copy">',
      '<strong id="cookieConsentTitle">Analytics cookies</strong>',
      '<p>Google Analytics helps improve this website. It loads only if you allow analytics cookies. <a href="privacy.html#analytics-cookies">Privacy details</a></p>',
      '</div>',
      '<div class="cookie-consent-actions">',
      '<button type="button" class="cookie-choice" data-cookie-reject>Reject</button>',
      '<button type="button" class="cookie-choice cookie-choice-primary" data-cookie-accept>Allow analytics</button>',
      '</div>'
    ].join('');

    document.body.appendChild(banner);
    banner.querySelector('[data-cookie-reject]').addEventListener('click', function () {
      choose('denied');
    });
    banner.querySelector('[data-cookie-accept]').addEventListener('click', function () {
      choose('granted');
    });
    banner.querySelector('[data-cookie-reject]').focus({ preventScroll: true });
  }

  function showBannerWhenReady() {
    if (document.body.classList.contains('intro-pending')) {
      document.addEventListener('intro:finished', showBanner, { once: true });
      return;
    }

    showBanner();
  }

  document.addEventListener('click', function (event) {
    if (!event.target.closest('[data-cookie-settings]')) return;
    event.preventDefault();
    showBanner();
  });

  if (getConsent() === 'granted') {
    loadAnalytics();
  } else if (getConsent() !== 'denied') {
    showBannerWhenReady();
  }
})();
