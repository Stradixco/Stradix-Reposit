/* S-TRADIX — site interactions (no dependencies). Loaded with `defer`. */
(() => {
  "use strict";

  const doc = document.documentElement;
  doc.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Header: solid on scroll, hide on scroll down ---------- */
  const header = $("[data-header]");
  if (header) {
    let lastY = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      header.classList.toggle("is-solid", y > 24);
      const busy = header.classList.contains("is-open") || header.querySelector(".mega.is-open");
      header.classList.toggle("is-hidden", !busy && y > 480 && y > lastY + 4);
      if (y < lastY - 4 || y < 480) header.classList.remove("is-hidden");
      lastY = y;
      ticking = false;
    };
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------- Mega menu ---------- */
  $$(".has-mega").forEach((item) => {
    const trigger = $(".nav-trigger", item);
    const panel = $(".mega", item);
    if (!trigger || !panel) return;
    let closeTimer;
    const setOpen = (open) => {
      trigger.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("is-open", open);
    };
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    trigger.addEventListener("click", (e) => {
      // A mouse click right after hover-open should keep the panel open; keyboard/touch toggles.
      if (fine.matches && e.detail > 0) setOpen(true);
      else setOpen(trigger.getAttribute("aria-expanded") !== "true");
    });
    item.addEventListener("pointerenter", () => { if (fine.matches) { clearTimeout(closeTimer); setOpen(true); } });
    item.addEventListener("pointerleave", () => { if (fine.matches) closeTimer = setTimeout(() => setOpen(false), 180); });
    item.addEventListener("focusout", (e) => { if (!item.contains(e.relatedTarget)) setOpen(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("is-open")) { setOpen(false); trigger.focus(); }
    });
    document.addEventListener("click", (e) => { if (!item.contains(e.target)) setOpen(false); });
  });

  /* ---------- Mobile navigation ---------- */
  const toggle = $(".menu-toggle");
  const mobileNav = $("#mobile-nav");
  if (toggle && mobileNav && header) {
    const focusables = () => $$("a, button", mobileNav).concat(toggle);
    const open = () => {
      mobileNav.hidden = false;
      requestAnimationFrame(() => mobileNav.classList.add("is-open"));
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "Close menu");
      header.classList.add("is-open");
      document.body.classList.add("nav-locked");
    };
    const close = (returnFocus = true) => {
      mobileNav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open menu");
      header.classList.remove("is-open");
      document.body.classList.remove("nav-locked");
      setTimeout(() => { mobileNav.hidden = true; }, reduceMotion ? 0 : 300);
      if (returnFocus) toggle.focus();
    };
    toggle.addEventListener("click", () => (toggle.getAttribute("aria-expanded") === "true" ? close() : open()));
    mobileNav.addEventListener("click", (e) => { if (e.target.closest("a")) close(false); });
    document.addEventListener("keydown", (e) => {
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items = focusables();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    window.matchMedia("(min-width: 1100px)").addEventListener("change", (e) => { if (e.matches && !mobileNav.hidden) close(false); });
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$("[data-reveal]");
  if (revealEls.length) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    } else {
      // A fully clipped element has no visible area, so IntersectionObserver would never
      // report it: for "clip" reveals, observe the (unclipped) parent instead.
      const targets = new Map();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (targets.get(entry.target) || []).forEach((el) => el.classList.add("is-visible"));
          io.unobserve(entry.target);
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
      revealEls.forEach((el) => {
        const watch = el.dataset.reveal === "clip" && el.parentElement ? el.parentElement : el;
        if (!targets.has(watch)) targets.set(watch, []);
        targets.get(watch).push(el);
        io.observe(watch);
      });
    }
  }

  /* ---------- Count-up statistics ---------- */
  const counters = $$("[data-count]");
  if (counters.length && "IntersectionObserver" in window && !reduceMotion) {
    const fmt = new Intl.NumberFormat("en-US");
    const run = (el) => {
      const target = Number(el.dataset.count);
      const start = performance.now();
      const dur = 1600;
      const step = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = fmt.format(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => io.observe(el));
  }

  /* ---------- Hero slideshow ---------- */
  const hero = $("[data-hero]");
  if (hero) {
    const slides = $$(".hero-slide", hero);
    const dots = $$(".hero-dot", hero);
    const pauseBtn = $(".hero-pause", hero);
    const interval = 7000;
    let index = 0;
    let timer = null;
    let paused = reduceMotion;

    const hydrate = (slide) => {
      $$("[data-srcset]", slide).forEach((node) => { node.srcset = node.dataset.srcset; node.removeAttribute("data-srcset"); });
      $$("img[data-src]", slide).forEach((img) => { img.src = img.dataset.src; img.removeAttribute("data-src"); });
    };
    const show = (i) => {
      index = (i + slides.length) % slides.length;
      hydrate(slides[index]);
      slides.forEach((s, n) => { s.classList.toggle("is-active", n === index); s.setAttribute("aria-hidden", String(n !== index)); });
      dots.forEach((d, n) => {
        d.setAttribute("aria-current", n === index ? "true" : "false");
        // restart progress animation
        d.style.animation = "none"; void d.offsetWidth; d.style.animation = "";
      });
      hydrate(slides[(index + 1) % slides.length]);
    };
    const schedule = () => { clearInterval(timer); if (!paused) timer = setInterval(() => show(index + 1), interval); };
    const setPaused = (p) => {
      paused = p;
      hero.classList.toggle("is-paused", p);
      if (pauseBtn) {
        pauseBtn.setAttribute("aria-label", p ? "Play slideshow" : "Pause slideshow");
        pauseBtn.innerHTML = p
          ? '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1l9 5-9 5z" fill="currentColor"/></svg>'
          : '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z" fill="currentColor"/></svg>';
      }
      schedule();
    };
    hero.style.setProperty("--slide-ms", interval + "ms");
    dots.forEach((d, n) => d.addEventListener("click", () => { show(n); schedule(); }));
    if (pauseBtn) pauseBtn.addEventListener("click", () => setPaused(!paused));
    document.addEventListener("visibilitychange", () => { if (document.hidden) clearInterval(timer); else schedule(); });
    window.addEventListener("load", () => hydrate(slides[1] || slides[0]), { once: true });
    show(0);
    setPaused(paused);
  }

  /* ---------- Services sub-navigation scroll-spy ---------- */
  const serviceNav = $("[data-service-nav]");
  if (serviceNav && "IntersectionObserver" in window) {
    const links = $$("a[href^='#']", serviceNav);
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => { a.classList.remove("is-active"); a.removeAttribute("aria-current"); });
        const link = map.get(entry.target.id);
        if (link) {
          link.classList.add("is-active");
          link.setAttribute("aria-current", "true");
          link.scrollIntoView({ block: "nearest", inline: "center", behavior: reduceMotion ? "auto" : "smooth" });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  /* ---------- Gallery filter + lightbox ---------- */
  const gallery = $("[data-gallery]");
  if (gallery) {
    const items = $$("[data-item]", gallery);
    const filterBtns = $$("[data-filter]");
    const status = $("[data-filter-status]");
    filterBtns.forEach((btn) => btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      filterBtns.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      let count = 0;
      items.forEach((li) => {
        const show = f === "all" || li.dataset.category === f;
        li.hidden = !show;
        if (show) count++;
      });
      if (status) status.textContent = `${count} item${count === 1 ? "" : "s"} shown`;
    }));

    const dialog = $("#lightbox");
    if (dialog && typeof dialog.showModal === "function") {
      const body = $(".lightbox-body", dialog);
      const caption = $(".lightbox-bar p", dialog);
      let current = 0;
      let opener = null;
      const visible = () => items.filter((li) => !li.hidden);
      const render = () => {
        const list = visible();
        const li = list[current];
        const tile = $(".work-tile", li);
        body.replaceChildren();
        if (tile.dataset.video) {
          const v = document.createElement("video");
          v.src = tile.dataset.video;
          v.controls = true;
          v.playsInline = true;
          v.preload = "metadata";
          if (!reduceMotion) v.autoplay = true;
          v.poster = tile.dataset.poster || "";
          body.append(v);
        } else {
          const img = document.createElement("img");
          img.src = tile.dataset.full;
          img.alt = $("img", tile).alt;
          body.append(img);
        }
        caption.textContent = tile.dataset.caption || "";
      };
      items.forEach((li) => {
        $(".work-tile", li).addEventListener("click", (e) => {
          e.preventDefault();
          opener = e.currentTarget;
          current = visible().indexOf(li);
          render();
          dialog.showModal();
        });
      });
      const step = (d) => { const n = visible().length; current = (current + d + n) % n; render(); };
      $("[data-lb-prev]", dialog).addEventListener("click", () => step(-1));
      $("[data-lb-next]", dialog).addEventListener("click", () => step(1));
      $("[data-lb-close]", dialog).addEventListener("click", () => dialog.close());
      dialog.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") step(1);
        if (e.key === "ArrowLeft") step(-1);
      });
      dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
      dialog.addEventListener("close", () => { body.replaceChildren(); if (opener) opener.focus(); });
    }
  }

  /* ---------- Contact form (Formspree) ---------- */
  const form = $("#enquiry-form");
  if (form) {
    const statusEl = $("#form-status");
    const submit = $("button[type='submit']", form);
    const serviceSelect = form.elements.service;
    const requested = new URLSearchParams(location.search).get("service");
    if (serviceSelect && requested && Array.from(serviceSelect.options).some((o) => o.value === requested)) {
      serviceSelect.value = requested;
    }
    const messages = {
      valueMissing: "This field is required.",
      typeMismatch: "Please enter a valid email address.",
      patternMismatch: "Please enter a valid phone number (digits, spaces, brackets or dashes).",
      tooShort: "Please add a little more detail.",
    };
    const errorFor = (field) => {
      const v = field.validity;
      if (v.valid) return "";
      if (v.valueMissing) return messages.valueMissing;
      if (v.typeMismatch) return messages.typeMismatch;
      if (v.patternMismatch) return messages.patternMismatch;
      if (v.tooShort) return messages.tooShort;
      return field.validationMessage;
    };
    const validateField = (field) => {
      const msg = errorFor(field);
      const out = document.getElementById(field.id + "-error");
      field.setAttribute("aria-invalid", msg ? "true" : "false");
      if (out) out.textContent = msg;
      return !msg;
    };
    const fields = $$("input:not([type='hidden']):not([name='_gotcha']), select, textarea", form);
    fields.forEach((f) => {
      f.addEventListener("blur", () => { if (f.value) validateField(f); });
      f.addEventListener("input", () => { if (f.getAttribute("aria-invalid") === "true") validateField(f); });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      statusEl.textContent = "";
      statusEl.removeAttribute("data-state");
      const results = fields.map(validateField);
      if (results.includes(false)) {
        const firstBad = fields[results.indexOf(false)];
        firstBad.focus();
        return;
      }
      if (form.elements._gotcha && form.elements._gotcha.value) return; // bot trap

      submit.setAttribute("aria-busy", "true");
      submit.disabled = true;
      const label = $(".btn-label", submit);
      const original = label.textContent;
      label.textContent = "Sending…";
      try {
        const data = new FormData(form);
        const res = await fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Request failed");
        form.reset();
        fields.forEach((f) => f.setAttribute("aria-invalid", "false"));
        statusEl.dataset.state = "success";
        statusEl.textContent = "Thank you — your message has been sent. Our team will get back to you shortly.";
      } catch {
        statusEl.dataset.state = "error";
        statusEl.textContent = "Sorry, your message could not be sent. Please try again or email sales@s-tradix.com.";
      } finally {
        submit.removeAttribute("aria-busy");
        submit.disabled = false;
        label.textContent = original;
        statusEl.focus();
      }
    });
  }

  /* ---------- Map: load the Google Maps embed only on request ---------- */
  $$("[data-map]").forEach((frame) => {
    const btn = $("button", frame);
    if (!btn) return;
    btn.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = frame.dataset.map;
      iframe.title = frame.dataset.mapTitle || "Map";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.allowFullscreen = true;
      frame.replaceChildren(iframe);
    });
  });

  /* ---------- Silent product preview videos: play only while visible, never with reduced motion ---------- */
  $$("video[data-autoplay]").forEach((video) => {
    if (reduceMotion || !("IntersectionObserver" in window)) { video.controls = true; return; }
    video.muted = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) video.play().catch(() => { video.controls = true; });
        else video.pause();
      });
    }, { threshold: 0.25 });
    io.observe(video);
  });

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Live chat (Tidio): defer until the visitor interacts or the page is idle ---------- */
  const chatId = doc.dataset.chat;
  if (chatId) {
    let loaded = false;
    const loadChat = () => {
      if (loaded) return;
      loaded = true;
      const s = document.createElement("script");
      s.src = `https://code.tidio.co/${chatId}.js`;
      s.async = true;
      document.body.append(s);
    };
    ["pointerdown", "keydown", "scroll"].forEach((ev) => window.addEventListener(ev, loadChat, { once: true, passive: true }));
    window.addEventListener("load", () => setTimeout(loadChat, 6000), { once: true });
  }
})();
