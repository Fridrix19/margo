(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- меню ---------- */
  const burger = $('.burger');
  const menu = $('.menu');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- шапка прячется при скролле вниз, плавающая кнопка ---------- */
  const header = $('.header');
  const fab = $('.fab');
  const hero = $('.hero');
  const contacts = $('#contacts');
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    if (!document.body.classList.contains('menu-open')) {
      header.classList.toggle('is-hidden', y > lastY && y > 200);
    }
    lastY = y;
    const pastHero = y > hero.offsetHeight * 0.8;
    const nearEnd = contacts.getBoundingClientRect().top < innerHeight;
    fab.classList.toggle('is-visible', pastHero && !nearEnd);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- активный пункт навигации ---------- */
  const navLinks = $$('.nav a');
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  navLinks.forEach(a => { const s = $(a.getAttribute('href')); if (s) spy.observe(s); });

  /* ---------- появление блоков ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  // лёгкая задержка для соседних элементов
  $$('.reveal').forEach(el => {
    const sibs = $$(':scope > .reveal', el.parentElement);
    const i = sibs.indexOf(el);
    if (i > 0) el.style.transitionDelay = Math.min(i, 6) * 70 + 'ms';
    io.observe(el);
  });

  /* ---------- счётчики ---------- */
  const countIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, to = +el.dataset.count, t0 = performance.now();
      const tick = t => {
        const p = Math.min((t - t0) / 1400, 1);
        el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      if (!reduce) requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- аккордеон с плавным раскрытием ---------- */
  $$('.acc').forEach(d => {
    const sum = $('summary', d);
    const body = $('.acc__body', d);
    sum.addEventListener('click', e => {
      if (reduce) return;
      e.preventDefault();
      if (d.open) {
        const h = body.offsetHeight;
        body.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 300, easing: 'ease' })
          .onfinish = () => { d.open = false; };
      } else {
        d.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    });
  });

  /* ---------- карусели ---------- */
  $$('.carousel').forEach(car => {
    const track = $('.carousel__track', car);
    const bar = $('.carousel__bar span', car);
    const nav = $(`.carousel-nav[data-for="${car.id}"]`);
    const prev = nav && $('.arrow--prev', nav);
    const next = nav && $('.arrow--next', nav);
    const items = [...track.children];

    const step = () => (items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 18));
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const ratio = track.clientWidth / track.scrollWidth;
      const p = max > 0 ? track.scrollLeft / max : 0;
      bar.style.width = Math.max(ratio * 100, 8) + '%';
      bar.style.transform = `translateX(${p * (1 / Math.max(ratio, .08) - 1) * 100}%)`;
      if (prev) { prev.disabled = track.scrollLeft < 4; next.disabled = track.scrollLeft > max - 4; }
    };
    track.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();

    if (prev) {
      prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));
      next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
    }

    // перетаскивание мышью на десктопе
    let down = false, moved = false, sx = 0, sl = 0;
    track.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = track.scrollLeft;
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (!moved && Math.abs(dx) > 6) { moved = true; track.classList.add('is-dragging'); }
      if (moved) track.scrollLeft = sl - dx;
    });
    addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (moved) {
        track.classList.remove('is-dragging');
        // докрутить до ближайшей карточки
        const s = step();
        track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: 'smooth' });
        // не открывать лайтбокс после перетаскивания
        track.addEventListener('click', ev => ev.stopPropagation(), { capture: true, once: true });
      }
    });

    car._goTo = i => track.scrollTo({ left: items[i].offsetLeft - items[0].offsetLeft, behavior: 'smooth' });
    car._items = items;
    car._track = track;
  });

  /* ---------- вкладки тарифов ---------- */
  const tariffs = $('#tariffs');
  const tabs = $$('.tab');
  tabs.forEach(t => t.addEventListener('click', () => tariffs._goTo(+t.dataset.go)));
  tariffs._track.addEventListener('scroll', () => {
    const items = tariffs._items;
    const x = tariffs._track.scrollLeft + 40;
    let cur = 0;
    items.forEach((it, i) => { if (it.offsetLeft - items[0].offsetLeft <= x) cur = i; });
    const group = cur >= 4 ? 2 : cur >= 3 ? 1 : 0;
    tabs.forEach((t, i) => t.classList.toggle('is-active', i === group));
  }, { passive: true });

  /* ---------- лайтбокс ---------- */
  const lb = $('.lb');
  const lbImg = $('.lb__img', lb);
  const lbCount = $('.lb__count', lb);
  let list = [], idx = 0;
  const show = (i, dir = 0) => {
    idx = (i + list.length) % list.length;
    if (dir && !reduce) {
      lbImg.animate([{ opacity: 0, transform: `translateX(${dir * 40}px)` }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out' });
    }
    lbImg.src = list[idx].dataset.src;
    lbImg.alt = $('img', list[idx]).alt;
    lbCount.textContent = `${idx + 1} / ${list.length}`;
  };
  const openLb = (group, i) => {
    list = group; show(i);
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };
  const closeLb = () => {
    lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  $$('[data-gallery]').forEach(g => {
    const btns = $$('[data-src]', g);
    btns.forEach((b, i) => b.addEventListener('click', () => openLb(btns, i)));
  });
  $('.lb__close', lb).addEventListener('click', closeLb);
  $('.lb__nav--prev', lb).addEventListener('click', () => show(idx - 1, -1));
  $('.lb__nav--next', lb).addEventListener('click', () => show(idx + 1, 1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', e => {
    if (!lb.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') show(idx - 1, -1);
    if (e.key === 'ArrowRight') show(idx + 1, 1);
  });
  let tx = 0;
  lb.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) dx < 0 ? show(idx + 1, 1) : show(idx - 1, -1);
  });

  /* ---------- лёгкий параллакс фото на первом экране ---------- */
  const heroPhoto = $('.hero__photo img');
  if (!reduce && matchMedia('(pointer: fine)').matches) {
    hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      heroPhoto.style.transform = `translate(${x * -14}px, ${y * -8}px)`;
    });
    hero.addEventListener('pointerleave', () => { heroPhoto.style.transform = ''; });
    heroPhoto.style.transition = 'transform .6s cubic-bezier(.2,.7,.2,1)';
  }
})();
