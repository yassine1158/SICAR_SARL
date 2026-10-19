(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- dépôt cible ---------- */
  const repo = { ...window.SICAR_REPO };
  if (location.hostname.endsWith(".github.io")) {
    repo.owner = location.hostname.split(".")[0];
    const seg = location.pathname.split("/").filter(Boolean)[0];
    repo.repo = seg && seg !== "admin" ? seg : location.hostname;
  }
  const API = () => `https://api.github.com/repos/${repo.owner}/${repo.repo}`;
  let token = localStorage.getItem("sicar_token") || sessionStorage.getItem("sicar_token") || "";

  /* ---------- état ---------- */
  let products = [], site = {}, sha = {};
  const pendingImages = {}; // chemin -> base64 (photos à publier)
  const sentImages = {}; // photos déjà publiées (aperçu en attendant la mise à jour de GitHub Pages)

  /* ---------- utilitaires ---------- */
  const toast = (msg, err) => { const t = $("#toast"); t.textContent = msg; t.className = "show" + (err ? " error" : ""); clearTimeout(t._h); t._h = setTimeout(() => (t.className = ""), 4500); };
  const busy = (msg) => { $("#busy").hidden = !msg; if (msg) $("#busy-msg").textContent = msg; };
  const b64encode = (str) => { const bytes = new TextEncoder().encode(str); let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin); };
  const b64decode = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "produit";
  const preview = (path) => { const b = pendingImages[path] || sentImages[path]; return b ? "data:image/jpeg;base64," + b : "../" + path; };

  async function gh(path, opts = {}) {
    const r = await fetch(API() + path, { ...opts, headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", ...(opts.headers || {}) } });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      const e = new Error(body.message || "Erreur " + r.status); e.status = r.status; throw e;
    }
    return r.status === 204 ? null : r.json();
  }
  async function readJSON(path) {
    const d = await gh(`/contents/${path}?ref=${repo.branch}&t=${Date.now()}`);
    sha[path] = d.sha; return JSON.parse(b64decode(d.content));
  }
  async function putFile(path, contentB64, message) {
    let cur = sha[path];
    if (cur === undefined) { try { cur = (await gh(`/contents/${path}?ref=${repo.branch}`)).sha; } catch (e) { if (e.status !== 404) throw e; } }
    const res = await gh(`/contents/${path}`, { method: "PUT", body: JSON.stringify({ message, content: contentB64, branch: repo.branch, ...(cur ? { sha: cur } : {}) }) });
    sha[path] = res.content.sha; return res;
  }
  const writeJSON = (path, data, msg) => putFile(path, b64encode(JSON.stringify(data, null, 2) + "\n"), msg);

  // Redimensionne une photo (max 1600px) et renvoie le JPEG en base64
  const resize = (file, max = 1600) => new Promise((ok, ko) => {
    const img = new Image(); img.onerror = ko;
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      ok(c.toDataURL("image/jpeg", .82).split(",")[1]); URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  });
  async function publishImages(paths) {
    for (const p of paths) if (pendingImages[p]) { busy("Envoi de la photo " + p.split("/").pop() + "…"); await putFile(p, pendingImages[p], "Ajout photo " + p.split("/").pop()); sentImages[p] = pendingImages[p]; delete pendingImages[p]; }
  }

  /* ---------- connexion ---------- */
  async function start() {
    busy("Connexion…");
    try {
      const info = await gh("");
      if (!info.permissions?.push) throw new Error("Ce jeton n'a pas le droit d'écriture sur le dépôt.");
      repo.branch = info.default_branch || repo.branch;
      [products, site] = await Promise.all([readJSON("data/products.json"), readJSON("data/site.json")]);
      $("#login").hidden = true; $("#app").hidden = false;
      renderProducts(); renderSettings(); renderGallery(); renderFaq();
    } catch (e) {
      $("#login").hidden = false; $("#app").hidden = true;
      $("#login-err").textContent = e.status === 401 ? "Jeton invalide ou expiré." : e.message;
      // on n'oublie le jeton que s'il est refusé par GitHub (pas sur une simple coupure réseau)
      if ([401, 403, 404].includes(e.status)) { localStorage.removeItem("sicar_token"); sessionStorage.removeItem("sicar_token"); }
      else if (!e.status) $("#login-err").textContent = "Connexion impossible. Vérifiez votre accès Internet puis réessayez.";
    } finally { busy(); }
  }
  $("#login-form").addEventListener("submit", (e) => {
    e.preventDefault(); token = $("#token").value.trim();
    ($("#remember").checked ? localStorage : sessionStorage).setItem("sicar_token", token);
    start();
  });
  $("#logout").onclick = () => { localStorage.removeItem("sicar_token"); sessionStorage.removeItem("sicar_token"); location.reload(); };
  if (token) start();

  /* ---------- onglets ---------- */
  $$(".tabs button").forEach((b) => (b.onclick = () => {
    $$(".tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".tab").forEach((t) => (t.hidden = t.id !== "tab-" + b.dataset.tab));
  }));
  let dirty = false;
  const markDirty = (v = true) => { dirty = v; $$("[id^=save-]").forEach((b) => b.classList.toggle("dirty", v)); };
  addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- produits ---------- */
  function renderProducts() {
    $("#count").textContent = `(${products.length})`;
    $("#list").innerHTML = products.map((p, i) => `
      <div class="item">
        <img src="${esc(preview(p.image))}" alt="">
        <div>
          <h4>${esc(p.name)}</h4>
          <div class="meta">
            <span class="pill">${esc(p.category)}</span>
            <span>${esc(p.granulometrie)}</span>
            <span>${p.price ? esc(p.price) + " FCFA / " + esc(p.unit) : "Prix sur devis"}</span>
            ${p.available === false ? '<span class="pill off">Rupture</span>' : ""}
          </div>
        </div>
        <div class="acts">
          <button class="btn-icon" data-act="up" data-i="${i}" title="Monter">↑</button>
          <button class="btn-icon" data-act="down" data-i="${i}" title="Descendre">↓</button>
          <a class="btn-icon" href="../produit.html?id=${encodeURIComponent(p.id)}" target="_blank" title="Voir la page du produit" style="display:grid;place-items:center;text-decoration:none;color:inherit">👁</a>
          <button class="btn-icon" data-act="edit" data-i="${i}" title="Modifier">✎</button>
          <button class="btn-icon" data-act="del" data-i="${i}" title="Supprimer">🗑</button>
        </div>
      </div>`).join("") || '<p>Aucun produit. Cliquez sur « Ajouter un produit ».</p>';
  }
  $("#list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const i = +b.dataset.i, act = b.dataset.act;
    if (act === "edit") return openForm(i);
    if (act === "del") { if (!confirm(`Supprimer « ${products[i].name} » ?`)) return; products.splice(i, 1); }
    if (act === "up" && i > 0) [products[i - 1], products[i]] = [products[i], products[i - 1]];
    if (act === "down" && i < products.length - 1) [products[i + 1], products[i]] = [products[i], products[i + 1]];
    renderProducts(); markDirty();
  });

  const uniqueId = (name, skip) => {
    const base = slug(name); let id = base, n = 2;
    while (products.some((p, i) => i !== skip && p.id === id)) id = `${base}-${n++}`;
    return id;
  };
  const dlg = $("#dlg"), pf = $("#pform"); let editing = -1, editImg = "";
  function openForm(i) {
    editing = i;
    const p = i >= 0 ? products[i] : { category: "gravier", unit: "tonne", available: true, usages: [], image: "assets/img/stock-sable.jpg" };
    $("#dlg-title").textContent = i >= 0 ? "Modifier le produit" : "Nouveau produit";
    for (const k of ["name", "category", "granulometrie", "price", "unit", "description"]) pf.elements[k].value = p[k] || "";
    pf.elements.usages.value = (p.usages || []).join(", ");
    pf.elements.available.checked = p.available !== false;
    pf.elements.featured.checked = !!p.featured;
    editImg = p.image; $("#pimg").src = preview(editImg);
    dlg.showModal();
  }
  $("#add").onclick = () => openForm(-1);
  $("#dlg-cancel").onclick = () => dlg.close();
  $("#pfile").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const name = slug(pf.elements.name.value || f.name.replace(/\.\w+$/, ""));
    editImg = `assets/img/produits/${name}-${Date.now().toString(36)}.jpg`;
    pendingImages[editImg] = await resize(f); $("#pimg").src = preview(editImg); e.target.value = "";
  };
  pf.addEventListener("submit", () => {
    const v = (k) => pf.elements[k].value.trim();
    const p = {
      // l'identifiant (adresse de la page produit) suit le nom du produit
      id: editing >= 0 && products[editing].name === v("name") ? products[editing].id : uniqueId(v("name"), editing),
      name: v("name"), category: v("category"), granulometrie: v("granulometrie"),
      description: v("description"), usages: v("usages").split(",").map((s) => s.trim()).filter(Boolean),
      price: v("price"), unit: v("unit"), image: editImg,
      available: pf.elements.available.checked, featured: pf.elements.featured.checked,
    };
    if (editing >= 0) products[editing] = p; else products.push(p);
    renderProducts(); markDirty(); toast("Produit enregistré. Cliquez sur « Publier » pour le mettre en ligne.");
  });
  $("#save-products").onclick = () => publish(async () => {
    await publishImages(products.map((p) => p.image));
    busy("Publication des produits…");
    await writeJSON("data/products.json", products, "Mise à jour des produits");
  });

  /* ---------- informations ---------- */
  const SF = ["tagline", "heroTitle", "heroText", "about", "phone", "whatsapp", "email", "address", "hours", "mapQuery", "wakilChatUrl"];
  function renderSettings() {
    const f = $("#settings"); SF.forEach((k) => (f.elements[k].value = site[k] || ""));
    $("#stats-edit").innerHTML = (site.stats || []).map((s, i) => `<div class="stat-row">
      <input data-s="${i}" data-k="value" type="number" value="${esc(s.value)}" title="Valeur">
      <input data-s="${i}" data-k="suffix" value="${esc(s.suffix)}" placeholder="+, %, h…" title="Suffixe">
      <input data-s="${i}" data-k="label" value="${esc(s.label)}" placeholder="Libellé"></div>`).join("");
  }
  $("#settings").addEventListener("input", () => markDirty());
  // site.json regroupe les onglets Informations, FAQ et Galerie : chaque publication reprend les trois
  async function saveSite(label, message) {
    const f = $("#settings"); SF.forEach((k) => (site[k] = f.elements[k].value.trim()));
    site.whatsapp = site.whatsapp.replace(/\D/g, "");
    $$("[data-s]").forEach((el) => { const s = site.stats[+el.dataset.s]; s[el.dataset.k] = el.dataset.k === "value" ? Number(el.value) || 0 : el.value; });
    site.faq = (site.faq || []).filter((x) => x.q.trim());
    await publishImages(site.gallery || []);
    busy(label);
    await writeJSON("data/site.json", site, message);
    renderFaq();
  }
  $("#save-settings").onclick = () => publish(() => saveSite("Publication des informations…", "Mise à jour des informations du site"));

  /* ---------- FAQ ---------- */
  function renderFaq() {
    const f = site.faq || (site.faq = []);
    $("#faq-edit").innerHTML = f.map((x, i) => `<div class="faq-item">
      <div class="fields">
        <label>Question<input data-f="${i}" data-k="q" value="${esc(x.q)}"></label>
        <label>Réponse<textarea data-f="${i}" data-k="a" rows="3">${esc(x.a)}</textarea></label>
      </div>
      <div class="acts">
        <button class="btn-icon" data-fa="up" data-i="${i}" title="Monter">↑</button>
        <button class="btn-icon" data-fa="down" data-i="${i}" title="Descendre">↓</button>
        <button class="btn-icon" data-fa="del" data-i="${i}" title="Supprimer">🗑</button>
      </div></div>`).join("") || "<p>Aucune question. La section FAQ est masquée sur le site.</p>";
  }
  $("#faq-edit").addEventListener("input", (e) => { const el = e.target; if (el.dataset.f !== undefined) { site.faq[+el.dataset.f][el.dataset.k] = el.value; markDirty(); } });
  $("#faq-edit").addEventListener("click", (e) => {
    const b = e.target.closest("[data-fa]"); if (!b) return;
    const f = site.faq, i = +b.dataset.i;
    if (b.dataset.fa === "del" && confirm("Supprimer cette question ?")) f.splice(i, 1);
    if (b.dataset.fa === "up" && i > 0) [f[i - 1], f[i]] = [f[i], f[i - 1]];
    if (b.dataset.fa === "down" && i < f.length - 1) [f[i + 1], f[i]] = [f[i], f[i + 1]];
    renderFaq(); markDirty();
  });
  $("#faq-add").onclick = () => { site.faq.push({ q: "", a: "" }); renderFaq(); markDirty(); $("#faq-edit .faq-item:last-child input").focus(); };
  $("#save-faq").onclick = () => publish(() => saveSite("Publication de la FAQ…", "Mise à jour de la FAQ"));

  /* ---------- galerie ---------- */
  function renderGallery() {
    const g = site.gallery || (site.gallery = []);
    $("#gal").innerHTML = g.map((src, i) => `<figure><img src="${esc(preview(src))}" alt="">
      <div class="acts"><button class="btn-icon" data-g="left" data-i="${i}">←</button><button class="btn-icon" data-g="right" data-i="${i}">→</button><button class="btn-icon" data-g="del" data-i="${i}">🗑</button></div></figure>`).join("");
  }
  $("#gal").addEventListener("click", (e) => {
    const b = e.target.closest("[data-g]"); if (!b) return;
    const g = site.gallery, i = +b.dataset.i;
    if (b.dataset.g === "del" && confirm("Retirer cette photo de la galerie ?")) g.splice(i, 1);
    if (b.dataset.g === "left" && i > 0) [g[i - 1], g[i]] = [g[i], g[i - 1]];
    if (b.dataset.g === "right" && i < g.length - 1) [g[i + 1], g[i]] = [g[i], g[i + 1]];
    renderGallery(); markDirty();
  });
  $("#gal-up").onchange = async (e) => {
    for (const f of e.target.files) {
      const path = `assets/img/galerie/${slug(f.name.replace(/\.\w+$/, ""))}-${Date.now().toString(36)}.jpg`;
      pendingImages[path] = await resize(f); site.gallery.push(path);
    }
    e.target.value = ""; renderGallery(); markDirty();
  };
  $("#save-gallery").onclick = () => publish(() => saveSite("Publication de la galerie…", "Mise à jour de la galerie"));

  /* ---------- publication ---------- */
  async function publish(fn) {
    try {
      await fn(); markDirty(false);
      toast("✅ Publié ! Le site sera à jour dans 1 à 2 minutes.");
      renderProducts(); renderGallery();
    } catch (e) {
      toast(e.status === 409 ? "Conflit : rechargez la page puis recommencez." : "Erreur : " + e.message, true);
    } finally { busy(); }
  }
})();
