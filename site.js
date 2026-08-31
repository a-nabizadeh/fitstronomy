(function () {
  function setupNavigation() {
    var navLinks = document.getElementById('navLinks');
    var hamburger = document.querySelector('.hamburger');
    if (!navLinks || !hamburger) return;

    function setOpen(isOpen) {
      navLinks.classList.toggle('open', isOpen);
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', String(isOpen));
    }

    function toggleOpen() {
      setOpen(!navLinks.classList.contains('open'));
    }

    hamburger.addEventListener('click', toggleOpen);
    hamburger.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleOpen();
      }
    });

    navLinks.addEventListener('click', function (event) {
      if (event.target.closest('a, button')) setOpen(false);
    });
  }

  // The intro plays on arrival at the site and on every reload of the home page,
  // but not when coming back to it from another page here (apply, privacy).
  var INTRO_SEEN_KEY = 'fitstronomy:intro-seen';

  function readIntroSeen() {
    try {
      return window.sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
    } catch (error) {
      return false;
    }
  }

  function markIntroSeen() {
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch (error) {
      /* Private browsing can block storage; the intro simply plays again. */
    }
  }

  function shouldPlayIntro() {
    var entries = performance.getEntriesByType ? performance.getEntriesByType('navigation') : null;
    var navigationType = entries && entries.length ? entries[0].type : null;

    if (navigationType === 'reload') return true;
    return !readIntroSeen();
  }

  function setupIntro() {
    var intro = document.getElementById('anatomyIntro');
    if (!intro) {
      document.body.classList.remove('intro-pending');
      return;
    }

    var canvasWrap = intro.querySelector('[data-intro-canvas]');
    var skipButton = intro.querySelector('[data-intro-skip]');
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var chart = null;
    var timers = [];
    var finished = false;
    var bodyState = {};

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function finishIntro() {
      if (finished) return;
      finished = true;
      clearTimers();
      intro.classList.add('is-hidden');
      intro.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('intro-lock', 'intro-pending');
      document.dispatchEvent(new CustomEvent('intro:finished'));

      setTimeout(function () {
        if (chart) chart.destroy();
        chart = null;
      }, 750);
    }

    var playIntro = shouldPlayIntro();
    markIntroSeen();

    if (reducedMotion || !playIntro) {
      intro.style.display = 'none';
      intro.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('intro-lock', 'intro-pending');
      return;
    }

    if (!canvasWrap || !window.BodyMuscles) {
      finishIntro();
      return;
    }

    intro.dataset.ready = 'true';
    document.body.classList.add('intro-lock');

    var container = document.createElement('div');
    container.className = 'body-muscles-container';
    canvasWrap.appendChild(container);

    var BodyChart = window.BodyMuscles.BodyChart;
    var ViewSide = window.BodyMuscles.ViewSide;
    var frontMuscles = window.BodyMuscles.FRONT_MUSCLES || [];
    var availableIds = frontMuscles.map(function (muscle) { return muscle.id; });

    if (window.BodyMuscles.INTENSITY_COLORS) {
      Object.assign(window.BodyMuscles.INTENSITY_COLORS, {
        0: '#171321',
        1: '#211936',
        2: '#2d214b',
        3: '#3d2c65',
        4: '#50387f',
        5: '#65469a',
        6: '#7a58b7',
        7: '#8b6bff',
        8: '#b365cc',
        9: '#da609f',
        10: '#ff5c7a'
      });
    }

    var introStyle = document.createElement('style');
    introStyle.textContent = [
      '.body-muscles-container .body-chart-background path{fill:#171321;stroke:#32284a;stroke-width:.5}',
      '.body-muscles-container .body-chart-muscle{stroke:#32284a;stroke-width:.18;transition:fill .3s,fill-opacity .3s,filter .3s}',
      '.body-muscles-container .body-chart-svg{background:transparent!important;filter:drop-shadow(0 18px 42px rgba(0,0,0,.45)) drop-shadow(0 0 30px rgba(139,107,255,.24))!important}'
    ].join('');
    document.head.appendChild(introStyle);

    try {
      chart = new BodyChart(container, {
        view: ViewSide.FRONT,
        bodyState: {},
        showViewLabel: false,
        enableTransitions: true,
        className: 'body-muscles-container'
      });
    } catch (error) {
      finishIntro();
      return;
    }

    var sequence = [
      ['foot-left', 'foot-right'],
      ['tibialis-anterior-left', 'tibialis-anterior-right'],
      ['knee-left', 'knee-right'],
      ['quads-left', 'quads-right'],
      ['adductors-left', 'adductors-right'],
      ['hip-flexor-left', 'hip-flexor-right'],
      ['obliques-left', 'obliques-right'],
      ['serratus-anterior-left', 'serratus-anterior-right'],
      ['abs-lower-left', 'abs-lower-right'],
      ['abs-upper-left', 'abs-upper-right'],
      ['hand-left', 'hand-right'],
      ['forearm-left', 'forearm-right'],
      ['elbow-left', 'elbow-right'],
      ['biceps-left', 'biceps-right'],
      ['chest-lower-left', 'chest-lower-right'],
      ['chest-upper-left', 'chest-upper-right'],
      ['shoulder-side-left', 'shoulder-side-right'],
      ['shoulder-front-left', 'shoulder-front-right'],
      ['neck-left', 'neck-right'],
      ['face'],
      ['head']
    ];

    function lightUp(ids, intensity) {
      ids.forEach(function (id) {
        if (availableIds.includes(id)) bodyState[id] = { intensity: intensity, selected: false };
      });
      chart.update({ bodyState: Object.assign({}, bodyState) });
    }

    function showStatement(id, inTime, outTime) {
      var element = document.getElementById(id);
      if (!element) return;

      timers.push(setTimeout(function () {
        element.classList.add('is-visible');
      }, inTime));
      timers.push(setTimeout(function () {
        element.classList.remove('is-visible');
      }, outTime));
    }

    function runSequence() {
      var delay = 300;
      sequence.forEach(function (group) {
        timers.push(setTimeout(function () {
          lightUp(group, 10);
          timers.push(setTimeout(function () {
            lightUp(group, 4);
          }, 600));
        }, delay));
        delay += 260;
      });

      var totalDuration = sequence.length * 260;
      var third = Math.round(totalDuration / 3);
      showStatement('stmt-1', 0, third);
      showStatement('stmt-2', third, third * 2);
      showStatement('stmt-3', third * 2, totalDuration);
      timers.push(setTimeout(function () {
        finishIntro();
      }, totalDuration + 600));
    }

    if (skipButton) {
      skipButton.addEventListener('click', function () {
        finishIntro();
      });
    }

    timers.push(setTimeout(runSequence, 400));
    timers.push(setTimeout(function () {
      finishIntro();
    }, 12000));
  }

  function setupCoachingCycle() {
    var dial = document.getElementById('coachingDial');
    if (!dial) return;

    var steps = [
      { title: 'Assess', body: 'Your goal, schedule, history, and starting point.' },
      { title: 'Build', body: 'A program shaped around your time, equipment, and response.' },
      { title: 'Progress', body: 'Sessions logged, numbers reviewed, plan adjusted.' }
    ];
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var segments = Array.from(dial.querySelectorAll('[data-cycle-segment]'));
    var stepButtons = Array.from(dial.querySelectorAll('[data-cycle-step]'));
    var visualizations = Array.from(dial.querySelectorAll('[data-cycle-viz]'));
    var title = document.getElementById('cycleTitle');
    var body = document.getElementById('cycleBody');
    var copy = dial.querySelector('.dial-copy');
    var ticks = document.getElementById('cycleTicks');
    var current = 0;
    var timer = null;
    var userEngaged = false;

    if (!segments.length || !title || !body || !copy || !ticks) return;

    for (var index = 0; index < 12; index += 1) {
      var angle = (-90 + index * 30) * Math.PI / 180;
      var innerRadius = 176;
      var outerRadius = index % 3 === 0 ? 188 : 183;
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 200 + innerRadius * Math.cos(angle));
      line.setAttribute('y1', 200 + innerRadius * Math.sin(angle));
      line.setAttribute('x2', 200 + outerRadius * Math.cos(angle));
      line.setAttribute('y2', 200 + outerRadius * Math.sin(angle));
      line.setAttribute('class', index % 3 === 0 ? 'cycle-tick is-major' : 'cycle-tick');
      ticks.appendChild(line);
    }

    function stopAutoTour() {
      userEngaged = true;
      if (timer) clearInterval(timer);
      timer = null;
    }

    function replayAnimations(element) {
      if (!element || typeof element.getAnimations !== 'function') return;
      element.getAnimations({ subtree: true }).forEach(function (animation) {
        animation.cancel();
        animation.play();
      });
    }

    function selectStage(stageIndex, fromUser) {
      if (fromUser) stopAutoTour();
      if (stageIndex === current) return;

      current = stageIndex;
      segments.forEach(function (segment, segmentIndex) {
        segment.classList.toggle('is-active', segmentIndex === stageIndex);
      });
      stepButtons.forEach(function (button, buttonIndex) {
        button.setAttribute('aria-pressed', String(buttonIndex === stageIndex));
      });
      visualizations.forEach(function (visualization, visualizationIndex) {
        visualization.classList.toggle('is-visible', visualizationIndex === stageIndex);
      });
      title.textContent = steps[stageIndex].title;
      body.textContent = steps[stageIndex].body;

      if (!reducedMotion) {
        copy.classList.remove('is-changing');
        void copy.offsetWidth;
        copy.classList.add('is-changing');
        replayAnimations(visualizations[stageIndex]);
      }
    }

    // Touch devices synthesise mouseenter on tap, which fires alongside click
    // and makes the change of step read as two separate jumps.
    var hoverCapable = window.matchMedia('(hover: hover)').matches;

    // The arcs are pointer targets only. Nothing inside the SVG is focusable: a
    // focused SVG element gets a rectangular indicator the size of its whole
    // bounding box, which on a phone covers most of the dial.
    segments.forEach(function (segment, segmentIndex) {
      if (hoverCapable) {
        segment.addEventListener('mouseenter', function () {
          selectStage(segmentIndex, true);
        });
      }
      segment.addEventListener('click', function () {
        selectStage(segmentIndex, true);
      });
    });

    // Focus, keyboard and assistive tech go through real buttons pinned over the
    // three node dots, so the focus ring is a circle around the dot.
    stepButtons.forEach(function (button, buttonIndex) {
      button.setAttribute('aria-pressed', String(buttonIndex === current));
      button.addEventListener('click', function () {
        selectStage(buttonIndex, true);
      });
      button.addEventListener('focus', function () {
        selectStage(buttonIndex, true);
      });
      button.addEventListener('keydown', function (event) {
        var step = 0;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') step = 1;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') step = -1;
        if (!step) return;
        event.preventDefault();
        var nextIndex = (buttonIndex + step + stepButtons.length) % stepButtons.length;
        stepButtons[nextIndex].focus();
        selectStage(nextIndex, true);
      });
    });

    function startAutoTour() {
      if (reducedMotion || userEngaged || timer) return;
      timer = setInterval(function () {
        selectStage((current + 1) % segments.length, false);
      }, 4200);
    }

    if (document.body.classList.contains('intro-pending')) {
      document.addEventListener('intro:finished', startAutoTour, { once: true });
    } else {
      startAutoTour();
    }

    if (!reducedMotion && window.matchMedia('(hover: hover)').matches) {
      var stage = dial.parentElement;
      stage.addEventListener('pointermove', function (event) {
        var bounds = dial.getBoundingClientRect();
        var pointerX = (event.clientX - bounds.left) / bounds.width - 0.5;
        var pointerY = (event.clientY - bounds.top) / bounds.height - 0.5;
        dial.style.transform = 'rotateY(' + (pointerX * 11) + 'deg) rotateX(' + (-pointerY * 11) + 'deg)';
      });
      stage.addEventListener('pointerleave', function () {
        dial.style.transform = '';
      });
    }
  }

  function setupPageReset() {
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
      window.scrollTo(0, 0);
    }

    window.addEventListener('load', function () {
      setTimeout(function () {
        window.scrollTo(0, 0);
      }, 0);
    });
  }

  function setupStatsAnimation() {
    var stats = document.getElementById('statsBar');
    if (!stats) return;
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var figures = Array.prototype.slice.call(stats.querySelectorAll('.fig'));

    stats.querySelectorAll('.bars').forEach(function (row) {
      var count = Number(row.dataset.bars) || 12;
      for (var index = 0; index < count; index += 1) {
        var bar = document.createElement('span');
        bar.className = 'u';
        bar.style.height = (12 + (index / (count - 1)) * 26) + 'px';
        bar.style.transitionDelay = (0.25 + index * 0.055) + 's';
        row.appendChild(bar);
      }
    });

    function countUp(element) {
      var target = Number(element.dataset.count);
      var from = element.dataset.from ? Number(element.dataset.from) : 0;
      var duration = 1500;
      var start = performance.now();

      function tick(now) {
        var progress = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = String(Math.round(from + (target - from) * eased));
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          element.textContent = String(target);
        }
      }

      requestAnimationFrame(tick);
    }

    function revealFigure(fig) {
      if (fig.classList.contains('in')) return;
      fig.classList.add('in');
      stats.classList.add('in');
      fig.querySelectorAll('[data-count]').forEach(function (element) {
        if (reducedMotion) {
          element.textContent = element.dataset.count;
        } else {
          countUp(element);
        }
      });
    }

    function revealAll() {
      figures.forEach(revealFigure);
    }

    if (reducedMotion) {
      revealAll();
      return;
    }

    stats.querySelectorAll('[data-count]').forEach(function (element) {
      element.textContent = element.dataset.from || '0';
    });

    if (!('IntersectionObserver' in window)) {
      revealAll();
      return;
    }

    // Observed per figure so the stacked mobile layout reveals each one as it
    // scrolls in; on desktop all three enter together and stay in step.
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        revealFigure(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });

    figures.forEach(function (fig) {
      observer.observe(fig);
    });
  }

  function setupNutritionDisclosure() {
    var button = document.getElementById('nutritionToggle');
    var calculator = document.getElementById('nutritionCalculator');
    if (!button || !calculator) return;

    button.addEventListener('click', function () {
      var willOpen = calculator.hidden;
      calculator.hidden = !willOpen;
      button.setAttribute('aria-expanded', String(willOpen));
      button.textContent = willOpen ? 'Close Calculator' : 'Open Calculator';
    });
  }

  function setupServiceCards() {
    document.querySelectorAll('.service-card').forEach(function (card) {
      var front = card.querySelector('.card-front');
      var back = card.querySelector('.card-back');

      function setFlipped(isFlipped) {
        card.classList.toggle('is-flipped', isFlipped);
        card.setAttribute('aria-pressed', String(isFlipped));
        if (front) front.setAttribute('aria-hidden', String(isFlipped));
        if (back) back.setAttribute('aria-hidden', String(!isFlipped));
      }

      function toggleCard() {
        setFlipped(!card.classList.contains('is-flipped'));
      }

      setFlipped(false);
      card.addEventListener('click', toggleCard);
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleCard();
        }
      });
    });
  }

  function setupCurrencySwitcher() {
    var currentCurrency = 'eur';

    document.querySelectorAll('.currency-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        var currency = button.dataset.currency;
        if (!['eur', 'sek'].includes(currency) || currency === currentCurrency) return;

        currentCurrency = currency;
        document.querySelectorAll('.currency-btn').forEach(function (otherButton) {
          var isActive = otherButton.dataset.currency === currency;
          otherButton.classList.toggle('is-active', isActive);
          otherButton.setAttribute('aria-pressed', String(isActive));
        });

        document.querySelectorAll('.price-value').forEach(function (element) {
          element.textContent = element.dataset[currency] || '';
        });
      });
    });
  }

  setupNavigation();
  setupIntro();
  setupCoachingCycle();
  setupPageReset();
  setupStatsAnimation();
  setupNutritionDisclosure();
  setupServiceCards();
  setupCurrencySwitcher();
})();
