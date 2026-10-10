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
     Desktop dropdown menus. One state — the .is-open class (+ aria-expanded)
     on at most one .nav-dropdown — driven by:
     • mouse: open on enter (switching menus swaps at once); close shortly
       after the pointer leaves the trigger + panel, so a diagonal path
       into the panel never closes it;
     • touch / pen / click: the trigger toggles (no hover forced on touch);
     • keyboard: focus inside opens it; focus leaving closes it;
     • a click outside or Escape closes it.
     The CSS only animates opacity and transform on that class.
     ------------------------------------------------------------------ */
  var dropdowns = Array.prototype.slice.call(document.querySelectorAll('.main-nav .nav-dropdown'));
  var openDropdown = null;
  var closeTimer = 0;
  var setState = function (dropdown, open) {
    dropdown.classList.toggle('is-open', open);
    dropdown.querySelector('.nav-dropdown-trigger').setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  var openMenu = function (dropdown) {
    clearTimeout(closeTimer);
    if (openDropdown === dropdown) return;
    if (openDropdown) setState(openDropdown, false);
    openDropdown = dropdown;
    setState(dropdown, true);
  };
  var closeMenu = function () {
    clearTimeout(closeTimer);
    if (!openDropdown) return;
    setState(openDropdown, false);
    openDropdown = null;
  };
  // Hover-intent grace period: long enough to cross into the panel, short enough not to feel sticky.
  var closeSoon = function () { clearTimeout(closeTimer); closeTimer = setTimeout(closeMenu, 140); };
  // Whether the latest press (mouse, touch, pen) landed on a desktop menu; any key press clears it.
  var pressed = false;
  document.addEventListener('pointerdown', function (e) { pressed = !!(e.target.closest && e.target.closest('.main-nav .nav-dropdown')); }, true);
  document.addEventListener('keydown', function () { pressed = false; }, true);

  dropdowns.forEach(function (dropdown) {
    var trigger = dropdown.querySelector('.nav-dropdown-trigger');
    dropdown.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') openMenu(dropdown); });
    dropdown.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && openDropdown === dropdown) closeSoon(); });
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      // A mouse click on a menu that hover already opened keeps it open; otherwise the trigger toggles.
      // (Browsers without click.pointerType: a real click while hovered counts as mouse.)
      var hoverOpened = e.pointerType !== undefined ? e.pointerType === 'mouse' : e.detail > 0 && dropdown.matches(':hover');
      if (openDropdown === dropdown && !hoverOpened) closeMenu();
      else openMenu(dropdown);
    });
    // Focus from a press (mouse, touch, pen) is left to the click above; only keyboard focus opens here —
    // otherwise a tap would open on focus and then immediately toggle shut on click.
    dropdown.addEventListener('focusin', function () {
      if (pressed) return;
      openMenu(dropdown);
    });
    dropdown.addEventListener('focusout', function (e) {
      if (openDropdown === dropdown && !dropdown.contains(e.relatedTarget) && !dropdown.matches(':hover')) closeMenu();
    });
  });

  // Close an open dropdown when clicking anywhere else on the page.
  document.addEventListener('click', function (e) {
    if (openDropdown && !openDropdown.contains(e.target)) closeMenu();
  });

  /* ------------------------------------------------------------------
     Smooth-scroll for in-page anchor links (e.g. href="#some-id")
     ------------------------------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      var targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;

      // Only plain element ids (e.g. #main-content); app links like #item=… are handled by page scripts.
      var target = /^#[A-Za-z][\w-]*$/.test(targetId) ? document.getElementById(targetId.slice(1)) : null;
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

  // Escape closes the open desktop dropdown and, if focus was inside it, returns focus to its trigger.
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !openDropdown) return;
    var dropdown = openDropdown;
    var hadFocus = dropdown.contains(document.activeElement);
    closeMenu();
    if (hadFocus) {
      dropdown.querySelector('.nav-dropdown-trigger').focus(); // its focusin reopens the menu…
      closeMenu(); // …so close it again: Escape leaves focus on the trigger of a closed menu.
    }
  });

}
