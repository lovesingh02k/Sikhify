/* ==========================================================================
   Sikhify — script.js
   Vanilla JS only. Mobile menu toggle, smooth-scroll anchor nav, scrollspy,
   and light interactivity.
   ========================================================================== */

export function initCommonInteractions() {

  /* ------------------------------------------------------------------
     Mobile menu toggle
     ------------------------------------------------------------------ */
  var menuToggle = document.getElementById('mobile-menu-toggle');
  var mobileMenu = document.getElementById('mobile-menu');

  if (menuToggle && mobileMenu) {
    var setMenu = function (open) {
      mobileMenu.classList.toggle('is-open', open);
      menuToggle.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    menuToggle.addEventListener('click', function () {
      setMenu(!mobileMenu.classList.contains('is-open'));
    });

    // Close mobile menu when a link inside it is clicked
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { setMenu(false); });
    });

    // Escape closes the menu and returns focus to the toggle.
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !mobileMenu.classList.contains('is-open')) return;
      setMenu(false);
      menuToggle.focus();
    });
  }

  /* ------------------------------------------------------------------
     Desktop dropdown menus: also support click/tap (not just hover),
     so the same markup works on touch devices.
     ------------------------------------------------------------------ */
  var dropdownTriggers = document.querySelectorAll('.nav-dropdown-trigger');
  dropdownTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function (e) {
      var dropdown = trigger.closest('.nav-dropdown');
      var panel = dropdown ? dropdown.querySelector('.nav-dropdown-panel') : null;
      if (!panel) return;

      var isOpen = panel.style.visibility === 'visible';

      // Close any other open dropdowns first
      document.querySelectorAll('.nav-dropdown-panel').forEach(function (p) {
        p.style.visibility = '';
        p.style.opacity = '';
        p.style.transform = '';
      });
      document.querySelectorAll('.nav-dropdown-trigger').forEach(function (t) {
        t.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        panel.style.visibility = 'visible';
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
        trigger.setAttribute('aria-expanded', 'true');
      }
      e.stopPropagation();
    });
  });

  // Close open dropdowns when clicking anywhere else on the page
  document.addEventListener('click', function () {
    document.querySelectorAll('.nav-dropdown-panel').forEach(function (p) {
      p.style.visibility = '';
      p.style.opacity = '';
      p.style.transform = '';
    });
    document.querySelectorAll('.nav-dropdown-trigger').forEach(function (t) {
      t.setAttribute('aria-expanded', 'false');
    });
  });

  /* ------------------------------------------------------------------
     Smooth-scroll for in-page anchor links (e.g. href="#some-id")
     ------------------------------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;

      // Only plain element ids (e.g. #main-content); app links like #item=… are handled by page scripts.
      var target = /^#[A-Za-z][w-]*$/.test(targetId) ? document.getElementById(targetId.slice(1)) : null;
      if (!target) return;

      e.preventDefault();
      var headerOffset = 90; // sticky header height
      var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // Move focus for accessibility once the scroll settles
      window.setTimeout(function () {
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }, 400);
    });
  });

  /* ------------------------------------------------------------------
     Scrollspy: highlight the matching nav link as sections scroll by
     ------------------------------------------------------------------ */
  var sections = document.querySelectorAll('main section[id]');
  var navLinks = document.querySelectorAll('.main-nav .nav-link, .mobile-nav-link');

  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var spyObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.getAttribute('id');

        navLinks.forEach(function (link) {
          var href = link.getAttribute('href') || '';
          var linkMatches = href === '#' + id;
          link.classList.toggle('is-scroll-active', linkMatches);
        });
      });
    }, {
      rootMargin: '-45% 0px -50% 0px',
      threshold: 0
    });

    sections.forEach(function (section) {
      spyObserver.observe(section);
    });
  }

  /* ------------------------------------------------------------------
     Dark mode is handled by js/core.js (Sikhify.theme): it toggles
     html.theme-dark and remembers the choice in localStorage.
     ------------------------------------------------------------------ */

  /* ------------------------------------------------------------------
     Mobile menu: expandable sub-menus mirroring the desktop dropdowns
     ------------------------------------------------------------------ */
  document.querySelectorAll('.mobile-nav-toggle').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var panel = document.getElementById(toggle.getAttribute('aria-controls'));
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (panel) panel.hidden = open;
    });
  });

  // Escape closes any open desktop dropdown and returns focus to its trigger.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var openTrigger = document.querySelector('.nav-dropdown-trigger[aria-expanded="true"]');
    document.querySelectorAll('.nav-dropdown-panel').forEach(function (p) {
      p.style.visibility = ''; p.style.opacity = ''; p.style.transform = '';
    });
    document.querySelectorAll('.nav-dropdown-trigger').forEach(function (t) { t.setAttribute('aria-expanded', 'false'); });
    var focusedPanel = document.activeElement && document.activeElement.closest('.nav-dropdown');
    if (openTrigger) openTrigger.focus();
    else if (focusedPanel) focusedPanel.querySelector('.nav-dropdown-trigger').focus();
  });

}
