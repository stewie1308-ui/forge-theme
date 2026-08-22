/**
 * FORGE THEME — theme.js
 * Core JS. No external dependencies. Initialises on DOMContentLoaded.
 */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     FORGE UTILITIES
     ---------------------------------------------------------- */
  window.Forge = window.Forge || {};

  Object.assign(window.Forge, {

    /** Query one element */
    qs(selector, root) {
      return (root || document).querySelector(selector);
    },

    /** Query all elements as array */
    qsa(selector, root) {
      return Array.from((root || document).querySelectorAll(selector));
    },

    /** Dispatch a custom event */
    emit(name, detail, target) {
      (target || document).dispatchEvent(
        new CustomEvent(name, { bubbles: true, detail: detail || {} })
      );
    },

    /** Debounce a function */
    debounce(fn, ms) {
      let t;
      return function () {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, arguments), ms);
      };
    },

    /** Throttle a function */
    throttle(fn, ms) {
      let active = false;
      return function () {
        if (!active) {
          fn.apply(this, arguments);
          active = true;
          setTimeout(() => { active = false; }, ms);
        }
      };
    },

    /** Format cents as currency string */
    formatMoney(cents) {
      const currency =
        (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) ||
        (window.Forge && window.Forge.currency) ||
        'USD';
      const locale   = document.documentElement.lang || 'en-GB';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2
      }).format(cents / 100);
    },

    /** Trap keyboard focus inside an element. Returns cleanup function. */
    trapFocus(el) {
      const candidates = el.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      /* Only elements that actually render can take focus. getClientRects() is
         empty for display:none and visibility:hidden. Without this the search
         drawer's first "focusable" was its hidden type=product input, so
         first.focus() below did nothing at all and focus never entered the
         dialog — it stayed on the button behind it. */
      const focusable = Array.prototype.filter.call(candidates, function (n) {
        return n.getClientRects().length > 0;
      });
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];

      function handler(e) {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
        }
      }

      el.addEventListener('keydown', handler);
      if (first) first.focus();
      return function () { el.removeEventListener('keydown', handler); };
    },

    /** Saved focus target for restoring after drawer/modal close */
    _returnFocus: null,

  });


  /* ----------------------------------------------------------
     PRODUCT CARD HOVER IMAGE
     ---------------------------------------------------------- */
  /* The second product image is rendered without a src, because loading="lazy"
     still fetches every card in or near the viewport — on a collection page that
     doubles image requests for an effect a touch device can never trigger. Fill
     it in on first hover, once per image, and never where hover is unavailable.
     Delegated from the document so it survives markup being re-rendered. */
  function initCardHoverImages() {
    if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;

    function load(e) {
      var card = e.target.closest && e.target.closest('.product-card');
      if (!card) return;
      var img = card.querySelector('.product-card__img--hover[data-hover-src]');
      if (!img) return;
      img.src = img.dataset.hoverSrc;
      img.removeAttribute('data-hover-src');
    }

    /* pointerover fires for mouse and pen but not touch taps, and bubbles, so one
       listener covers every card including ones added later. */
    document.addEventListener('pointerover', load);
    document.addEventListener('focusin', load);   /* keyboard users reach it via the card link */
  }

  /* ----------------------------------------------------------
     SCROLL REVEAL
     ---------------------------------------------------------- */
  function initReveal() {
    if (!('IntersectionObserver' in window)) return;

    var items = Forge.qsa('.reveal, .stagger');
    if (!items.length) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { observer.observe(el); });
  }


  /* ----------------------------------------------------------
     TOAST NOTIFICATIONS
     ---------------------------------------------------------- */
  function showToast(message, type) {
    type = type || 'success';
    var existing = Forge.qs('.toast');
    if (existing) {
      existing.classList.remove('is-visible');
    }

    var toast = document.createElement('div');
    toast.className = 'toast toast--' + type;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');
    toast.setAttribute('aria-atomic', 'true');

    var icon = type === 'success'
      ? '<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>'
      : '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>';

    toast.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">' + icon + '</svg>' +
      '<span>' + message + '</span>';

    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.classList.add('is-visible');
      });
    });

    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 350);
    }, 3200);
  }

  window.Forge.showToast = showToast;


  /* ----------------------------------------------------------
     QUANTITY SELECTORS
     ---------------------------------------------------------- */
  function initQtySelectors() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.qty__btn');
      if (!btn) return;

      var wrap = btn.closest('.qty');
      var input = wrap && wrap.querySelector('.qty__input');
      if (!input) return;

      var increase = btn.dataset.action === 'increase';
      var parsedVal = parseInt(input.value, 10);
      var parsedMin = parseInt(input.min, 10);
      var parsedMax = parseInt(input.max, 10);
      /* `|| fallback` swallows a legitimate 0, which is how cart lines are
         removed — test for NaN instead. */
      var current  = isNaN(parsedVal) ? 1 : parsedVal;
      var min      = isNaN(parsedMin) ? 1 : parsedMin;
      var max      = isNaN(parsedMax) ? 999 : parsedMax;
      var next     = Math.max(min, Math.min(max, current + (increase ? 1 : -1)));

      if (next !== current) {
        input.value = next;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }


  /* ----------------------------------------------------------
     ANNOUNCEMENT BAR DISMISS
     ---------------------------------------------------------- */
  function initAnnouncementBar() {
    var bar  = Forge.qs('.announcement-bar');
    var btn  = Forge.qs('.announcement-bar__close');
    if (!bar || !btn) return;

    if (sessionStorage.getItem('forge-ann-closed')) {
      bar.remove();
      return;
    }

    btn.addEventListener('click', function () {
      bar.style.transition = 'max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease';
      bar.style.maxHeight  = bar.offsetHeight + 'px';
      bar.style.overflow   = 'hidden';
      requestAnimationFrame(function () {
        bar.style.maxHeight = '0';
        bar.style.opacity   = '0';
        bar.style.padding   = '0';
      });
      setTimeout(function () { bar.remove(); }, 320);
      sessionStorage.setItem('forge-ann-closed', '1');
    });
  }


  /* ----------------------------------------------------------
     LOCALIZATION SELECTORS (Shopify Markets)
     ---------------------------------------------------------- */
  function initLocalization() {
    Forge.qsa('[data-localization-select]').forEach(function (select) {
      select.addEventListener('change', function () {
        var form = select.closest('form');
        if (form) form.submit();
      });
    });
  }


  /* ----------------------------------------------------------
     INITIALISE ALL MODULES
     ---------------------------------------------------------- */
  function init() {
    initReveal();
    initCardHoverImages();
    initQtySelectors();
    initAnnouncementBar();
    initLocalization();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
