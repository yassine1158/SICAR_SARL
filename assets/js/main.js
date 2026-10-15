(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const on = (sel, ev, fn) => { const el = typeof sel === "string" ? $(sel) : sel; if (el) el.addEventListener(ev, fn); return el; };
  const bust = "?v=" + Date.now(); // toujours la dernière version des données
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;
  const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const productURL = (p) => "produit.html?id=" + encodeURIComponent(p.id || p.name);
  const body = document.body;
  const onePage = body.dataset.page === "onepage"; // version téléphone (mobile.html)
  let site = {}, products = [];

  /* =========================================================
     Préchargement (1re visite) et transitions entre pages
     ========================================================= */
  const seen = document.documentElement.classList.contains("seen");
  const reveal = () => body.classList.add("loaded");
  if (seen) requestAnimationFrame(() => setTimeout(reveal, 60));
  else {
    const plNum = $("#pl-num"); let pl = 0, loaded = false;
    const plTimer = setInterval(() => {
      pl = Math.min(pl + (loaded ? 9 : Math.random() * 6), loaded ? 100 : 90);
      plNum.textContent = Math.round(pl);
      if (pl >= 100) { clearInterval(plTimer); reveal(); try { sessionStorage.setItem("sicar_seen", "1"); } catch {} }
    }, 40);
    addEventListener("load", () => (loaded = true)); setTimeout(() => (loaded = true), 3000);
  }
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-no-transition")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/^https?:/.test(url.protocol)) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // ancre sur la même page
    if (reduce) return;
    e.preventDefault(); body.classList.add("leaving");
    setTimeout(() => (location.href = url.href), 650);
  });
  addEventListener("pageshow", (e) => { if (e.persisted) { body.classList.remove("leaving"); reveal(); } });
  $("#year").textContent = new Date().getFullYear();

  /* ---------- page active dans le menu ---------- */
  $$("[data-nav]").forEach((a) => a.classList.toggle("current", a.dataset.nav === body.dataset.page));
  if ($(".product-page")) body.classList.add("solid");

  /* ---------- notifications ---------- */
  const toast = (html) => {
    const t = $("#toast"); t.innerHTML = `<i>✓</i><span>${html}</span>`; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3800);
  };
  const addedToast = (what) => toast(`${what} <a href="${onePage ? "#contact" : "contact.html#quote"}">Voir mon devis</a>`);

  /* ---------- verrouillage du défilement ---------- */
  const locks = new Set();
  const lock = (k, v) => { v ? locks.add(k) : locks.delete(k); body.classList.toggle("lock", locks.size > 0); };

  /* ---------- titres découpés en mots ---------- */
  const splitTitle = (el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="w"><span style="transition-delay:${0.15 + i * 0.07}s">${esc(w)}</span></span>`).join(" ");
  };
  $$("[data-split]").forEach(splitTitle);

  /* =========================================================
     Défilement : en-tête, progression, parallaxe, frise
     ========================================================= */
  const header = $("#header"), totop = $("#totop"), prog = $("#progress");
  const paras = $$("[data-speed]"), heroMedia = $(".hero-media"), phBg = $(".ph-bg");
  const tl = $("#timeline"), tlFill = $("#tl-fill"), tlSteps = $$(".tl-step");
  let lastY = 0, ticking = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight, k = max > 0 ? y / max : 0;
    header.classList.toggle("scrolled", y > 60 || body.classList.contains("solid"));
    if (y > 500 && y > lastY + 2 && !locks.size) header.classList.add("hide");
    if (y < lastY - 2 || y <= 500) header.classList.remove("hide");
    lastY = y;
    prog.style.transform = `scaleX(${k})`;
    totop.classList.toggle("show", y > 700);
    totop.style.setProperty("--off", 113.1 * (1 - k));
    if (onePage) {
      let cur = "accueil";
      $$("main section[id]").forEach((sec) => { if (y >= sec.offsetTop - 140) cur = sec.id; });
      $$("[data-nav]").forEach((a) => a.classList.toggle("current", a.dataset.nav === cur));
    }
    if (!reduce) {
      paras.forEach((el) => { const r = el.parentElement.getBoundingClientRect(); el.style.transform = `translate3d(0,${(r.top + r.height / 2 - innerHeight / 2) * +el.dataset.speed}px,0)`; });
      if (heroMedia && y < innerHeight) heroMedia.style.transform = `translate3d(0,${y * 0.3}px,0)`;
      if (phBg && y < innerHeight) phBg.style.translate = `0 ${y * 0.35}px`;
    }
    if (tl && tlFill) {
      const r = tl.getBoundingClientRect(), p = Math.min(Math.max((innerHeight * 0.75 - r.top) / r.height, 0), 1);
      tlFill.style.transform = `scaleX(${p})`;
      tlSteps.forEach((s, i) => s.classList.toggle("lit", p >= (i + 0.5) / tlSteps.length));
    }
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener("resize", onScroll); onScroll();
  totop.onclick = () => scrollTo({ top: 0 });

  /* ---------- menu mobile ---------- */
  const burger = $("#burger"), menu = $("#menu");
  const toggleMenu = (open) => { burger.classList.toggle("open", open); menu.classList.toggle("open", open); lock("menu", open); };
  burger.onclick = () => toggleMenu(!menu.classList.contains("open"));
  if (onePage) $$("#menu a").forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

  /* ---------- diaporama (accueil) ---------- */
  const slides = $$(".slide"), snav = $("#slide-nav");
  if (slides.length && snav) {
    let si = 0, sTimer;
    snav.innerHTML = slides.map((_, i) => `<button aria-label="Image ${i + 1}">${String(i + 1).padStart(2, "0")}<i></i></button>`).join("");
    const navBtns = $$("button", snav);
    const go = (i) => {
      slides[si].classList.remove("active"); navBtns[si].classList.remove("on");
      si = (i + slides.length) % slides.length;
      slides[si].classList.add("active"); void navBtns[si].offsetWidth; navBtns[si].classList.add("on");
      clearTimeout(sTimer); sTimer = setTimeout(() => go(si + 1), 6000);
    };
    navBtns.forEach((b, i) => (b.onclick = () => go(i)));
    go(0);
  }

  /* ---------- poussière (accueil) ---------- */
  const cv = $("#dust"); let mx = 0, my = 0;
  if (cv && !reduce) {
    const ctx = cv.getContext("2d"), parts = [];
    const size = () => { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; };
    size(); addEventListener("resize", size);
    for (let i = 0; i < (innerWidth < 600 ? 35 : 80); i++) parts.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 2 + .3, vx: Math.random() * .45 + .08, vy: -(Math.random() * .25), a: Math.random() * .45 + .08 });
    (function draw() {
      if (scrollY < innerHeight) {
        ctx.clearRect(0, 0, cv.width, cv.height);
        for (const p of parts) {
          p.x += p.vx + mx * .3; p.y += p.vy + my * .2;
          if (p.x > cv.width) p.x = 0; if (p.x < 0) p.x = cv.width; if (p.y < 0) p.y = cv.height; if (p.y > cv.height) p.y = 0;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = `rgba(240,228,210,${p.a})`; ctx.fill();
        }
      }
      requestAnimationFrame(draw);
    })();
    if (finePointer) on(".hero", "mousemove", (e) => {
      mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
      slides.forEach((s) => (s.style.translate = `${-mx * 24}px ${-my * 16}px`));
    });
  }

  /* ---------- apparitions ---------- */
  // les masques (clip-path) sont observés via leur parent : un élément entièrement masqué n'est jamais « visible »
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const t = e.target; io.unobserve(t);
    if (t.classList.contains("reveal")) t.classList.add("in"); else $$(".mask-reveal", t).forEach((m) => m.classList.add("in"));
  }), { threshold: .12, rootMargin: "0px 0px -40px 0px" });
  const observe = (root = document) => {
    let n = 0;
    $$(".reveal:not(.in)", root).forEach((el) => { el.style.transitionDelay = (n++ % 4) * 0.09 + "s"; io.observe(el); });
    new Set($$(".mask-reveal:not(.in)", root).map((m) => m.parentElement)).forEach((p) => io.observe(p));
  };
  observe();

  /* ---------- compteurs ---------- */
  const countIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; countIO.unobserve(e.target);
    const b = e.target.querySelector("b"), end = +b.dataset.to, suf = b.dataset.suffix || ""; const t0 = performance.now();
    const step = (t) => { const k = Math.min((t - t0) / 1800, 1); b.textContent = Math.round(end * (1 - Math.pow(1 - k, 4))) + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .5 });

  /* =========================================================
     Effets souris (ordinateur)
     ========================================================= */
  const tilt = (el) => {
    if (!finePointer || reduce) return;
    el.addEventListener("mousemove", (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-8px)`; });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  };
  if (finePointer && !reduce) {
    $$(".magnetic").forEach((el) => {
      el.addEventListener("mousemove", (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });

    document.documentElement.classList.add("has-cursor");
    const cur = $("#cursor"), dot = $(".c-dot"), ring = $(".c-ring"), label = $("em", ring);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; cur.classList.remove("hidden"); });
    document.addEventListener("mouseleave", () => cur.classList.add("hidden"));
    addEventListener("mouseover", (e) => {
      const v = e.target.closest("[data-cursor]"), l = e.target.closest("a,button,summary,label,select");
      cur.classList.toggle("view", !!v && !e.target.closest(".card-add")); cur.classList.toggle("link", (!v || !!e.target.closest(".card-add")) && !!l);
      if (v) label.textContent = v.dataset.cursor;
    });
    (function loop() {
      rx += (x - rx) * .18; ry += (y - ry) * .18;
      dot.style.transform = `translate(${x}px,${y}px)`; ring.style.transform = `translate(${rx}px,${ry}px)`;
      requestAnimationFrame(loop);
    })();

    const fl = $("#sector-float");
    if (fl) {
      const flImg = $("img", fl); let fx = 0, fy = 0, tx = 0, ty = 0;
      $$(".sector").forEach((s) => {
        s.addEventListener("mouseenter", () => { flImg.src = s.dataset.img; fl.classList.add("on"); });
        s.addEventListener("mouseleave", () => fl.classList.remove("on"));
      });
      on("#sectors", "mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
      (function floatLoop() {
        if (fl.classList.contains("on")) { fx += (tx - fx) * .12; fy += (ty - fy) * .12; fl.style.translate = `${fx}px ${fy}px`; fl.style.rotate = `${(tx - fx) * .04}deg`; }
        requestAnimationFrame(floatLoop);
      })();
    }
  }

  /* =========================================================
     Demande de devis (partagée entre les pages)
     ========================================================= */
  let basket = store.get("sicar_devis", []);
  const unitOf = (name) => (products.find((p) => p.name === name) || {}).unit || "m³";
  const qList = $("#q-list");
  const saveBasket = () => { store.set("sicar_devis", basket); renderBasket(); };
  const addToBasket = (name, qty) => {
    qty = Math.max(0, Math.ceil(+qty * 10) / 10) || 1;
    const it = basket.find((b) => b.name === name);
    if (it) it.qty = Math.round((it.qty + qty) * 10) / 10; else basket.push({ name, qty });
    saveBasket();
    const btn = $("#basket-btn"); btn.classList.remove("bump"); void btn.offsetWidth; btn.classList.add("bump");
  };
  function renderBasket() {
    const n = basket.length;
    $("#basket-count").textContent = n; $("#basket-btn").classList.toggle("has", n > 0);
    $$(".card").forEach((c) => c.querySelector(".card-add")?.classList.toggle("added", basket.some((b) => b.name === c.dataset.name)));
    if (!qList) return;
    $("#q-clear").hidden = !n;
    qList.innerHTML = basket.map((b, i) => `<li><b>${esc(b.name)}</b>
      <span class="qty"><input type="number" min="0.1" step="0.1" value="${b.qty}" data-i="${i}" aria-label="Quantité ${esc(b.name)}"><span>${esc(unitOf(b.name))}</span></span>
      <button type="button" class="rm" data-i="${i}" aria-label="Retirer"><svg class="ic"><use href="#i-x"/></svg></button></li>`).join("");
  }
  if (qList) {
    qList.addEventListener("input", (e) => { if (e.target.dataset.i) { basket[+e.target.dataset.i].qty = +e.target.value || 0; store.set("sicar_devis", basket); } });
    qList.addEventListener("click", (e) => { const b = e.target.closest(".rm"); if (b) { basket.splice(+b.dataset.i, 1); saveBasket(); } });
    on("#q-clear", "click", () => { basket = []; saveBasket(); });
    on("#q-add", "click", () => { const name = $("#q-product").value; if (name) addToBasket(name, $("#q-qty").value); });

    let via = "whatsapp";
    $$("#quote [data-via]").forEach((b) => b.addEventListener("click", () => (via = b.dataset.via)));
    on("#quote", "submit", (e) => {
      e.preventDefault();
      const f = e.target, err = $("#form-err");
      $$(".field", f).forEach((l) => l.classList.remove("invalid"));
      const missing = ["nom", "tel"].filter((k) => !f.elements[k].value.trim());
      missing.forEach((k) => f.elements[k].closest(".field").classList.add("invalid"));
      if (missing.length) { err.textContent = "Merci d'indiquer votre nom et votre téléphone."; return; }
      if (!basket.length && !f.elements.msg.value.trim()) { err.textContent = "Ajoutez au moins un produit ou écrivez un message."; return; }
      err.textContent = "";
      const d = Object.fromEntries(new FormData(f));
      const lines = basket.map((b) => `• ${b.name} : ${fmt(b.qty)} ${unitOf(b.name)}`).join("\n");
      const txt = `Demande de devis — SICAR SARL\n\nNom : ${d.nom}\nTéléphone : ${d.tel}${d.lieu ? `\nLivraison : ${d.lieu}` : ""}${lines ? `\n\nProduits :\n${lines}` : ""}${d.msg ? `\n\n${d.msg}` : ""}`;
      if (via === "email") location.href = `mailto:${site.email}?subject=${encodeURIComponent("Demande de devis — SICAR SARL")}&body=${encodeURIComponent(txt)}`;
      else open(`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(txt)}`, "_blank");
    });
  }
  renderBasket();

  /* =========================================================
     Données du site
     ========================================================= */
  fetch("data/site.json" + bust).then((r) => r.json()).then((d) => {
    site = d;
    $$("[data-site]").forEach((el) => { if (el.hasAttribute("data-split")) return; const v = d[el.dataset.site]; if (v) el.textContent = v; });
    $$("[data-site][data-split]").forEach((el) => { const v = d[el.dataset.site]; if (v) { el.textContent = v; splitTitle(el); } });
    $$("[data-site-href]").forEach((el) => { const v = d[el.dataset.site || el.dataset.qc]; if (v) el.href = el.dataset.siteHref + ":" + v.replace(/\s/g, ""); });
    const wa = d.whatsapp ? "https://wa.me/" + d.whatsapp : null;
    if (wa) ["#wa", "#faq-wa", "#qc-wa"].forEach((s) => { const el = $(s); if (el) el.href = wa; });
    const map = $("#map"); if (map && (d.mapQuery || d.address)) map.src = "https://maps.google.com/maps?q=" + encodeURIComponent(d.mapQuery || d.address) + "&z=11&output=embed";

    const stats = $("#stats");
    if (stats) {
      stats.innerHTML = (d.stats || []).map((s) => `<div class="stat reveal"><b data-to="${+s.value || 0}" data-suffix="${esc(s.suffix)}">0${esc(s.suffix)}</b><span>${esc(s.label)}</span></div>`).join("");
      $$(".stat").forEach((s) => countIO.observe(s)); observe(stats);
    }
    const gal = $("#gallery");
    if (gal) {
      const g = d.gallery || [], lim = +gal.dataset.limit || g.length;
      gal.innerHTML = g.slice(0, lim).map((src, i) => `<a data-i="${i}" class="reveal" data-cursor="Voir"><img src="${esc(src)}" alt="SICAR SARL — photo ${i + 1}" loading="lazy"></a>`).join("");
      observe(gal);
      $$("a", gal).forEach((a) => (a.onclick = () => openLb(+a.dataset.i)));
      const c = $("#gal-count"); if (c) c.textContent = `(${g.length} photos)`;
    }
    if ($("#faq-list")) renderFaq(d.faq || []);
    seo(d);
    onScroll();
  }).catch(console.error);

  /* ---------- FAQ ---------- */
  function renderFaq(list) {
    const box = $("#faq-list");
    if (!list.length) { box.innerHTML = '<p class="muted">Aucune question pour le moment.</p>'; return; }
    box.innerHTML = list.map((f) => `<details class="reveal"><summary>${esc(f.q)}<i></i></summary><div class="ans"><p>${esc(f.a)}</p></div></details>`).join("");
    observe(box);
    $$("details", box).forEach((det) => {
      const sum = $("summary", det), ans = $(".ans", det);
      sum.addEventListener("click", (e) => {
        e.preventDefault();
        if (det.open) {
          ans.style.height = ans.scrollHeight + "px"; requestAnimationFrame(() => (ans.style.height = "0px"));
          setTimeout(() => (det.open = false), 450);
        } else {
          det.open = true; ans.style.height = "0px";
          requestAnimationFrame(() => (ans.style.height = ans.scrollHeight + "px"));
          setTimeout(() => (ans.style.height = "auto"), 460);
        }
      });
    });
  }

  /* ---------- données structurées (référencement) ---------- */
  function seo(d) {
    if (body.dataset.page !== "accueil" && body.dataset.page !== "contact") return;
    const s = document.createElement("script"); s.type = "application/ld+json";
    s.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "LocalBusiness", name: d.company || "SICAR SARL",
      description: d.heroText, telephone: d.phone, email: d.email, image: new URL("assets/img/station-concassage.jpg", location.href).href,
      address: { "@type": "PostalAddress", streetAddress: d.address, addressCountry: "CI" }, openingHours: d.hours, url: new URL("index.html", location.href).href,
    });
    document.head.appendChild(s);
  }

  /* =========================================================
     Produits
     ========================================================= */
  const grainHTML = (g) => { const m = String(g || "").match(/^(.*?)\s*(mm)$/i); return m ? `${esc(m[1])}<small>${esc(m[2])}</small>` : esc(g); };
  const currentId = new URLSearchParams(location.search).get("id");
  const cardHTML = (p) => `
    <article class="card reveal ${p.available === false ? "out" : ""}" data-cat="${esc(p.category)}" data-name="${esc(p.name)}" data-cursor="Fiche">
      <a class="card-link" href="${productURL(p)}" aria-label="Fiche ${esc(p.name)}"></a>
      <div class="card-img">
        <img src="${esc(p.image || "assets/img/stock-sable.jpg")}" alt="${esc(p.name)}" loading="lazy">
        <span class="badge ${esc(p.category)}">${esc(p.category)}</span>
        ${p.available === false ? '<span class="stock">Rupture</span>' : ""}
        ${p.granulometrie ? `<span class="grain">${grainHTML(p.granulometrie)}</span>` : ""}
      </div>
      <button class="card-add" aria-label="Ajouter ${esc(p.name)} au devis"><svg class="ic"><use href="#i-plus"/></svg></button>
      <div class="card-body">
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description)}</p>
        <div class="tags">${(p.usages || []).map((u) => `<span>${esc(u)}</span>`).join("")}</div>
        <div class="card-foot">
          ${p.price ? `<span class="price">${esc(p.price)} <small>FCFA / ${esc(p.unit || "m³")}</small></span>` : '<span class="price price-quote">Prix sur devis</span>'}
          <span class="order"><svg class="ic"><use href="#i-arrow"/></svg></span>
        </div>
      </div>
    </article>`;

  fetch("data/products.json" + bust).then((r) => r.json()).then((list) => {
    products = list;
    const box = $("#products");
    if (box) {
      let shown = list;
      if (box.hasAttribute("data-exclude-current")) shown = list.filter((p) => (p.id || p.name) !== currentId);
      if (box.dataset.limit) {
        const feat = shown.filter((p) => p.featured);
        shown = (feat.length >= +box.dataset.limit ? feat : [...feat, ...shown.filter((p) => !p.featured)]).slice(0, +box.dataset.limit);
      }
      box.innerHTML = shown.length ? shown.map(cardHTML).join("") : '<p class="muted">Aucun produit pour le moment.</p>';
      observe(box); $$(".card", box).forEach(tilt);
      box.addEventListener("click", (e) => {
        const add = e.target.closest(".card-add"); if (!add) return;
        e.preventDefault();
        const name = add.closest(".card").dataset.name;
        addToBasket(name, 10); addedToast(`<b>${esc(name)}</b> ajouté (10 ${esc(unitOf(name))}).`);
      });
    }
    const qp = $("#q-product"); if (qp) qp.innerHTML = list.map((p) => `<option>${esc(p.name)}</option>`).join("");
    const hp = $("#hero-products");
    if (hp) {
      const top = (list.filter((p) => p.featured).length ? list.filter((p) => p.featured) : list).slice(0, 4);
      hp.innerHTML = top.map((p) => `<li><a href="${productURL(p)}">${esc(p.name.replace(/\s*[\d>].*$/, "") || p.name)}</a><span>${esc(p.granulometrie)}</span></li>`).join("");
    }
    $("#foot-products").innerHTML = list.slice(0, 6).map((p) => `<a href="${productURL(p)}">${esc(p.name)}</a>`).join("");
    const tk = $("#ticker");
    if (tk) { const names = list.map((p) => `<span>${esc(p.name)}</span>`).join(""); tk.innerHTML = names + names + names + names; }
    if ($("#filters")) setupFilters(list);
    if ($("#pp")) renderProductPage(list);
    if (onePage && currentId) { const p = list.find((x) => (x.id || x.name) === currentId); if (p) openProduct(p); }
    renderBasket();
  }).catch(() => { const b = $("#products"); if (b) b.innerHTML = '<p class="muted">Impossible de charger les produits.</p>'; });

  /* ---------- filtres du catalogue ---------- */
  function setupFilters(list) {
    const pillBg = $(".pill-bg");
    const movePill = () => { const a = $("#filters button.active"); if (a) { pillBg.style.width = a.offsetWidth + "px"; pillBg.style.transform = `translateX(${a.offsetLeft}px)`; } };
    addEventListener("resize", movePill);
    const cats = new Set(list.map((p) => p.category));
    $$("#filters button").forEach((b) => { if (b.dataset.filter !== "all" && !cats.has(b.dataset.filter)) b.remove(); });
    const titles = { all: "Tous les produits", gravier: "Graviers", sable: "Sables", roche: "Roche & moellons" };
    const apply = (f) => {
      $$("#filters button").forEach((x) => x.classList.toggle("active", x.dataset.filter === f)); movePill();
      const t = $("#cat-title"); if (t) t.textContent = titles[f] || titles.all;
      $$(".card").forEach((c) => {
        const show = f === "all" || c.dataset.cat === f;
        c.classList.toggle("hide", !show);
        if (show) { c.classList.remove("in"); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add("in"))); }
      });
    };
    on("#filters", "click", (e) => { const b = e.target.closest("button"); if (!b) return; apply(b.dataset.filter); if (!onePage) history.replaceState(null, "", b.dataset.filter === "all" ? location.pathname : "#" + b.dataset.filter); });
    const h = location.hash.slice(1); apply(cats.has(h) ? h : "all");
  }

  /* ---------- page produit ---------- */
  function renderProductPage(list) {
    const p = list.find((x) => (x.id || x.name) === currentId) || list.find((x) => x.name === currentId);
    if (!p) { $("#pp").hidden = true; $("#pp-missing").hidden = false; return; }
    document.title = `${p.name} — SICAR SARL`;
    $('meta[name="description"]').setAttribute("content", `${p.name} (${p.granulometrie}) — ${p.description}`);
    $("#pp-img").src = p.image || "assets/img/stock-sable.jpg"; $("#pp-img").alt = p.name;
    $("#pp-grain").innerHTML = grainHTML(p.granulometrie);
    $("#pp-crumb").textContent = p.name;
    $("#pp-cat").textContent = p.category; $("#pp-cat").className = "badge pp-badge split-up " + p.category;
    $("#pp-title").textContent = p.name; splitTitle($("#pp-title"));
    $$("#pp-title .w>span").forEach((sp, i) => (sp.style.animationDelay = 0.1 + i * 0.08 + "s"));
    $("#pp-desc").textContent = p.description || "";
    $("#pp-specs").innerHTML = [
      ["Granulométrie", esc(p.granulometrie || "—")],
      ["Catégorie", esc(p.category)],
      ["Prix", p.price ? `${esc(p.price)} FCFA / ${esc(p.unit || "m³")}` : "Sur devis"],
      ["Disponibilité", p.available === false ? "Rupture" : "En stock", p.available === false ? "ko" : "ok"],
    ].map(([k, v, c]) => `<div><dt>${k}</dt><dd class="${c || ""}">${v}</dd></div>`).join("");
    $("#pp-tags").innerHTML = (p.usages || []).map((u) => `<span>${esc(u)}</span>`).join("") || '<span>Tous usages</span>';
    $("#pp-unit").textContent = p.unit || "m³";
    const setWa = () => ($("#pp-wa").href = `https://wa.me/${site.whatsapp || ""}?text=${encodeURIComponent(`Bonjour SICAR SARL, je souhaite un devis pour : ${p.name} — ${$("#pp-qty").value} ${p.unit || "m³"}.`)}`);
    setWa(); on("#pp-qty", "input", setWa); setTimeout(setWa, 1500);
    on("#pp-add", "click", () => { addToBasket(p.name, $("#pp-qty").value); addedToast(`<b>${esc(p.name)}</b> ajouté à votre devis.`); });
    observe($("#pp"));
  }

  /* =========================================================
     Fiche produit en panneau latéral (version une page)
     ========================================================= */
  const pm = $("#pmodal"); let pmProduct = null, pmReturn = null;
  function openProduct(p) {
    if (!pm) return;
    pmProduct = p; pmReturn = document.activeElement;
    $("#pm-img").src = p.image || "assets/img/stock-sable.jpg"; $("#pm-img").alt = p.name;
    $("#pm-grain").innerHTML = grainHTML(p.granulometrie);
    $("#pm-cat").textContent = p.category; $("#pm-cat").className = "badge " + p.category;
    $("#pm-title").textContent = p.name;
    $("#pm-desc").textContent = p.description || "";
    $("#pm-specs").innerHTML = [
      ["Granulométrie", esc(p.granulometrie || "—")],
      ["Catégorie", esc(p.category)],
      ["Prix", p.price ? `${esc(p.price)} FCFA / ${esc(p.unit || "m³")}` : "Sur devis"],
      ["Disponibilité", p.available === false ? "Rupture" : "En stock", p.available === false ? "ko" : "ok"],
    ].map(([k, v, c]) => `<div><dt>${k}</dt><dd class="${c || ""}">${v}</dd></div>`).join("");
    $("#pm-tags").innerHTML = (p.usages || []).map((u) => `<span>${esc(u)}</span>`).join("");
    $("#pm-unit").textContent = p.unit || "m³"; $("#pm-qty").value = 10;
    $("#pm-wa").href = `https://wa.me/${site.whatsapp || ""}?text=${encodeURIComponent(`Bonjour SICAR SARL, je souhaite un devis pour : ${p.name}.`)}`;
    pm.classList.add("open"); pm.setAttribute("aria-hidden", "false"); lock("pm", true);
    setTimeout(() => $(".pm-close", pm).focus({ preventScroll: true }), 50);
  }
  const closeProduct = () => { pm.classList.remove("open"); pm.setAttribute("aria-hidden", "true"); lock("pm", false); pmReturn?.focus?.({ preventScroll: true }); };
  if (pm) {
    $$("[data-close]", pm).forEach((b) => (b.onclick = closeProduct));
    $("#pm-add").onclick = () => { addToBasket(pmProduct.name, $("#pm-qty").value); closeProduct(); addedToast(`<b>${esc(pmProduct.name)}</b> ajouté à votre devis.`); };
    addEventListener("keydown", (e) => { if (e.key === "Escape" && pm.classList.contains("open")) closeProduct(); });
    // les liens vers produit.html ouvrent le panneau au lieu de changer de page
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="produit.html"]'); if (!a) return;
      const id = new URL(a.href).searchParams.get("id"), p = products.find((x) => (x.id || x.name) === id);
      if (p) { e.preventDefault(); openProduct(p); }
    }, true);
  }

  /* =========================================================
     Lightbox
     ========================================================= */
  const lb = $("#lightbox"), lbImg = $("img", lb); let li = 0;
  const openLb = (i) => { const g = site.gallery || []; if (!g.length) return; li = (i + g.length) % g.length; lbImg.src = g[li]; $(".lb-count").textContent = `${String(li + 1).padStart(2, "0")} / ${String(g.length).padStart(2, "0")}`; lb.classList.add("open"); lock("lb", true); };
  const closeLb = () => { lb.classList.remove("open"); lock("lb", false); };
  $(".lb-close").onclick = closeLb;
  $(".lb-prev").onclick = () => openLb(li - 1);
  $(".lb-next").onclick = () => openLb(li + 1);
  lb.onclick = (e) => { if (e.target === lb) closeLb(); };
  addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (lb.classList.contains("open")) closeLb(); if (menu.classList.contains("open")) toggleMenu(false); }
    if (!lb.classList.contains("open")) return;
    if (e.key === "ArrowLeft") openLb(li - 1);
    if (e.key === "ArrowRight") openLb(li + 1);
  });
  document.addEventListener("click", (e) => { if (e.target.closest("#toast a")) $("#toast").classList.remove("show"); });
})();
