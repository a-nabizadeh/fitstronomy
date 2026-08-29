(function () {
  var heroScienceText = document.getElementById('heroScienceText');

  function renderScienceText(fullText, typedLength) {
    if (!heroScienceText) return;

    var visibleText = fullText.slice(0, typedLength);
    var boldPrefix = 'Science-Backed Training.';
    var cursor = document.createElement('span');
    cursor.className = 'hero-science-cursor';
    cursor.textContent = '|';

    heroScienceText.replaceChildren();

    if (visibleText.startsWith(boldPrefix)) {
      var strong = document.createElement('strong');
      strong.textContent = boldPrefix;
      heroScienceText.append(strong, visibleText.slice(boldPrefix.length), cursor);
      return;
    }

    heroScienceText.append(visibleText, cursor);
  }

  function startHeroScienceTyping() {
    if (!heroScienceText) return;

    var fullText = heroScienceText.dataset.fullText || '';
    var index = 0;

    renderScienceText(fullText, index);

    var typingInterval = window.setInterval(function () {
      index += 1;
      renderScienceText(fullText, index);

      if (index >= fullText.length) {
        window.clearInterval(typingInterval);
        renderScienceText(fullText, fullText.length);
      }
    }, 22);
  }

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
  }

  function setupIntro() {
    var introSeen = sessionStorage.getItem('introSeen');
    sessionStorage.removeItem('introSeen');

    if (introSeen) {
      var introEl = document.getElementById('anatomyIntro');
      if (introEl) {
        introEl.style.display = 'none';
        introEl.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('intro-lock');
      }
      setTimeout(startHeroScienceTyping, 800);
      return;
    }

    var intro = document.getElementById('anatomyIntro');
    var canvasWrap = intro && intro.querySelector('.intro-canvas-wrap');
    var skipButton = intro && intro.querySelector('[data-intro-skip]');
    var statusEl = intro && intro.querySelector('[data-intro-status]');
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var chart = null;
    var timers = [];
    var finished = false;
    var bodyState = {};

    function clearTimers() {
      timers.forEach(clearTimeout);
      timers = [];
    }

    function finishIntro(completed) {
      if (!intro || finished) return;
      finished = true;
      intro.classList.add('is-hidden');
      intro.setAttribute('aria-hidden', 'true');
      clearTimers();
      if (chart) chart.destroy();
      document.body.classList.remove('intro-lock');
      if (completed) {
        sessionStorage.setItem('introSeen', '1');
      }
      setTimeout(startHeroScienceTyping, 400);
    }

    if (reducedMotion || !canvasWrap || !window.BodyMuscles) {
      finishIntro(false);
      return;
    }

    intro.dataset.ready = 'true';
    document.body.classList.add('intro-lock');

    function createChartContainer() {
      var container = document.createElement('div');
      container.className = 'body-muscles-container';
      container.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;';
      canvasWrap.appendChild(container);
      return container;
    }

    var container = createChartContainer();
    var BodyChart = window.BodyMuscles.BodyChart;
    var ViewSide = window.BodyMuscles.ViewSide;
    var frontMuscles = window.BodyMuscles.FRONT_MUSCLES || [];
    var availableIds = frontMuscles.map(function (muscle) { return muscle.id; });

    if (window.BodyMuscles.INTENSITY_COLORS) {
      Object.assign(window.BodyMuscles.INTENSITY_COLORS, {
        0: '#2a1a1a',
        1: '#351f1f',
        2: '#442323',
        3: '#5b2929',
        4: '#733030',
        5: '#8c3535',
        6: '#a73b3b',
        7: '#bf4141',
        8: '#d34848',
        9: '#e24b4a',
        10: '#ff6b68'
      });
    }

    var style = document.createElement('style');
    style.textContent = [
      '.body-muscles-container .body-chart-background path { fill: #2a1a1a; stroke: #3a2020; stroke-width: 0.5; }',
      '.body-muscles-container .body-chart-muscle { stroke: #3a2020; stroke-width: 0.18; transition: fill 0.3s, fill-opacity 0.3s, filter 0.3s; }',
      '.body-muscles-container .body-chart-svg { background: transparent !important; filter: drop-shadow(0 18px 42px rgba(0,0,0,0.45)) drop-shadow(0 0 30px rgba(226,75,74,0.16)) !important; }'
    ].join('');
    document.head.appendChild(style);

    chart = new BodyChart(container, {
      view: ViewSide.FRONT,
      bodyState: {},
      showViewLabel: false,
      enableTransitions: true,
      className: 'body-muscles-container'
    });

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
        if (!availableIds.includes(id)) return;
        bodyState[id] = { intensity: intensity, selected: false };
      });
      chart.update({ bodyState: Object.assign({}, bodyState) });
    }

    function showStmt(id, inTime, outTime) {
      var el = document.getElementById(id);
      if (!el) return;

      var tIn = setTimeout(function () {
        el.classList.add('is-visible');
      }, inTime);
      timers.push(tIn);

      if (outTime) {
        var tOut = setTimeout(function () {
          el.classList.remove('is-visible');
        }, outTime);
        timers.push(tOut);
      }
    }

    function runSequence() {
      var delay = 300;
      sequence.forEach(function (group) {
        var t1 = setTimeout(function () {
          lightUp(group, 10);
          var t2 = setTimeout(function () {
            lightUp(group, 4);
          }, 600);
          timers.push(t2);
        }, delay);
        timers.push(t1);
        delay += 260;
      });

      var totalDuration = sequence.length * 260;
      var third = Math.round(totalDuration / 3);

      showStmt('stmt-1', 0, third);
      showStmt('stmt-2', third, third * 2);
      showStmt('stmt-3', third * 2, totalDuration);

      timers.push(setTimeout(function () {
        finishIntro(true);
      }, totalDuration + 600));
    }

    if (skipButton) {
      skipButton.addEventListener('click', function () {
        clearTimers();
        finishIntro(false);
      });
    }

    if (statusEl) statusEl.textContent = '';
    timers.push(setTimeout(runSequence, 400));
    timers.push(setTimeout(function () {
      finishIntro(false);
    }, 12000));

    intro.addEventListener('replayIntro', function () {
      finished = false;
      bodyState = {};
      clearTimers();

      if (chart) {
        try {
          chart.destroy();
        } catch (error) {
          chart = null;
        }
        chart = null;
      }

      if (canvasWrap) {
        canvasWrap.replaceChildren();
        var newContainer = createChartContainer();

        if (window.BodyMuscles) {
          chart = new window.BodyMuscles.BodyChart(newContainer, {
            view: window.BodyMuscles.ViewSide.FRONT,
            bodyState: {},
            showViewLabel: false,
            enableTransitions: true
          });
        }
      }

      timers.push(setTimeout(runSequence, 500));
      timers.push(setTimeout(function () {
        finishIntro(true);
      }, 12000));
    });
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
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function animateStat(statEl, delay) {
      var num = statEl.querySelector('.stat-num');
      var fill = statEl.querySelector('.stat-progress-fill');
      var target = parseInt(statEl.dataset.target, 10);
      var suffix = statEl.dataset.suffix;
      var duration = 1800;

      if (!num || !fill || !Number.isFinite(target)) return;

      setTimeout(function () {
        fill.style.width = '100%';
        var start = performance.now();

        (function tick(now) {
          var progress = Math.min((now - start) / duration, 1);
          num.textContent = Math.round(easeOut(progress) * target) + suffix;

          if (progress < 1) {
            requestAnimationFrame(tick);
            return;
          }

          num.textContent = target + suffix;
          num.classList.add('pulse');
          num.addEventListener('animationend', function () {
            num.classList.remove('pulse');
          }, { once: true });
        })(start);
      }, delay);
    }

    var observed = false;
    var stats = document.querySelectorAll('#statsBar .stat');
    var bar = document.getElementById('statsBar');
    if (!bar || !stats.length) return;

    function runAnimation() {
      if (observed) return;
      observed = true;
      stats.forEach(function (stat, index) {
        var delay = index * 140;
        setTimeout(function () {
          stat.classList.add('visible');
        }, delay);
        animateStat(stat, delay + 100);
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runAnimation();
          observer.disconnect();
        }
      });
    }, { threshold: 0.3 });

    observer.observe(bar);
  }

  function setupServiceCards() {
    document.querySelectorAll('.service-card').forEach(function (card) {
      function toggle() {
        card.classList.toggle('is-flipped');
      }

      card.addEventListener('click', toggle);
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      });
    });
  }

  function setupIntroReplay() {
    function replayIntro() {
      var intro = document.getElementById('anatomyIntro');
      if (!intro) return;

      sessionStorage.removeItem('introSeen');

      var navLinks = document.getElementById('navLinks');
      var hamburger = document.querySelector('.hamburger');
      if (navLinks) navLinks.classList.remove('open');
      if (hamburger) {
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }

      ['stmt-1', 'stmt-2', 'stmt-3'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.classList.remove('is-visible');
      });

      var scienceText = document.getElementById('heroScienceText');
      if (scienceText) scienceText.replaceChildren();

      intro.style.display = '';
      intro.classList.remove('is-hidden');
      intro.setAttribute('aria-hidden', 'false');
      document.body.classList.add('intro-lock');

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          intro.dispatchEvent(new CustomEvent('replayIntro'));
        });
      });
    }

    var btn1 = document.getElementById('replayIntroBtn');
    var btn2 = document.getElementById('replayIntroBtnMobile');
    if (btn1) btn1.addEventListener('click', replayIntro);
    if (btn2) btn2.addEventListener('click', replayIntro);
  }

  function setupCurrencyDrawer() {
    var drawer = document.getElementById('currencyDrawer');
    var tab = document.getElementById('currencyDrawerTab');
    var label = document.getElementById('currencyDrawerLabel');
    var currentCurrency = 'eur';

    function closeDrawer() {
      if (drawer) drawer.classList.remove('is-open');
    }

    function openDrawer() {
      if (drawer) drawer.classList.add('is-open');
    }

    if (tab) {
      tab.addEventListener('click', function (event) {
        event.stopPropagation();
        if (drawer && drawer.classList.contains('is-open')) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });
    }

    document.addEventListener('click', function (event) {
      if (drawer && !drawer.contains(event.target)) {
        closeDrawer();
      }
    });

    document.querySelectorAll('.currency-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var currency = btn.dataset.currency;
        if (!['eur', 'sek'].includes(currency)) return;

        if (currency === currentCurrency) {
          closeDrawer();
          return;
        }

        currentCurrency = currency;

        document.querySelectorAll('.currency-btn').forEach(function (otherButton) {
          otherButton.classList.toggle('is-active', otherButton.dataset.currency === currency);
        });

        if (label) {
          label.textContent = currency === 'eur' ? '\u20ac' : 'kr';
        }

        document.querySelectorAll('.price-value').forEach(function (el) {
          el.classList.add('is-switching');
          setTimeout(function () {
            el.textContent = el.dataset[currency] || '';
            el.classList.remove('is-switching');
          }, 200);
        });

        setTimeout(closeDrawer, 300);
      });
    });
  }

  setupNavigation();
  setupPageReset();
  setupIntro();
  setupStatsAnimation();
  setupServiceCards();
  setupIntroReplay();
  setupCurrencyDrawer();
})();
