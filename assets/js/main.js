(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const bust = "?v=" + Date.now(); // toujours la dernière version des données
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;
  let site = {};

  /* ---------- préchargement ---------- */
  const plNum = $("#pl-num"); let pl = 0, loaded = false;
  const plTimer = setInterval(() => {
    pl = Math.min(pl + (loaded ? 9 : Math.random() * 6), loaded ? 100 : 90);
    plNum.textContent = Math.round(pl);
    if (pl >= 100) { clearInterval(plTimer); document.body.classList.add("loaded"); }
  }, 40);
  const done = () => (loaded = true);
  addEventListener("load", done); setTimeout(done, 3000);
  $("#year").textContent = new Date().getFullYear();

  /* ---------- titre découpé en mots ---------- */
  const splitTitle = (el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map((w, i) => `<span class="w"><span style="transition-delay:${0.15 + i * 0.07}s">${esc(w)}</span></span>`).join(" ");
  };
  $$("[data-split]").forEach(splitTitle);

  /* ---------- défilement : header, progression, parallaxe ---------- */
  const header = $("#header"), totop = $("#totop"), prog = $("#progress");
  const paras = $$("[data-speed]"), heroMedia = $(".hero-media");
  const tl = $("#timeline"), tlFill = $("#tl-fill"), tlSteps = $$(".tl-step");
  let lastY = 0, ticking = false;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight, k = max > 0 ? y / max : 0;
    header.classList.toggle("scrolled", y > 60);
    header.classList.toggle("hide", y > 500 && y > lastY && !$("#menu").classList.contains("open"));
    lastY = y;
    prog.style.transform = `scaleX(${k})`;
    totop.classList.toggle("show", y > 700);
    totop.style.setProperty("--off", 113.1 * (1 - k));
    let cur = "";
    $$("section[id]").forEach((s) => { if (y >= s.offsetTop - 140) cur = s.id; });
    $$("#menu a").forEach((a) => a.classList.toggle("current", a.getAttribute("href") === "#" + cur));
    if (!reduce) {
      paras.forEach((el) => { const r = el.parentElement.getBoundingClientRect(); el.style.transform = `translate3d(0,${(r.top + r.height / 2 - innerHeight / 2) * +el.dataset.speed}px,0)`; });
      if (y < innerHeight) heroMedia.style.transform = `translate3d(0,${y * 0.3}px,0)`;
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
  const toggleMenu = (open) => { burger.classList.toggle("open", open); menu.classList.toggle("open", open); document.body.classList.toggle("lock", open); };
  burger.onclick = () => toggleMenu(!menu.classList.contains("open"));
  $$("#menu a").forEach((a) => (a.onclick = () => toggleMenu(false)));

  /* ---------- diaporama ---------- */
  const slides = $$(".slide"), snav = $("#slide-nav"); let si = 0, sTimer;
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

  /* ---------- poussière ---------- */
  const cv = $("#dust"), ctx = cv.getContext("2d"); const parts = [];
  const size = () => { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; };
  size(); addEventListener("resize", size);
  for (let i = 0; i < (innerWidth < 600 ? 35 : 80); i++) parts.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 2 + .3, vx: Math.random() * .45 + .08, vy: -(Math.random() * .25), a: Math.random() * .45 + .08 });
  let mx = 0, my = 0;
  if (!reduce) (function draw() {
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
  if (finePointer && !reduce) {
    $(".hero").addEventListener("mousemove", (e) => {
      mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
      $$(".slide").forEach((s) => (s.style.translate = `${-mx * 24}px ${-my * 16}px`));
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

  /* ---------- effets souris ---------- */
  const tilt = (el) => {
    if (!finePointer || reduce) return;
    el.addEventListener("mousemove", (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(1000px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-8px)`; });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  };
  const magnetic = (el) => {
    if (!finePointer || reduce) return;
    el.addEventListener("mousemove", (e) => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  };
  $$(".magnetic").forEach(magnetic);

  /* ---------- infos du site ---------- */
  fetch("data/site.json" + bust).then((r) => r.json()).then((d) => {
    site = d;
    $$("[data-site]").forEach((el) => { const v = d[el.dataset.site]; if (v) el.textContent = v; });
    $$("[data-site-href]").forEach((el) => { const v = d[el.dataset.site]; if (v) el.href = el.dataset.siteHref + ":" + v.replace(/\s/g, ""); });
    $$("[data-split]").forEach(splitTitle);
    if (d.whatsapp) $("#wa").href = "https://wa.me/" + d.whatsapp;
    if (d.mapQuery || d.address) $("#map").src = "https://maps.google.com/maps?q=" + encodeURIComponent(d.mapQuery || d.address) + "&z=11&output=embed";
    $("#stats").innerHTML = (d.stats || []).map((s) => `<div class="stat reveal"><b data-to="${+s.value || 0}" data-suffix="${esc(s.suffix)}">0${esc(s.suffix)}</b><span>${esc(s.label)}</span></div>`).join("");
    $$(".stat").forEach((s) => countIO.observe(s)); observe($("#stats"));
    const g = d.gallery || [];
    $("#gallery").innerHTML = g.map((src, i) => `<a data-i="${i}" class="reveal"><img src="${esc(src)}" alt="SICAR SARL — photo ${i + 1}" loading="lazy"></a>`).join("");
    observe($("#gallery"));
    $$("#gallery a").forEach((a) => (a.onclick = () => openLb(+a.dataset.i)));
    onScroll();
  }).catch(console.error);

  /* ---------- produits ---------- */
  const grainHTML = (g) => { const m = String(g || "").match(/^(.*?)\s*(mm)$/i); return m ? `${esc(m[1])}<small>${esc(m[2])}</small>` : esc(g); };
  fetch("data/products.json" + bust).then((r) => r.json()).then((list) => {
    const box = $("#products");
    if (!list.length) { box.innerHTML = '<p class="muted">Aucun produit pour le moment.</p>'; return; }
    box.innerHTML = list.map((p) => `
      <article class="card reveal ${p.available === false ? "out" : ""}" data-cat="${esc(p.category)}">
        <div class="card-img">
          <img src="${esc(p.image || "assets/img/stock-sable.jpg")}" alt="${esc(p.name)}" loading="lazy">
          <span class="badge ${esc(p.category)}">${esc(p.category)}</span>
          ${p.available === false ? '<span class="stock">Rupture</span>' : ""}
          ${p.granulometrie ? `<span class="grain">${grainHTML(p.granulometrie)}</span>` : ""}
        </div>
        <div class="card-body">
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.description)}</p>
          <div class="tags">${(p.usages || []).map((u) => `<span>${esc(u)}</span>`).join("")}</div>
          <div class="card-foot">
            ${p.price ? `<span class="price">${esc(p.price)} <small>FCFA / ${esc(p.unit || "m³")}</small></span>` : '<span class="price price-quote">Prix sur devis</span>'}
            <a href="#contact" class="order" data-product="${esc(p.name)}" aria-label="Commander ${esc(p.name)}"><svg class="ic"><use href="#i-arrow"/></svg></a>
          </div>
        </div>
      </article>`).join("");
    observe(box); $$(".card", box).forEach(tilt);

    const opts = list.map((p) => `<option>${esc(p.name)}</option>`).join("") + "<option>Autre</option>";
    $("#quote-product").innerHTML = opts;
    $$("[data-product]").forEach((a) => a.addEventListener("click", () => ($("#quote-product").value = a.dataset.product)));

    const top = (list.filter((p) => p.featured).length ? list.filter((p) => p.featured) : list).slice(0, 4);
    $("#hero-products").innerHTML = top.map((p) => `<li>${esc(p.name.replace(/\s*\d.*$/, "") || p.name)}<span>${esc(p.granulometrie)}</span></li>`).join("");
    $("#foot-products").innerHTML = list.slice(0, 6).map((p) => `<a href="#produits">${esc(p.name)}</a>`).join("");
    const names = list.map((p) => `<span>${esc(p.name)}</span>`).join("");
    $("#ticker").innerHTML = names + names + names + names;

    const cats = new Set(list.map((p) => p.category));
    $$("#filters button").forEach((b) => { if (b.dataset.filter !== "all" && !cats.has(b.dataset.filter)) b.remove(); });
    movePill();
  }).catch(() => ($("#products").innerHTML = '<p class="muted">Impossible de charger les produits.</p>'));

  const pillBg = $(".pill-bg");
  const movePill = () => { const a = $("#filters button.active"); if (a) { pillBg.style.width = a.offsetWidth + "px"; pillBg.style.transform = `translateX(${a.offsetLeft}px)`; } };
  addEventListener("resize", movePill);
  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#filters button").forEach((x) => x.classList.toggle("active", x === b)); movePill();
    $$(".card").forEach((c) => {
      const show = b.dataset.filter === "all" || c.dataset.cat === b.dataset.filter;
      c.classList.toggle("hide", !show);
      if (show) { c.classList.remove("in"); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add("in"))); }
    });
  });

  /* ---------- lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("img", lb); let li = 0;
  const openLb = (i) => { const g = site.gallery || []; if (!g.length) return; li = (i + g.length) % g.length; lbImg.src = g[li]; $(".lb-count").textContent = `${String(li + 1).padStart(2, "0")} / ${String(g.length).padStart(2, "0")}`; lb.classList.add("open"); document.body.classList.add("lock"); };
  const closeLb = () => { lb.classList.remove("open"); document.body.classList.remove("lock"); };
  $(".lb-close").onclick = closeLb;
  $(".lb-prev").onclick = () => openLb(li - 1);
  $(".lb-next").onclick = () => openLb(li + 1);
  lb.onclick = (e) => { if (e.target === lb) closeLb(); };
  addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") openLb(li - 1);
    if (e.key === "ArrowRight") openLb(li + 1);
  });

  /* ---------- formulaire de devis ---------- */
  let via = "whatsapp";
  $$("#quote [data-via]").forEach((b) => b.addEventListener("click", () => (via = b.dataset.via)));
  $("#quote").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const txt = `Demande de devis — SICAR SARL\nNom : ${f.nom}\nTéléphone : ${f.tel}\nProduit : ${f.produit}\nQuantité : ${f.qte}\nLieu : ${f.lieu}\n\n${f.msg}`;
    if (via === "email") location.href = `mailto:${site.email}?subject=${encodeURIComponent("Demande de devis - " + f.produit)}&body=${encodeURIComponent(txt)}`;
    else open(`https://wa.me/${site.whatsapp}?text=${encodeURIComponent(txt)}`, "_blank");
  });
})();
