(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const bust = "?v=" + Date.now(); // toujours la dernière version des données
  let site = {};

  window.addEventListener("load", () => document.body.classList.add("loaded"));
  setTimeout(() => document.body.classList.add("loaded"), 3500);
  $("#year").textContent = new Date().getFullYear();

  /* ---------- header / menu ---------- */
  const header = $("#header"), totop = $("#totop");
  const onScroll = () => {
    header.classList.toggle("scrolled", scrollY > 60);
    totop.classList.toggle("show", scrollY > 600);
    let cur = "";
    $$("section[id]").forEach((s) => { if (scrollY >= s.offsetTop - 120) cur = s.id; });
    $$("#menu a").forEach((a) => a.classList.toggle("current", a.getAttribute("href") === "#" + cur));
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
  totop.onclick = () => scrollTo({ top: 0 });
  const burger = $("#burger"), menu = $("#menu");
  burger.onclick = () => { burger.classList.toggle("open"); menu.classList.toggle("open"); };
  $$("#menu a").forEach((a) => (a.onclick = () => { burger.classList.remove("open"); menu.classList.remove("open"); }));

  /* ---------- hero slideshow ---------- */
  const slides = $$(".slide"); let si = 0;
  setInterval(() => { slides[si].classList.remove("active"); si = (si + 1) % slides.length; slides[si].classList.add("active"); }, 6000);

  /* ---------- dust particles ---------- */
  const cv = $("#dust"), ctx = cv.getContext("2d"); let parts = [];
  const size = () => { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; };
  size(); addEventListener("resize", size);
  for (let i = 0; i < 70; i++) parts.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, r: Math.random() * 2.2 + .4, vx: Math.random() * .5 + .1, vy: -(Math.random() * .3), a: Math.random() * .5 + .1 });
  (function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy;
      if (p.x > cv.width) p.x = 0; if (p.y < 0) p.y = cv.height;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = `rgba(245,235,220,${p.a})`; ctx.fill();
    }
    requestAnimationFrame(draw);
  })();

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .15 });
  const observe = (root = document) => $$(".reveal,.reveal-left,.reveal-right", root).forEach((el, i) => { el.style.transitionDelay = (i % 4) * 0.1 + "s"; io.observe(el); });
  observe();

  /* ---------- counters ---------- */
  const countIO = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; countIO.unobserve(e.target);
    const b = e.target.querySelector("b"), end = +b.dataset.to, suf = b.dataset.suffix || ""; const t0 = performance.now();
    const step = (t) => { const k = Math.min((t - t0) / 1600, 1); b.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: .5 });

  /* ---------- 3D tilt ---------- */
  const tilt = (el) => {
    if (matchMedia("(hover:none)").matches) return;
    el.addEventListener("mousemove", (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) translateY(-6px)`; });
    el.addEventListener("mouseleave", () => (el.style.transform = ""));
  };

  /* ---------- site data ---------- */
  fetch("data/site.json" + bust).then((r) => r.json()).then((d) => {
    site = d;
    $$("[data-site]").forEach((el) => { const v = d[el.dataset.site]; if (v) el.textContent = v; });
    $$("[data-site-href]").forEach((el) => { const v = d[el.dataset.site]; if (v) el.href = el.dataset.siteHref + ":" + v.replace(/\s/g, ""); });
    if (d.whatsapp) $("#wa").href = "https://wa.me/" + d.whatsapp;
    $("#stats").innerHTML = (d.stats || []).map((s) => `<div class="stat reveal"><b data-to="${+s.value || 0}" data-suffix="${esc(s.suffix)}">0</b><span>${esc(s.label)}</span></div>`).join("");
    $$(".stat").forEach((s) => countIO.observe(s)); observe($("#stats"));
    const g = d.gallery || [];
    $("#gallery").innerHTML = g.map((src, i) => `<a data-i="${i}" class="reveal"><img src="${esc(src)}" alt="SICAR SARL ${i + 1}" loading="lazy"></a>`).join("");
    observe($("#gallery"));
    $$("#gallery a").forEach((a) => (a.onclick = () => openLb(+a.dataset.i)));
  }).catch(console.error);

  /* ---------- products ---------- */
  fetch("data/products.json" + bust).then((r) => r.json()).then((list) => {
    const box = $("#products");
    if (!list.length) { box.innerHTML = '<p class="muted">Aucun produit pour le moment.</p>'; return; }
    box.innerHTML = list.map((p) => `
      <article class="card reveal ${p.available === false ? "out" : ""}" data-cat="${esc(p.category)}">
        <div class="card-img">
          <img src="${esc(p.image || "assets/img/stock-sable.jpg")}" alt="${esc(p.name)}" loading="lazy">
          <span class="badge ${esc(p.category)}">${esc(p.category)}</span>
          ${p.granulometrie ? `<span class="grain">${esc(p.granulometrie)}</span>` : ""}
        </div>
        <div class="card-body">
          <h3>${esc(p.name)}</h3>
          <p>${esc(p.description)}</p>
          <div class="tags">${(p.usages || []).map((u) => `<span>${esc(u)}</span>`).join("")}</div>
          <div class="card-foot">
            <span class="price">${p.price ? `${esc(p.price)} <small>FCFA / ${esc(p.unit || "m³")}</small>` : "Prix sur devis"}</span>
            <a href="#contact" data-product="${esc(p.name)}">Commander →</a>
          </div>
        </div>
      </article>`).join("");
    observe(box); $$(".card", box).forEach(tilt);
    $("#quote-product").innerHTML = list.map((p) => `<option>${esc(p.name)}</option>`).join("") + "<option>Autre</option>";
    $$("[data-product]").forEach((a) => a.addEventListener("click", () => ($("#quote-product").value = a.dataset.product)));
    // n'afficher que les filtres utiles
    const cats = new Set(list.map((p) => p.category));
    $$("#filters button").forEach((b) => { if (b.dataset.filter !== "all" && !cats.has(b.dataset.filter)) b.remove(); });
  }).catch(() => ($("#products").innerHTML = '<p class="muted">Impossible de charger les produits.</p>'));

  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    $$("#filters button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".card").forEach((c) => {
      const show = b.dataset.filter === "all" || c.dataset.cat === b.dataset.filter;
      c.classList.toggle("hide", !show);
      if (show) { c.classList.remove("in"); requestAnimationFrame(() => requestAnimationFrame(() => c.classList.add("in"))); }
    });
  });

  /* ---------- lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("img", lb); let li = 0;
  const openLb = (i) => { const g = site.gallery || []; li = (i + g.length) % g.length; lbImg.src = g[li]; lb.classList.add("open"); };
  $(".lb-close").onclick = () => lb.classList.remove("open");
  $(".lb-prev").onclick = () => openLb(li - 1);
  $(".lb-next").onclick = () => openLb(li + 1);
  lb.onclick = (e) => { if (e.target === lb) lb.classList.remove("open"); };
  addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") lb.classList.remove("open");
    if (e.key === "ArrowLeft") openLb(li - 1);
    if (e.key === "ArrowRight") openLb(li + 1);
  });

  /* ---------- quote form ---------- */
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
