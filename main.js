/* ==========================================================
   MESC — interactions
   GSAP + ScrollTrigger for motion, Lenis for smooth scroll.
   ========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isMobile = () => innerWidth <= 900;

  gsap.registerPlugin(ScrollTrigger);
  // the intro is choreographed from the top of the page, so don't let the browser restore an old scroll position
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);
  document.body.classList.add("is-loading");
  if (fine) document.documentElement.classList.add("has-cursor");

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollTo = (target) => {
    const el = typeof target === "string" ? $(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };
  let scrollVel = 0;

  /* ---------- Split helpers ---------- */
  function splitWords(el) {
    const text = el.textContent.trim().replace(/\s+/g, " ");
    el.setAttribute("aria-label", text);
    el.innerHTML = text.split(" ").map((w) => `<span class="sw" aria-hidden="true"><span>${esc(w)}</span></span>`).join(" ");
    return $$(".sw > span", el);
  }
  function splitChars(el) {
    // keeps <em> wrappers, groups chars per word so lines only break between words
    const out = [];
    const walk = (node, parent) => {
      node.childNodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { parent.appendChild(document.createTextNode(" ")); return; }
            const word = document.createElement("span");
            word.style.cssText = "display:inline-block;white-space:nowrap";
            [...part].forEach((ch) => {
              const c = document.createElement("span");
              c.className = "c"; c.textContent = ch; word.appendChild(c); out.push(c);
            });
            parent.appendChild(word);
          });
        } else {
          const clone = n.cloneNode(false); parent.appendChild(clone); walk(n, clone);
        }
      });
    };
    const frag = document.createElement("span");
    walk(el, frag);
    el.innerHTML = ""; el.append(...frag.childNodes);
    return out;
  }

  /* ---------- Cursor ---------- */
  const cursor = $(".cursor");
  let mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  if (fine) {
    const dot = $(".cursor__dot"), ring = $(".cursor__ring"), label = $(".cursor__label");
    const dx = gsap.quickSetter(dot, "x", "px"), dy = gsap.quickSetter(dot, "y", "px");
    const rx = gsap.quickTo(ring, "x", { duration: 0.55, ease: "power3" });
    const ry = gsap.quickTo(ring, "y", { duration: 0.55, ease: "power3" });
    addEventListener("mousemove", (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
    });
    document.addEventListener("mouseover", (e) => {
      const lab = e.target.closest("[data-cursor]");
      const hov = e.target.closest("a, button, .plist li, .acc, .pcard, .countries li, .sectors__list li");
      cursor.classList.toggle("is-label", !!lab);
      cursor.classList.toggle("is-hover", !lab && !!hov);
      if (lab) label.textContent = lab.dataset.cursor;
    });
    document.addEventListener("mouseleave", () => gsap.to(cursor, { opacity: 0, duration: 0.3 }));
    document.addEventListener("mouseenter", () => gsap.to(cursor, { opacity: 1, duration: 0.3 }));
  } else {
    addEventListener("pointermove", (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  }

  /* ---------- Magnetic ---------- */
  if (fine) {
    $$(".magnetic").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, .45)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, .45)" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ---------- Nav, menu, anchors ---------- */
  const nav = $(".nav"), menu = $(".menu"), menuBtn = $(".nav__menu");
  let menuOpen = false;
  const menuLinks = $$(".menu__list a");
  function toggleMenu(open = !menuOpen) {
    menuOpen = open;
    document.documentElement.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open);
    menu.setAttribute("aria-hidden", !open);
    $(".nav__menu-label", menuBtn).textContent = open ? "Close" : "Menu";
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    const cx = innerWidth - 60, R = Math.hypot(innerWidth, innerHeight) * 1.05;
    gsap.killTweensOf(menu);
    if (open) {
      lenis && lenis.stop();
      gsap.set(menu, { visibility: "visible" });
      gsap.fromTo(menu, { clipPath: `circle(0px at ${cx}px 40px)` }, { clipPath: `circle(${R}px at ${cx}px 40px)`, duration: 1.1, ease: "expo.inOut" });
      gsap.fromTo(menuLinks, { yPercent: 120, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, stagger: 0.045, ease: "expo.out", delay: 0.35 });
      gsap.fromTo(".menu__aside p", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.08, delay: 0.6 });
    } else {
      lenis && lenis.start();
      gsap.to(menu, { clipPath: `circle(0px at ${cx}px 40px)`, duration: 0.9, ease: "expo.inOut", onComplete: () => gsap.set(menu, { visibility: "hidden" }) });
    }
  }
  menuBtn.addEventListener("click", () => toggleMenu());
  addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) toggleMenu(false); });
  $$("[data-scroll]").forEach((a) =>
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      e.preventDefault();
      if (menuOpen) { toggleMenu(false); setTimeout(() => scrollTo(href), 450); }
      else scrollTo(href);
    })
  );

  const progress = gsap.quickSetter(".nav__progress i", "scaleX");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate(self) {
      progress(self.progress);
      scrollVel = self.getVelocity();
      const y = self.scroll();
      nav.classList.toggle("is-scrolled", y > 40);
    },
  });

  /* ---------- Section themes + nav status ---------- */
  let currentSection = null;
  function setSection(sec) {
    if (sec === currentSection) return;
    currentSection = sec;
    document.documentElement.dataset.theme = sec.dataset.theme;
  }

  /* ---------- Loader + hero intro ---------- */
  const heroChars = $$(".hero__line").flatMap(splitChars);
  const heroInset = () => (isMobile() ? "36% 18% 36% 18%" : "29% 37% 29% 37%");

  function heroIntro() {
    const tl = gsap.timeline();
    tl.fromTo(".hero__media", { clipPath: "inset(50% 50% 50% 50% round 18px)" }, { clipPath: `inset(${heroInset()} round 18px)`, duration: 1.6, ease: "expo.inOut" })
      .fromTo(".hero__media img", { scale: 1.8 }, { scale: 1.25, duration: 2, ease: "expo.out" }, 0.2)
      .from(heroChars, { yPercent: 115, opacity: 0, rotate: 6, duration: 1.2, stagger: { each: 0.016, from: "center" }, ease: "expo.out" }, 0.35)
      .from(".hero__meta", { opacity: 0, y: 20, duration: 1 }, 0.9)
      // explicit end + clearProps so the CSS hide-on-scroll class keeps control of the header afterwards
      .fromTo(".nav", { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", clearProps: "transform,translate,rotate,scale,opacity" }, 0.1);
    return tl;
  }
  function finishLoading() {
    document.body.classList.remove("is-loading");
    lenis && lenis.start();
  }
  function runLoader() {
    const count = $(".loader__count"), pct = $(".loader__pct");
    if (reduce) {
      gsap.set(".loader", { display: "none" });
      finishLoading();
      return;
    }
    const yr = { v: 1997 };
    const tl = gsap.timeline({ delay: 0.2 });
    tl.from(".loader__count", { yPercent: 100, duration: 0.9, ease: "expo.out" })
      .to(yr, {
        v: 2026, duration: 2.1, ease: "power3.inOut",
        onUpdate() {
          count.textContent = Math.round(yr.v);
          pct.textContent = String(Math.round(((yr.v - 1997) / 29) * 120)).padStart(3, "0") + " PSI";
        },
      }, 0.2)
      .to(".loader__gauge i", { scaleX: 1, duration: 2.1, ease: "power3.inOut" }, 0.2)
      .to(".loader__count", { yPercent: -100, duration: 0.7, ease: "expo.in" }, "+=0.15")
      .to(".loader__meta, .loader__gauge", { opacity: 0, duration: 0.4 }, "<")
      .to(".loader__panel--top", { yPercent: -100, duration: 1.2, ease: "expo.inOut" }, "-=0.1")
      .to(".loader__panel--bottom", { yPercent: 100, duration: 1.2, ease: "expo.inOut" }, "<")
      .add(heroIntro(), "-=0.85")
      .add(finishLoading, "-=1.2")
      .set(".loader", { display: "none" });
  }

  /* ---------- Hero pressure (variable font reacts to cursor) ---------- */
  if (!reduce && fine) {
    const state = heroChars.map(() => ({ w: 100, g: 700 }));
    let heroVisible = true, inHero = false;
    $(".hero").addEventListener("mouseenter", () => (inHero = true));
    $(".hero").addEventListener("mouseleave", () => (inHero = false));
    ScrollTrigger.create({ trigger: ".hero", start: "top top", end: "bottom top", onToggle: (s) => (heroVisible = s.isActive) });
    gsap.ticker.add(() => {
      if (!heroVisible) return;
      const rects = heroChars.map((c) => c.getBoundingClientRect());
      heroChars.forEach((c, i) => {
        const r = rects[i];
        const d = Math.hypot(mouse.x - (r.left + r.width / 2), mouse.y - (r.top + r.height / 2));
        const f = inHero ? Math.pow(clamp(1 - d / 340, 0, 1), 1.6) : 0;
        const s = state[i];
        const nw = lerp(s.w, 92 + f * 33, 0.14), ng = lerp(s.g, 640 + f * 260, 0.14);
        if (Math.abs(nw - s.w) > 0.05 || Math.abs(ng - s.g) > 0.5) {
          s.w = nw; s.g = ng;
          c.style.fontVariationSettings = `"wdth" ${nw.toFixed(1)}, "wght" ${ng.toFixed(0)}`;
        }
      });
    });
  }

  /* ---------- Build everything after first paint ---------- */
  const mm = gsap.matchMedia();

  // Hero scroll: window expands to full bleed, headline parts like a valve opening
  mm.add({ d: "(min-width: 901px)", m: "(max-width: 900px)" }, () => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ".hero", start: "top top", end: "+=150%", pin: true, scrub: 1, invalidateOnRefresh: true },
    });
    tl.fromTo(".hero__media", { clipPath: () => `inset(${heroInset()} round 18px)` }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power2.inOut", immediateRender: false }, 0)
      .to(".hero__media img", { scale: 1, ease: "none" }, 0)
      .to(".hero__line--top", { y: () => -innerHeight * 0.4, opacity: 0, ease: "power2.in" }, 0)
      .to(".hero__line--bot", { y: () => innerHeight * 0.4, opacity: 0, ease: "power2.in" }, 0)
      .to(".hero__meta", { opacity: 0, ease: "none", duration: 0.3 }, 0)
      .to(".hero__shade", { opacity: 1, ease: "none", duration: 0.5 }, 0.4)
      .fromTo(".hero__overlay", { opacity: 0, y: 80 }, { opacity: 1, y: 0, ease: "power3.out", duration: 0.5 }, 0.6);
  });

  // Manifesto: words fill with ink as you read, image pills open up
  {
    const words = $$(".manifesto__text .w"), pills = $$(".manifesto .pill");
    const tl = gsap.timeline({ scrollTrigger: { trigger: ".manifesto", start: "top 70%", end: "bottom 75%", scrub: 1 } });
    tl.to(words, { opacity: 1, stagger: 0.12, ease: "none", duration: 0.3 })
      .from(pills, { width: 0, stagger: 0.5, ease: "power2.out", duration: 0.8 }, 0.2)
      .from(".manifesto__sub", { opacity: 0, y: 30, duration: 0.5 }, ">-0.2");
  }

  // Word-by-word headline reveals
  $$("[data-split]").forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, {
      yPercent: 115, rotate: 4, duration: 1.2, stagger: 0.05, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 86%" },
    });
  });
  $$("[data-lines]").forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, { yPercent: 110, duration: 1, stagger: 0.012, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
  $$("[data-fade]").forEach((el) =>
    gsap.from(el, { y: 40, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%" } })
  );

  // Image curtain reveals + inner parallax
  $$(".reveal-img").forEach((wrap) => {
    const img = $("img", wrap);
    gsap.timeline({ scrollTrigger: { trigger: wrap, start: "top 82%" } })
      .to(wrap, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut" })
      .to(img, { scale: 1.12, duration: 1.8, ease: "expo.out" }, 0.2);
    gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: true } });
  });

  // Odometer counters
  $$("[data-odo]").forEach((el) => {
    const str = el.dataset.odo, suffix = el.dataset.suffix || "";
    el.setAttribute("aria-label", str + suffix);
    const col = `<span class="odo"><span>${Array.from({ length: 20 }, (_, i) => `<b>${i % 10}</b>`).join("")}</span></span>`;
    el.innerHTML = [...str].map((ch) => (/\d/.test(ch) ? col : `<span>${ch}</span>`)).join("") + (suffix ? `<span>${suffix}</span>` : "");
    const cols = $$(".odo > span", el), digits = [...str].filter((c) => /\d/.test(c));
    ScrollTrigger.create({
      trigger: el, start: "top 88%", once: true,
      onEnter: () => cols.forEach((c, i) =>
        gsap.fromTo(c, { yPercent: 0 }, { yPercent: -((10 + +digits[i]) / 20) * 100, duration: 2.4 + i * 0.3, ease: "expo.out", delay: i * 0.06 })
      ),
    });
  });

  // Journey: horizontal pinned timeline with a "pipe" that fills with pressure
  {
    const track = $(".journey__track"), pipe = $(".journey__pipe i"), yr = $(".journey__yr");
    // offsetWidth, not scrollWidth: the photo parallax transforms would inflate scrollWidth and overshoot the end
    const dist = () => track.offsetWidth - innerWidth;
    const setPipe = gsap.quickSetter(pipe, "scaleX");
    const jt = gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: ".journey", start: "top top", end: () => "+=" + dist(), pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate(self) { setPipe(self.progress); yr.style.left = self.progress * 100 + "%"; yr.style.transform = `translateX(${-self.progress * 100}%)`; },
      },
    });
    $$(".ms").forEach((ms) => {
      ScrollTrigger.create({
        trigger: ms, containerAnimation: jt, start: "left 62%", end: "right 30%", toggleClass: "is-active",
        onToggle: (s) => { if (s.isActive) yr.textContent = $(".ms__year", ms).firstChild.textContent.trim(); },
      });
    });
    $$(".ms__img img").forEach((img) =>
      gsap.fromTo(img, { xPercent: -8 }, { xPercent: 8, ease: "none", scrollTrigger: { trigger: img.parentNode, containerAnimation: jt, start: "left right", end: "right left", scrub: true } })
    );
  }

  // Stacking cards
  {
    const cards = $$(".card");
    cards.forEach((card, i) => {
      gsap.fromTo($(".card__img img", card), { yPercent: -12 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: card, start: "top bottom", end: "top 15%", scrub: true } });
      if (i === cards.length - 1) return;
      gsap.fromTo(card, { scale: 1, filter: "brightness(1)" }, {
        scale: 0.9, filter: "brightness(0.45)", ease: "none",
        scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top 15%", scrub: true },
      });
    });
  }

  // Scope: the pipeline draws itself through the nine steps
  {
    const grid = $(".scope__grid"), flow = $(".scope__flow"), trackPath = $(".scope__track"), drop = $(".scope__drop");
    const nodes = $$(".node", grid).sort((a, b) => a.dataset.step - b.dataset.step);
    const countEl = $(".scope__count b"), titleEl = $(".scope__title");
    let total = 1, lens = [], current = -1, lastP = 0;
    function build() {
      const g = grid.getBoundingClientRect();
      const pts = nodes.map((n) => { const r = $("i", n).getBoundingClientRect(); return [r.left + r.width / 2 - g.left, r.top + r.height / 2 - g.top]; });
      const d = "M" + pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" L");
      flow.setAttribute("d", d); trackPath.setAttribute("d", d);
      lens = [0];
      for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      total = flow.getTotalLength() || 1;
      flow.style.strokeDasharray = total;
      set(lastP);
    }
    function set(p) {
      lastP = p;
      if (!lens.length) return;
      const L = p * total;
      flow.style.strokeDashoffset = total - L;
      const pt = flow.getPointAtLength(Math.max(L, 0.01));
      drop.setAttribute("cx", pt.x); drop.setAttribute("cy", pt.y);
      let on = 0;
      nodes.forEach((n, i) => { const a = L >= lens[i] - 2; n.classList.toggle("is-on", a); if (a) on = i; });
      if (on !== current) {
        current = on;
        countEl.textContent = String(on + 1).padStart(2, "0");
        gsap.fromTo(titleEl, { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
        titleEl.textContent = $("span", nodes[on]).textContent;
      }
    }
    const proxy = { p: 0 };
    build();
    mm.add({ d: "(min-width: 901px)", m: "(max-width: 900px)" }, (ctx) => {
      const { d } = ctx.conditions;
      gsap.fromTo(proxy, { p: 0 }, {
        p: 1, ease: "none", onUpdate: () => set(proxy.p),
        scrollTrigger: d
          ? { trigger: ".scope", start: "top top", end: "+=220%", pin: true, scrub: 0.8, onRefresh: build }
          : { trigger: ".scope__grid", start: "top 70%", end: "bottom 60%", scrub: 0.8, onRefresh: build },
      });
      gsap.fromTo(".scope__bg img", { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: ".scope", start: "top bottom", end: "bottom top", scrub: true } });
    });
    addEventListener("load", build);
  }

  // Sectors: image follows the cursor through the list
  if (fine) {
    const list = $(".sectors__list"), box = $(".hoverimg"), inner = $(".hoverimg__inner");
    const items = $$("li", list);
    items.forEach((li) => { const img = new Image(); img.src = li.dataset.img; img.alt = ""; inner.appendChild(img); li._img = img; });
    let hx = mouse.x, hy = mouse.y, active = false;
    const show = (li) => {
      active = true;
      items.forEach((o) => o._img.classList.toggle("is-on", o === li));
      gsap.to(inner, { scale: 1, duration: 0.6, ease: "expo.out", overwrite: true });
    };
    const hide = () => {
      if (!active) return;
      active = false;
      gsap.to(inner, { scale: 0, duration: 0.5, ease: "expo.inOut", overwrite: true });
    };
    // mouseleave never fires when the page scrolls out from under a still cursor,
    // so each frame re-check what is actually under the pointer
    let lastLi = null;
    const tick = () => {
      if (active) {
        const under = document.elementFromPoint(mouse.x, mouse.y);
        const li = under && under.closest(".sectors__list li");
        if (!li) { hide(); lastLi = null; }
        else if (li !== lastLi) { show(li); lastLi = li; }
      }
      if (!active && gsap.getProperty(inner, "scale") === 0) return;
      const px = hx; hx = lerp(hx, mouse.x, 0.14); hy = lerp(hy, mouse.y, 0.14);
      const rot = clamp((hx - px) * 0.6, -14, 14);
      box.style.transform = `translate3d(${hx - 160}px, ${hy - 200}px, 0) rotate(${rot}deg)`;
    };
    gsap.ticker.add(tick);
    items.forEach((li) => li.addEventListener("mouseenter", () => { lastLi = li; show(li); }));
    list.addEventListener("mouseleave", () => { lastLi = null; hide(); });
    ScrollTrigger.create({ trigger: ".sectors", start: "top bottom", end: "bottom top", onLeave: hide, onLeaveBack: hide });
  }
  gsap.from(".sectors__list li", { y: 60, opacity: 0, duration: 1.1, stagger: 0.07, ease: "expo.out", scrollTrigger: { trigger: ".sectors__list", start: "top 85%" } });

  // Featured projects: window expands to full bleed, title rises
  mm.add({ d: "(min-width: 901px)", m: "(max-width: 900px)" }, (ctx) => {
    const ins = ctx.conditions.d ? "14% 22% 14% 22%" : "18% 8% 30% 8%";
    $$(".feature").forEach((f) => {
      const title = $(".feature__title", f);
      const words = title._words || (title._words = splitWords(title));
      const tl = gsap.timeline({ scrollTrigger: { trigger: f, start: "top 60%", end: "bottom bottom", scrub: 1 } });
      tl.fromTo($(".feature__media", f), { clipPath: `inset(${ins} round 20px)` }, { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "power2.inOut", duration: 1 })
        .fromTo($(".feature__media img", f), { scale: 1.35 }, { scale: 1, ease: "none", duration: 1.6 }, 0)
        .fromTo(words, { yPercent: 115 }, { yPercent: 0, stagger: 0.08, duration: 0.5, ease: "power3.out" }, 0.55)
        .fromTo([$(".feature__desc", f), $(".feature__info", f)], { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.4 }, 0.8)
        .to({}, { duration: 0.5 });
    });
  });

  // Draggable rail with inertia + velocity skew
  {
    const vp = $(".rail__viewport"), tr = $(".rail__track"), tiles = $$(".tile", tr);
    let x = 0, target = 0, down = false, sx = 0, st = 0, lastX = 0, vel = 0, inView = false;
    const min = () => { const pad = parseFloat(getComputedStyle(vp).paddingLeft) * 2; return Math.min(0, -(tr.scrollWidth - (vp.clientWidth - pad))); };
    vp.addEventListener("pointerdown", (e) => { down = true; sx = e.clientX; st = target; lastX = e.clientX; vel = 0; vp.setPointerCapture(e.pointerId); });
    vp.addEventListener("pointermove", (e) => { if (!down) return; target = st + (e.clientX - sx) * 1.15; vel = e.clientX - lastX; lastX = e.clientX; });
    const up = () => { if (!down) return; down = false; target += vel * 14; };
    vp.addEventListener("pointerup", up); vp.addEventListener("pointercancel", up);
    vp.addEventListener("wheel", (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); target -= e.deltaX; } }, { passive: false });
    ScrollTrigger.create({ trigger: vp, start: "top bottom", end: "bottom top", onToggle: (s) => (inView = s.isActive) });
    gsap.ticker.add(() => {
      if (!inView) return;
      if (!down) target = clamp(target, min(), 0);
      x = lerp(x, target, 0.09);
      const sk = clamp((target - x) * 0.012, -8, 8);
      tr.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      tiles.forEach((t) => (t.style.transform = `skewX(${sk.toFixed(2)}deg)`));
    });
    gsap.from(tiles, { x: 200, opacity: 0, duration: 1.4, stagger: 0.07, ease: "expo.out", scrollTrigger: { trigger: vp, start: "top 85%" } });
  }

  // Products explorer
  {
    const P = [
      { c: 0, n: "Horizontal Split Case", b: "Patterson · Fire pumps", i: "split-case", d: "Single & multistage fire pumps, UL Listed / FM Approved for life-safety and property protection — in-line maintenance without disturbing piping; electric or diesel driven.", s: "150–8,000 GPM · NFPA 20 · UL · FM", st: ["Up to", "8,000", "GPM"] },
      { c: 0, n: "Pre-Pac Systems", b: "Patterson · Fire pumps", i: "pre-pac", d: "A turnkey package created to provide quality fire control in less space and for less cost — reducing field labor, engineering, and installation costs.", s: "Optional UL 142 fuel tanks — single or double wall" },
      { c: 0, n: "Vertical In-Line", b: "Patterson · Fire pumps", i: "vertical-inline", d: "Close-coupled configuration built to meet the needs of the fire protection industry. UL-listed and FM-approved for fire applications.", s: "UL · FM" },
      { c: 0, n: "End Suction", b: "Patterson · Fire pumps", i: "end-suction", d: "Single-stage frame-mounted configuration designed for the specific needs of the fire protection industry.", s: "UL · FM" },
      { c: 0, n: "Water-Based Fire Fighting", b: "Tyco · Grinnell · Mueller", i: "gate-valve", d: "Conventional and pre-action systems, wet and dry alarm valves, deluge systems, and flow-monitoring devices.", s: "UL · FM · VdS · LPCB" },
      { c: 0, n: "Deluge Valve System", b: "Tyco", i: "deluge", d: "Rapid water discharge through open sprinklers or nozzles — for industrial facilities and high-hazard areas.", s: "FM · VdS · UL" },
      { c: 0, n: "Fire Hydrant Dry Barrel", b: "Mueller", i: "hydrant", d: "A robust outlet providing reliable access to pressurized water during firefighting operations — built for critical fire protection networks.", s: "FM Approved" },
      { c: 0, n: "Grooved Piping", b: "Grinnell · Sole agent in Egypt", i: "coupling", d: "Couplings, fittings, mechanical tees, valves, gaskets and pipe preparation equipment — in stock for fire, HVAC and mechanical applications.", s: "UL · ULC · FM · VdS" },
      { c: 0, n: "Gas Suppression", b: "Kidde Fire Systems", i: "gas-cylinders", d: "CO₂, inert gas and clean agents Fluoro-K™, FM-200 and NOVEC™ — plus wet-chemical kitchen systems and conventional & addressable detection.", s: "FM · UL · NFPA", st: ["Under", "10", "sec"] },
      { c: 0, n: "Foam Systems", b: "Chemguard", i: "bladder-tank", d: "Foam hardware including CHEMGUARD NFF 3x3 UL201 — a non-fluorinated, alcohol-resistant concentrate formulated without intentionally added PFAS.", s: "UL 162-equivalent · Class B hazards" },
      { c: 0, n: "Fire Alarm & Detection", b: "Edwards", i: "alarm-panels", d: "Addressable fire alarm with public address and voice evacuation on the modular EST4 platform — panels, detectors and notification working in unison at any scale.", s: "EST4 · EDGE · SIGA · UL · FM" },
      { c: 0, n: "Oxygen Reduction", b: "Wagner · First in Egypt", i: "oxyreduct", d: "Wagner's OxyReduct® active fire-prevention technology, brought to Egypt for the first time by MESC.", s: "VdS · Clean agent — no residue" },
      { c: 0, n: "Micro Suppression", b: "Hygood · Tyco · Sapphire", i: "sapphire", d: "A new concept in fire protection: compact clean-agent suppression for electric control panels and data-rack enclosures.", s: "FM · UL" },
      { c: 1, n: "HVAC Pumps", b: "Patterson · MENA region", i: "vertical-inline", d: "Horizontal split-case, end-suction and vertical in-line pumps for HVAC applications — represented by MESC across the MENA region.", s: "Riyadh Metro · Holy Haram expansion · Aswan Heart Center" },
      { c: 1, n: "Booster Sets & Wastewater", b: "Grundfos", i: "grundfos", d: "Grundfos's range for booster sets, sewage, drainage, submersible and deep-well duty — single- to multistage, cast iron to titanium.", s: "Heads up to 400 m", st: ["Up to", "6,900", "m³/h"] },
      { c: 1, n: "SP Submersible", b: "Grundfos", i: "sp-submersible", d: "High-efficiency stainless-steel submersible pumps for groundwater extraction, mining and agriculture.", s: 'Depths to 600 m · 4"–10"' },
      { c: 1, n: "CR / CRI / CRN Multistage", b: "Grundfos", i: "cr-multistage", d: "High-efficiency, space-saving multistage pumps for washing systems, water treatment and boiler feed.", s: "Flow to 320 m³/h · liquids to 180°C" },
      { c: 1, n: "Hydro MPC Booster", b: "Grundfos", i: "hydro-mpc", d: "A turnkey booster system with 2–6 pumps delivering constant pressure through energy-optimized control.", s: "Flow to 1,460 m³/h · head to 155 m" },
      { c: 1, n: "NB / NBG Standard", b: "Grundfos", i: "nb-nbg", d: "Compact single-stage pumps with standard dimensions and motors for heating, cooling and firefighting applications.", s: "Flow to 6,900 m³/h · head to 200 m" },
      { c: 1, n: "S Pumps & SEG Grinders", b: "Grundfos", i: "s-pumps", d: "Heavy-duty wastewater pumps with SmartTrim technology, and service-friendly grinder pumps for pipes as small as 40 mm.", s: "Flow to 2,500 l/s · solids to 145 mm" },
    ];
    const lists = $$(".plist ul"), stage = $(".pstage__img"), ring = $(".pstage__ring");
    const badge = $(".pstage__badge"), bSm = $$("small", badge), bB = $("b", badge);
    const tBrand = $(".pstage__brand"), tTitle = $(".pstage__title"), tDesc = $(".pstage__desc"), tSpec = $(".pstage__spec");
    const counters = [0, 0];
    const lis = P.map((p, idx) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="n">${String(++counters[p.c]).padStart(2, "0")}</span><b>${esc(p.n)}</b><span class="br">${esc(p.b.split(" · ")[0])}</span>`;
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      lists[p.c].appendChild(li);
      const go = () => show(idx);
      if (fine) li.addEventListener("mouseenter", go);
      li.addEventListener("click", go);
      li.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
      // warm the cache
      const pre = new Image(); pre.src = `assets/products/${p.i}.jpg`;
      return li;
    });
    let cur = -1;
    function show(i, instant) {
      if (i === cur) return;
      cur = i;
      const p = P[i];
      lis.forEach((l, k) => l.classList.toggle("is-active", k === i));
      const layer = document.createElement("div");
      layer.className = "pstage__layer";
      const img = new Image(); img.src = `assets/products/${p.i}.jpg`; img.alt = p.n;
      const fit = () => { if (img.naturalWidth && Math.abs(img.naturalWidth - img.naturalHeight) < 4) Object.assign(img.style, { width: "100%", height: "100%", objectFit: "cover" }); };
      img.complete ? fit() : img.addEventListener("load", fit);
      layer.appendChild(img); stage.appendChild(layer);
      if (instant) { while (layer.previousSibling) layer.previousSibling.remove(); }
      else {
        gsap.fromTo(layer, { clipPath: "circle(0% at 50% 100%)" }, { clipPath: "circle(75% at 50% 50%)", duration: 0.95, ease: "expo.inOut", onComplete: () => { while (layer.previousSibling) layer.previousSibling.remove(); } });
        gsap.fromTo(img, { scale: 1.6, rotate: -10 }, { scale: 1.12, rotate: 0, duration: 1.3, ease: "expo.out" });
        gsap.to(ring, { rotate: "+=120", duration: 1.3, ease: "expo.inOut", transformOrigin: "50% 50%" });
        gsap.fromTo([tBrand, tTitle, tDesc, tSpec], { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: "expo.out" });
      }
      tBrand.textContent = p.b; tTitle.textContent = p.n; tDesc.textContent = p.d; tSpec.textContent = p.s;
      if (p.st) { bSm[0].textContent = p.st[0]; bB.textContent = p.st[1]; bSm[1].textContent = p.st[2]; badge.classList.remove("is-off"); }
      else badge.classList.add("is-off");
    }
    show(0, true);
    gsap.from(".plist li", { x: -40, opacity: 0, duration: 1, stagger: 0.03, ease: "expo.out", scrollTrigger: { trigger: ".products__lists", start: "top 85%" } });
    gsap.from(".pstage__orb", { scale: 0.6, rotate: -30, opacity: 0, duration: 1.6, ease: "expo.out", scrollTrigger: { trigger: ".products__body", start: "top 75%" } });
  }

  // Partners: marquee driven by scroll velocity
  {
    const rows = $$(".marquee__inner");
    rows.forEach((r) => (r.innerHTML = r.innerHTML.repeat(3)));
    const pos = rows.map(() => 0), dir = [-1, 1];
    let vel = 0, inView = false;
    ScrollTrigger.create({ trigger: ".marquee", start: "top bottom", end: "bottom top", onToggle: (s) => (inView = s.isActive) });
    gsap.ticker.add((t, dt) => {
      if (!inView || reduce) return;
      vel = lerp(vel, scrollVel / 60, 0.08);
      rows.forEach((r, i) => {
        const w = r.scrollWidth / 3;
        pos[i] += (dir[i] * (0.9 + Math.abs(vel) * 0.9) * dt) / 16 * (vel < -0.2 ? -1 : 1);
        if (pos[i] <= -w) pos[i] += w;
        if (pos[i] > 0) pos[i] -= w;
        r.style.transform = `translate3d(${pos[i].toFixed(1)}px,0,0) skewX(${clamp(-vel * 0.6, -14, 14).toFixed(2)}deg)`;
      });
    });
    $$(".pcard").forEach((c) => c.addEventListener("mouseenter", (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty("--mx", ((e.clientX - r.left) / r.width) * 100 + "%");
      c.style.setProperty("--my", ((e.clientY - r.top) / r.height) * 100 + "%");
    }));
    gsap.from(".pcard", { opacity: 0, y: 40, duration: 1, stagger: { each: 0.05, grid: "auto", from: "start" }, ease: "expo.out", scrollTrigger: { trigger: ".pgrid", start: "top 85%" } });
  }

  // Services accordion
  {
    const accs = $$(".acc");
    // Mobile: rows stack, so each row is sized to its own content (title stays put, copy fades in below)
    // and the page scroll is compensated so the tapped row doesn't slide out from under the finger
    const ACC_EASE = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // matches the CSS height curve
    const accPad = (a) => parseFloat(getComputedStyle($(".acc__in", a)).paddingBottom);
    const closedH = (a) => { const h3 = $("h3", a); return h3.offsetTop + h3.offsetHeight + accPad(a); };
    const openH = (a) => { const p = $("p", a); return Math.max(p.offsetTop + p.offsetHeight + accPad(a), 340); };
    const sizeAccs = () => accs.forEach((a) => (a.style.height = isMobile() ? (a.classList.contains("is-open") ? openH(a) : closedH(a)) + "px" : ""));
    let accRefresh;
    const open = (a) => {
      if (a.classList.contains("is-open")) return;
      const prev = accs.find((o) => o.classList.contains("is-open"));
      const shift = isMobile() && prev && accs.indexOf(prev) < accs.indexOf(a) ? prev.offsetHeight - closedH(prev) : 0;
      const top = a.getBoundingClientRect().top; // measured before anything moves
      accs.forEach((o) => o.classList.toggle("is-open", o === a));
      if (!isMobile()) return;
      sizeAccs();
      const overflow = Math.max(0, top + openH(a) - (innerHeight - 16));
      const delta = -shift + Math.min(overflow, Math.max(0, top - 90));
      if (Math.abs(delta) > 1) {
        if (lenis) lenis.scrollTo(scrollY + delta, { duration: 0.7, easing: ACC_EASE });
        else window.scrollTo({ top: scrollY + delta, behavior: "smooth" });
      }
      clearTimeout(accRefresh);
      accRefresh = setTimeout(() => ScrollTrigger.refresh(), 760);
    };
    accs.forEach((a) => { if (fine) a.addEventListener("mouseenter", () => open(a)); a.addEventListener("click", () => open(a)); });
    sizeAccs();
    addEventListener("resize", sizeAccs);
    document.fonts && document.fonts.ready.then(sizeAccs);
    gsap.from(accs, { y: 80, opacity: 0, duration: 1.2, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".accordion", start: "top 85%" } });
    gsap.from(".badge", { scale: 0, rotate: -120, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".filling", start: "top 70%" } });
    gsap.from(".agents > div", { y: 30, opacity: 0, duration: 1, stagger: 0.07, ease: "expo.out", scrollTrigger: { trigger: ".agents", start: "top 90%" } });
  }

  // World map: dots ripple out from Egypt, arcs reach the group's offices
  {
    const canvas = $(".map canvas"), ctx = canvas.getContext("2d"), li = $$(".countries li");
    const D = window.MESC_DOTS || [], RATIO = window.MESC_MAP_RATIO || 2.7;
    const PINS = [
      { x: 0.588, y: 0.36, n: "Egypt" },
      { x: 0.628, y: 0.44, n: "Saudi Arabia" },
      { x: 0.553, y: 0.2, n: "Italy" },
      { x: 0.215, y: 0.14, n: "Canada" },
    ];
    let W = 0, H = 0, dpr = 1, inView = false, hot = 0, userHot = false;
    const anim = { t: 0, arcs: 0 };
    const resize = () => { const r = canvas.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; canvas.width = W * dpr; canvas.height = H * dpr; };
    resize(); addEventListener("resize", resize);
    const themeColor = () => (document.documentElement.dataset.theme === "light" ? "15,15,16" : "243,241,236");
    const draw = (time) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const rgb = themeColor(), eg = PINS[0], maxD = 1.25;
      const r = Math.max(1.2, W / 560);
      const rect = canvas.getBoundingClientRect();
      const mx = mouse.x - rect.left, my = mouse.y - rect.top;
      for (let k = 0; k < D.length; k += 2) {
        const x = D[k] * W, y = D[k + 1] * H;
        const d = Math.hypot((D[k] - eg.x) * RATIO, D[k + 1] - eg.y) / RATIO;
        const a = clamp((anim.t * maxD - d) / 0.08, 0, 1);
        if (a <= 0) continue;
        const m = clamp(1 - Math.hypot(x - mx, y - my) / 90, 0, 1);
        ctx.fillStyle = m > 0.05 ? `rgba(236,28,36,${0.35 + m * 0.65})` : `rgba(${rgb},${0.28 * a})`;
        ctx.beginPath(); ctx.arc(x, y - m * 4, r * (a * 0.8 + 0.2) * (1 + m * 0.9), 0, Math.PI * 2); ctx.fill();
      }
      // arcs
      const ex = eg.x * W, ey = eg.y * H;
      PINS.slice(1).forEach((p, i) => {
        const prog = clamp(anim.arcs * 3 - i, 0, 1);
        if (prog <= 0) return;
        const px = p.x * W, py = p.y * H, cx = (ex + px) / 2, cy = Math.min(ey, py) - Math.hypot(px - ex, py - ey) * 0.35;
        ctx.strokeStyle = `rgba(236,28,36,${hot === i + 1 ? 0.95 : 0.5})`;
        ctx.lineWidth = hot === i + 1 ? 2 : 1.2;
        ctx.setLineDash([4, 5]); ctx.lineDashOffset = -time * 0.02;
        ctx.beginPath(); ctx.moveTo(ex, ey);
        const N = 40;
        for (let s = 1; s <= N * prog; s++) {
          const t = s / N, u = 1 - t;
          ctx.lineTo(u * u * ex + 2 * u * t * cx + t * t * px, u * u * ey + 2 * u * t * cy + t * t * py);
        }
        ctx.stroke(); ctx.setLineDash([]);
      });
      // pins
      PINS.forEach((p, i) => {
        const show = i === 0 ? anim.t > 0.02 : clamp(anim.arcs * 3 - (i - 1), 0, 1) >= 1;
        if (!show) return;
        const x = p.x * W, y = p.y * H, on = hot === i;
        const pulse = (time / 1400 + i * 0.25) % 1;
        ctx.strokeStyle = `rgba(236,28,36,${(1 - pulse) * 0.8})`; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, 6 + pulse * (on ? 34 : 20), 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = "#EC1C24";
        ctx.beginPath(); ctx.arc(x, y, on ? 9 : 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.font = `500 ${on ? 10 : 9}px JetBrains Mono, monospace`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(i + 1), x, y + 0.5);
        if (on) {
          ctx.font = "600 12px JetBrains Mono, monospace"; ctx.textAlign = "left";
          const label = p.n.toUpperCase(), tw = ctx.measureText(label).width;
          ctx.fillStyle = "#EC1C24"; ctx.fillRect(x + 16, y - 12, tw + 18, 24);
          ctx.fillStyle = "#fff"; ctx.fillText(label, x + 25, y + 1);
        }
      });
    };
    const loop = () => { if (inView) draw(performance.now()); };
    gsap.ticker.add(loop);
    ScrollTrigger.create({
      trigger: ".map", start: "top bottom", end: "bottom top", onToggle: (s) => { inView = s.isActive; if (inView) resize(); },
    });
    gsap.timeline({ scrollTrigger: { trigger: ".map", start: "top 75%" } })
      .to(anim, { t: 1, duration: 2.6, ease: "power2.out" })
      .to(anim, { arcs: 1, duration: 2.2, ease: "power2.inOut" }, 0.9);
    const setHot = (i) => { hot = i; li.forEach((l, k) => l.classList.toggle("is-on", k === i)); };
    setHot(0);
    li.forEach((l, i) => {
      l.addEventListener("mouseenter", () => { userHot = true; setHot(i); });
      l.addEventListener("mouseleave", () => { userHot = false; });
      l.addEventListener("click", () => setHot(i));
    });
    setInterval(() => { if (inView && !userHot) setHot((hot + 1) % PINS.length); }, 2600);
    gsap.from(li, { x: 40, opacity: 0, duration: 1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".countries", start: "top 85%" } });
  }

  // Leaders + CSR
  gsap.from(".leaders li", { y: 50, opacity: 0, duration: 1.1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".leaders", start: "top 88%" } });
  gsap.from(".csr__list li", { y: 40, opacity: 0, duration: 1, stagger: 0.08, ease: "expo.out", scrollTrigger: { trigger: ".csr__list", start: "top 88%" } });

  // Contact
  gsap.fromTo(".contact__bg img", { yPercent: -10 }, { yPercent: 0, ease: "none", scrollTrigger: { trigger: ".contact", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.from(".contact__mail", { scale: 0.6, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: ".contact__mail", start: "top 92%" } });
  gsap.from(".office", { y: 40, opacity: 0, duration: 1, stagger: 0.1, ease: "expo.out", scrollTrigger: { trigger: ".offices", start: "top 92%" } });

  // Footer: the logo rises out of its own stripes
  gsap.fromTo(".footer__logo img",
    { yPercent: 70, clipPath: "inset(0% 0% 100% 0%)" },
    { yPercent: 0, clipPath: "inset(0% 0% 0% 0%)", ease: "power2.out",
      scrollTrigger: { trigger: ".footer", start: "top bottom", end: "bottom bottom", scrub: 1 } });

  // Theme follows whichever section sits under the viewport's centre line, checked on every
  // scroll frame, so it's direction-independent and can't miss a section on fast flicks or pins
  const themed = $$("section[data-theme], footer[data-theme]");
  function syncTheme() {
    const mid = innerHeight / 2;
    let hit = null;
    for (const sec of themed) {
      // a pinned section is measured by its pin spacer, which spans the full pinned scroll distance
      const box = sec.parentElement.classList.contains("pin-spacer") ? sec.parentElement : sec;
      const r = box.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) hit = sec;
    }
    if (hit) setSection(hit);
  }
  addEventListener("scroll", syncTheme, { passive: true });
  addEventListener("resize", syncTheme);
  ScrollTrigger.addEventListener("refresh", syncTheme);
  setSection($(".hero"));
  addEventListener("load", () => { if (lenis) lenis.scrollTo(0, { immediate: true, force: true }); else window.scrollTo(0, 0); });

  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener("load", () => ScrollTrigger.refresh());
  runLoader();
})();
