(() => {
  'use strict';

  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ---------- Theme toggle (with circular reveal) ---------- */
  const darkMq = matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => {
    const t = root.getAttribute('data-theme');
    return t ? t === 'dark' : darkMq.matches;
  };
  const syncTheme = () => root.classList.toggle('is-dark', isDark());
  syncTheme();
  if (darkMq.addEventListener) darkMq.addEventListener('change', syncTheme);

  const themeBtn = $('.theme-toggle');
  themeBtn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    const apply = () => { root.setAttribute('data-theme', next); syncTheme(); };
    try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable */ }

    if (!document.startViewTransition || reduce) { apply(); return; }
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(() => {});
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-toggle');
  const setMenu = (open) => {
    root.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'إغلاق القائمة' : 'فتح القائمة');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn.addEventListener('click', () => setMenu(!root.classList.contains('menu-open')));
  $$('[data-nav]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });
  const desktopMq = matchMedia('(min-width: 761px)');
  const onDesktop = (e) => { if (e.matches) setMenu(false); };
  if (desktopMq.addEventListener) desktopMq.addEventListener('change', onDesktop);

  /* ---------- Active nav + sliding indicator ---------- */
  const navLinks = $$('[data-nav]');
  const indicator = $('.nav-indicator');
  let activeLink = null;

  const moveIndicator = () => {
    if (!indicator) return;
    if (!activeLink) { indicator.style.opacity = '0'; return; }
    indicator.style.width = activeLink.offsetWidth + 'px';
    indicator.style.transform = `translateX(${activeLink.offsetLeft}px)`;
    indicator.style.opacity = '1';
  };
  const setActive = (id) => {
    activeLink = navLinks.find((a) => a.getAttribute('href') === '#' + id) || null;
    navLinks.forEach((a) => {
      const on = a === activeLink;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    moveIndicator();
  };

  if ('IntersectionObserver' in window) {
    const sectionIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id === 'top' ? null : en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['top', 'about', 'skills', 'contact'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) sectionIO.observe(el);
    });
  }
  addEventListener('resize', moveIndicator);

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          revealIO.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealEls.forEach((el) => revealIO.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- About: words light up while scrolling ---------- */
  const wordsBox = $('[data-words]');
  let words = [];
  if (wordsBox && !reduce) {
    $$('p', wordsBox).forEach((p) => {
      const parts = p.textContent.split(/(\s+)/);
      p.textContent = '';
      parts.forEach((part) => {
        if (/^\s+$/.test(part) || !part) { p.appendChild(document.createTextNode(part)); return; }
        const s = document.createElement('span');
        s.className = 'w' + (/[A-Za-z]/.test(part) ? ' hl' : '');
        s.textContent = part;
        p.appendChild(s);
      });
    });
    words = $$('.w', wordsBox);
  }
  const updateWords = () => {
    if (!words.length) return;
    const r = wordsBox.getBoundingClientRect();
    const vh = innerHeight;
    const p = clamp((vh * 0.85 - r.top) / (r.height * 0.9 + vh * 0.3));
    const n = Math.round(p * words.length);
    for (let i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
  };

  /* ---------- Scroll: progress, header state ---------- */
  const header = $('.site-header');
  let ticking = false;
  const onScroll = () => {
    const max = root.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    root.style.setProperty('--p', p.toFixed(4));
    header.classList.toggle('is-scrolled', scrollY > 12);
    updateWords();
    ticking = false;
  };
  addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Hero word rotator ---------- */
  const rotBox = $('.rotator');
  const rot = $$('.rotator > span');
  if (rot.length > 1 && !reduce) {
    let i = 0;
    const fit = () => { rotBox.style.width = rot[i].scrollWidth + 'px'; };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    addEventListener('resize', fit);
    setInterval(() => {
      const cur = rot[i];
      i = (i + 1) % rot.length;
      rot.forEach((s) => s.classList.remove('is-leaving'));
      cur.classList.remove('is-active');
      cur.classList.add('is-leaving');
      rot[i].classList.add('is-active');
      fit();
    }, 2600);
  }

  /* ---------- Year ---------- */
  const year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Copy email ---------- */
  const toast = $('.toast');
  $$('[data-copy]').forEach((btn) => {
    const label = $('.copy-label', btn);
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy');
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        ta.remove();
      }
      if (toast) toast.textContent = ok ? 'تم نسخ البريد الإلكتروني' : 'تعذّر النسخ، انسخ البريد يدويًا';
      if (ok) {
        btn.classList.add('is-done');
        if (label) label.textContent = 'تم النسخ';
      }
      clearTimeout(btn._t);
      btn._t = setTimeout(() => {
        btn.classList.remove('is-done');
        if (label) label.textContent = 'نسخ البريد';
        if (toast) toast.textContent = '';
      }, 2600);
    });
  });

  /* Everything below is pointer-driven motion: skip on touch or reduced motion */
  if (!finePointer || reduce) return;

  /* ---------- Background spotlight + hero parallax ---------- */
  const bg = $('.bg');
  const stage = $('.stage');
  const hero = $('.hero');
  addEventListener('pointermove', (e) => {
    bg.style.setProperty('--cx', e.clientX + 'px');
    bg.style.setProperty('--cy', e.clientY + 'px');
  }, { passive: true });

  if (stage && hero) {
    hero.addEventListener('pointermove', (e) => {
      const mx = (e.clientX / innerWidth - 0.5) * 2;
      const my = (e.clientY / innerHeight - 0.5) * 2;
      stage.style.setProperty('--mx', mx.toFixed(3));
      stage.style.setProperty('--my', my.toFixed(3));
    });
    hero.addEventListener('pointerleave', () => {
      stage.style.setProperty('--mx', '0');
      stage.style.setProperty('--my', '0');
    });
  }

  /* ---------- 3D tilt + spotlight on cards ---------- */
  $$('.tilt').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--x', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--y', (py * 100).toFixed(1) + '%');
      card.style.setProperty('--rx', ((0.5 - py) * 10).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((px - 0.5) * 12).toFixed(2) + 'deg');
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });

  /* ---------- Magnetic buttons ---------- */
  $$('.magnetic').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });

  /* ---------- Cursor ring ---------- */
  const cursor = $('.cursor');
  if (cursor) {
    root.classList.add('has-cursor');
    let tx = -100, ty = -100, x = -100, y = -100;
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      cursor.style.opacity = '';
    }, { passive: true });
    document.addEventListener('mouseleave', () => { cursor.style.opacity = '0'; });
    addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.addEventListener('pointerover', (e) => {
      cursor.classList.toggle('is-hover', !!e.target.closest('a, button, .tilt, .focus'));
    });
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
})();
