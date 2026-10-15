(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const bust = "?v=" + Date.now(); // toujours la dernière version des données
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover:hover) and (pointer:fine)").matches;
  const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString("fr-FR");
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  let site = {}, products = [];

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

  /* ---------- toast ---------- */
  const toast = (html) => {
    const t = $("#toast"); t.innerHTML = `<i>✓</i><span>${html}</span>`; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3800);
  };

  /* ---------- verrouillage du défilement (menu, fiche, lightbox) ---------- */
  const locks = new Set();
  const lock = (k, on) => { on ? locks.add(k) : locks.delete(k); document.body.classList.toggle("lock", locks.size > 0); };

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
    header.classList.toggle("hide", y > 500 && y > lastY + 2 && !locks.size);
    if (y < lastY - 2) header.classList.remove("hide");
    lastY = y;
    prog.style.transform = `scaleX(${k})`;
    totop.classList.toggle("show", y > 700);
    totop.style.setProperty("--off", 113.1 * (1 - k));
    let cur = "";
    $$("section[id]").forEach((s) => { if (y >= s.offsetTop - 140) cur = s.id; });
    $$("#menu > a").forEach((a) => a.classList.toggle("current", a.getAttribute("href") === "#" + cur));
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
  const toggleMenu = (open) => { burger.classList.toggle("open", open); menu.classList.toggle("open", open); lock("menu", open); };
  burger.onclick = () => toggleMenu(!menu.classList.contains("open"));
  $$("#menu a").forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

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

  /* ---------- effets souris ---------- */
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

    // curseur personnalisé
    document.documentElement.classList.add("has-cursor");
    const cur = $("#cursor"), dot = $(".c-dot"), ring = $(".c-ring"), label = $("em", ring);
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; cur.classList.remove("hidden"); });
    document.addEventListener("mouseleave", () => cur.classList.add("hidden"));
    addEventListener("mouseover", (e) => {
      const v = e.target.closest("[data-cursor]"), l = e.target.closest("a,button,summary,label,select");
      cur.classList.toggle("view", !!v); cur.classList.toggle("link", !v && !!l);
      if (v) label.textContent = v.dataset.cursor;
    });
    (function loop() {
      rx += (x - rx) * .18; ry += (y - ry) * .18;
      dot.style.transform = `translate(${x}px,${y}px)`; ring.style.transform = `translate(${rx}px,${ry}px)`;
      requestAnimationFrame(loop);
    })();

    // image flottante sur les secteurs
    const fl = $("#sector-float"), flImg = $("img", fl); let fx = 0, fy = 0, tx = 0, ty = 0, flOn = false;
    $$(".sector").forEach((s) => {
      s.addEventListener("mouseenter", () => { flImg.src = s.dataset.img; fl.classList.add("on"); flOn = true; });
      s.addEventListener("mouseleave", () => { fl.classList.remove("on"); flOn = false; });
    });
    $("#sectors").addEventListener("mousemove", (e) => { tx = e.clientX; ty = e.clientY; });
    (function floatLoop() {
      if (flOn || fl.classList.contains("on")) { fx += (tx - fx) * .12; fy += (ty - fy) * .12; fl.style.translate = `${fx}px ${fy}px`; fl.style.rotate = `${(tx - fx) * .04}deg`; }
      requestAnimationFrame(floatLoop);
    })();
  }

  /* =========================================================
     Demande de devis (liste de produits)
     ========================================================= */
  let basket = store.get("sicar_devis", []);
  const unitOf = (name) => (products.find((p) => p.name === name) || {}).unit || "m³";
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
    $("#q-clear").hidden = !n;
    $("#q-list").innerHTML = basket.map((b, i) => `<li><b>${esc(b.name)}</b>
      <span class="qty"><input type="number" min="0.1" step="0.1" value="${b.qty}" data-i="${i}" aria-label="Quantité ${esc(b.name)}"><span>${esc(unitOf(b.name))}</span></span>
      <button type="button" class="rm" data-i="${i}" aria-label="Retirer"><svg class="ic"><use href="#i-x"/></svg></button></li>`).join("");
    $$(".card").forEach((c) => c.querySelector(".card-add")?.classList.toggle("added", basket.some((b) => b.name === c.dataset.name)));
  }
  $("#q-list").addEventListener("input", (e) => { if (e.target.dataset.i) { basket[+e.target.dataset.i].qty = +e.target.value || 0; store.set("sicar_devis", basket); } });
  $("#q-list").addEventListener("click", (e) => { const b = e.target.closest(".rm"); if (b) { basket.splice(+b.dataset.i, 1); saveBasket(); } });
  $("#q-clear").onclick = () => { basket = []; saveBasket(); };
  $("#q-add").onclick = () => { const name = $("#q-product").value; if (name) addToBasket(name, $("#q-qty").value); };
  $("#basket-btn").onclick = () => $("#contact").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  renderBasket();

  /* ---------- formulaire ---------- */
  let via = "whatsapp";
  $$("#quote [data-via]").forEach((b) => b.addEventListener("click", () => (via = b.dataset.via)));
  $("#quote").addEventListener("submit", (e) => {
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

  /* =========================================================
     Données du site
     ========================================================= */
  fetch("data/site.json" + bust).then((r) => r.json()).then((d) => {
    site = d;
    $$("[data-site]").forEach((el) => { const v = d[el.dataset.site]; if (v) el.textContent = v; });
    $$("[data-site-href]").forEach((el) => { const v = d[el.dataset.site]; if (v) el.href = el.dataset.siteHref + ":" + v.replace(/\s/g, ""); });
    $$("[data-split]").forEach(splitTitle);
    if (d.whatsapp) { $("#wa").href = "https://wa.me/" + d.whatsapp; $("#faq-wa").href = "https://wa.me/" + d.whatsapp; }
    if (d.mapQuery || d.address) $("#map").src = "https://maps.google.com/maps?q=" + encodeURIComponent(d.mapQuery || d.address) + "&z=11&output=embed";

    $("#stats").innerHTML = (d.stats || []).map((s) => `<div class="stat reveal"><b data-to="${+s.value || 0}" data-suffix="${esc(s.suffix)}">0${esc(s.suffix)}</b><span>${esc(s.label)}</span></div>`).join("");
    $$(".stat").forEach((s) => countIO.observe(s)); observe($("#stats"));

    const g = d.gallery || [];
    $("#gallery").innerHTML = g.map((src, i) => `<a data-i="${i}" class="reveal" data-cursor="Voir"><img src="${esc(src)}" alt="SICAR SARL — photo ${i + 1}" loading="lazy"></a>`).join("");
    observe($("#gallery"));
    $$("#gallery a").forEach((a) => (a.onclick = () => openLb(+a.dataset.i)));

    renderFaq(d.faq || []);
    seo(d);
    onScroll();
  }).catch(console.error);

  /* ---------- FAQ (animation d'ouverture) ---------- */
  function renderFaq(list) {
    const box = $("#faq-list");
    if (!list.length) { $("#faq").hidden = true; return; }
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

  /* ---------- données structurées (référencement Google) ---------- */
  function seo(d) {
    const s = document.createElement("script"); s.type = "application/ld+json";
    s.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "LocalBusiness", name: d.company || "SICAR SARL",
      description: d.heroText, telephone: d.phone, email: d.email, image: new URL("assets/img/station-concassage.jpg", location.href).href,
      address: { "@type": "PostalAddress", streetAddress: d.address, addressCountry: "CI" }, openingHours: d.hours, url: location.href.split("#")[0],
    });
    document.head.appendChild(s);
  }

  /* =========================================================
     Produits
     ========================================================= */
  const grainHTML = (g) => { const m = String(g || "").match(/^(.*?)\s*(mm)$/i); return m ? `${esc(m[1])}<small>${esc(m[2])}</small>` : esc(g); };
  fetch("data/products.json" + bust).then((r) => r.json()).then((list) => {
    products = list;
    const box = $("#products");
    if (!list.length) { box.innerHTML = '<p class="muted">Aucun produit pour le moment.</p>'; return; }
    box.innerHTML = list.map((p, i) => `
      <article class="card reveal ${p.available === false ? "out" : ""}" data-cat="${esc(p.category)}" data-i="${i}" data-name="${esc(p.name)}" data-cursor="Fiche" tabindex="0">
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
      </article>`).join("");
    observe(box); $$(".card", box).forEach(tilt);
    box.addEventListener("click", (e) => {
      const c = e.target.closest(".card"); if (!c) return;
      const p = products[+c.dataset.i];
      if (e.target.closest(".card-add")) { addToBasket(p.name, 10); toast(`${esc(p.name)} ajouté à votre devis. <a href="#contact">Voir</a>`); }
      else openProduct(p);
    });
    box.addEventListener("keydown", (e) => { const c = e.target.closest(".card"); if (c && e.key === "Enter") openProduct(products[+c.dataset.i]); });

    $("#q-product").innerHTML = list.map((p) => `<option>${esc(p.name)}</option>`).join("");
    const top = (list.filter((p) => p.featured).length ? list.filter((p) => p.featured) : list).slice(0, 4);
    $("#hero-products").innerHTML = top.map((p) => `<li>${esc(p.name.replace(/\s*[\d>].*$/, "") || p.name)}<span>${esc(p.granulometrie)}</span></li>`).join("");
    $("#foot-products").innerHTML = list.slice(0, 6).map((p) => `<a href="#produits">${esc(p.name)}</a>`).join("");
    const names = list.map((p) => `<span>${esc(p.name)}</span>`).join("");
    $("#ticker").innerHTML = names + names + names + names;

    const cats = new Set(list.map((p) => p.category));
    $$("#filters button").forEach((b) => { if (b.dataset.filter !== "all" && !cats.has(b.dataset.filter)) b.remove(); });
    movePill(); renderBasket(); calc();
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

  /* ---------- fiche produit ---------- */
  const pm = $("#pmodal"); let pmProduct = null, pmReturn = null;
  function openProduct(p) {
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
    setTimeout(() => $(".pm-close", pm).focus(), 50);
  }
  const closeProduct = () => { pm.classList.remove("open"); pm.setAttribute("aria-hidden", "true"); lock("pm", false); pmReturn?.focus?.(); };
  $$("[data-close]", pm).forEach((b) => (b.onclick = closeProduct));
  $("#pm-add").onclick = () => { addToBasket(pmProduct.name, $("#pm-qty").value); closeProduct(); toast(`${esc(pmProduct.name)} ajouté à votre devis. <a href="#contact">Voir</a>`); };

  /* ---------- calculateur ---------- */
  let mode = "beton";
  const calcForm = $("#calc");
  $$("#calc-mode button").forEach((b) => (b.onclick = () => { mode = b.dataset.mode; $$("#calc-mode button").forEach((x) => x.classList.toggle("on", x === b)); calcForm.elements.H.value = mode === "beton" ? 15 : 30; calc(); }));
  calcForm.addEventListener("input", (e) => { if (e.target.name) calc(); });
  let calcRows = [];
  function calc() {
    const v = (k) => Math.max(0, parseFloat(calcForm.elements[k].value) || 0);
    const vol = v("L") * v("W") * v("H") / 100;
    $("#calc-vol").textContent = fmt(vol) + " m³";
    const by = (cats) => products.filter((p) => cats.includes(p.category));
    const pick = (list, re) => (list.find((p) => re.test(p.name)) || list[0] || {}).name;
    const prev = Object.fromEntries($$("#calc-res select").map((s) => [s.dataset.role, s.value]));
    if (mode === "beton") {
      calcRows = [
        { role: "sable", label: "Sable", list: by(["sable"]), qty: vol * 0.4 },
        { role: "gravier", label: "Gravier", list: by(["gravier"]), qty: vol * 0.8 },
      ];
    } else {
      calcRows = [{ role: "remblai", label: "Granulat", list: by(["gravier", "roche", "sable"]), qty: vol * 1.25 }];
    }
    calcRows = calcRows.filter((r) => r.list.length);
    $("#calc-res").innerHTML = calcRows.map((r) => {
      const sel = prev[r.role] || pick(r.list, r.role === "remblai" ? /tout|venant/i : /./);
      return `<div class="res-row"><div><small>${r.label}</small><select data-role="${r.role}">${r.list.map((p) => `<option ${p.name === sel ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></div><b>${fmt(r.qty)} <small>m³</small></b></div>`;
    }).join("") || '<p class="muted">Les produits seront bientôt disponibles.</p>';
  }
  $("#calc-add").onclick = () => {
    const sels = $$("#calc-res select"); let n = 0;
    sels.forEach((s, i) => { if (calcRows[i].qty > 0) { addToBasket(s.value, calcRows[i].qty); n++; } });
    if (n) toast(`${n} produit${n > 1 ? "s" : ""} ajouté${n > 1 ? "s" : ""} à votre devis. <a href="#contact">Voir</a>`);
  };

  /* ---------- lightbox ---------- */
  const lb = $("#lightbox"), lbImg = $("img", lb); let li = 0;
  const openLb = (i) => { const g = site.gallery || []; if (!g.length) return; li = (i + g.length) % g.length; lbImg.src = g[li]; $(".lb-count").textContent = `${String(li + 1).padStart(2, "0")} / ${String(g.length).padStart(2, "0")}`; lb.classList.add("open"); lock("lb", true); };
  const closeLb = () => { lb.classList.remove("open"); lock("lb", false); };
  $(".lb-close").onclick = closeLb;
  $(".lb-prev").onclick = () => openLb(li - 1);
  $(".lb-next").onclick = () => openLb(li + 1);
  lb.onclick = (e) => { if (e.target === lb) closeLb(); };

  addEventListener("keydown", (e) => {
    if (e.key === "Escape") { if (pm.classList.contains("open")) closeProduct(); if (lb.classList.contains("open")) closeLb(); if (menu.classList.contains("open")) toggleMenu(false); }
    if (!lb.classList.contains("open")) return;
    if (e.key === "ArrowLeft") openLb(li - 1);
    if (e.key === "ArrowRight") openLb(li + 1);
  });
  // liens « Voir » dans les notifications
  document.addEventListener("click", (e) => { if (e.target.closest("#toast a")) $("#toast").classList.remove("show"); });
})();
