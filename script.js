/* =========================================================
   MHD SHOP V5 — SCRIPT
   ========================================================= */

const SUPABASE_URL = "https://oabjxsclanvgmvnezabj.supabase.co";
const SUPABASE_KEY = "sb_publishable_Wccb86Hdfbxwx1tj0ciPDg_aRv8yqje";

const { createClient } = window.supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const WHATSAPP = "221787488199";

const demoProducts = [
  { id: "demo-1", name: "Pack Gaming Premium", category: "Gaming", price: 5000, image: "", available: true },
  { id: "demo-2", name: "Service Digital", category: "Digital", price: 3000, image: "", available: true },
  { id: "demo-3", name: "Carte Cadeau", category: "Cartes", price: 10000, image: "", available: true }
];

let products = [];
let cart = JSON.parse(localStorage.getItem("mhd_cart") || "[]");
let selectedCategory = "Tous";
let currentUser = null;
let currentProfile = null;
let isAdmin = false;
let verifiedPhone = false;
let pendingPhone = "";
let editingImage = "";
let orders = [];

/* ---------- HELPERS ---------- */

const $ = (id) => document.getElementById(id);

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function money(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function saveCart() {
  localStorage.setItem("mhd_cart", JSON.stringify(cart));
  renderCartCount();
}

function cartCount() {
  return cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
}

function cartTotal() {
  return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const page = $(id);
  if (page) page.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
  closeAI();
  if (id === "compte") renderAccount();
  if (id === "admin") openAdmin();
}

function imageHTML(product, cls = "product-image") {
  if (product.image) {
    return `<div class="${cls}"><img src="${esc(product.image)}" alt="${esc(product.name)}"></div>`;
  }
  return `<div class="${cls}">🎮</div>`;
}

/* ---------- NAVIGATION ---------- */

document.addEventListener("click", (e) => {
  const go = e.target.closest("[data-go]");
  if (!go) return;
  e.preventDefault();
  showPage(go.dataset.go);
});

$("adminOpen")?.addEventListener("click", (e) => {
  e.preventDefault();
  showPage("admin");
});

$("adminExit")?.addEventListener("click", () => showPage("accueil"));

/* ---------- PRODUCTS ---------- */

async function loadProducts() {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    products = data || [];

    if (!products.length) {
      products = [...demoProducts];
    }
  } catch (err) {
    console.warn("Products:", err.message);
    products = [...demoProducts];
  }

  renderCategories();
  renderProducts();
  renderHomeProducts();
  renderAdminProducts();
  syncCartWithProducts();
}

function renderHomeProducts() {
  const box = $("homeProducts");
  if (!box) return;

  const list = products.filter(p => p.available !== false).slice(0, 4);

  box.innerHTML = list.length
    ? list.map(productCard).join("")
    : `<div class="panel">Aucun produit disponible pour le moment.</div>`;
}

function productCard(p) {
  const available = p.available !== false;

  return `
    <article class="card">
      ${imageHTML(p)}
      <h3>${esc(p.name)}</h3>
      <div class="price">${money(p.price)}</div>
      <div class="${available ? "available" : "unavailable"}">
        ${available ? "● Disponible" : "● Indisponible"}
      </div>
      <div style="height:9px"></div>
      <button class="primary" ${available ? "" : "disabled"} data-add="${esc(p.id)}">
        ${available ? "🛒 Ajouter" : "Indisponible"}
      </button>
    </article>
  `;
}

function renderProducts() {
  const box = $("products");
  if (!box) return;

  const search = ($("search")?.value || "").trim().toLowerCase();

  const list = products.filter(p => {
    const categoryOk = selectedCategory === "Tous" || p.category === selectedCategory;
    const searchOk =
      !search ||
      String(p.name).toLowerCase().includes(search) ||
      String(p.category).toLowerCase().includes(search);
    return categoryOk && searchOk;
  });

  box.innerHTML = list.length
    ? list.map(productCard).join("")
    : `<div class="panel">Aucun produit trouvé.</div>`;
}

function renderCategories() {
  const box = $("categories");
  if (!box) return;

  const categories = ["Tous", ...new Set(products.map(p => p.category).filter(Boolean))];

  box.innerHTML = categories.map(c => `
    <button class="chip" data-category="${esc(c)}"
      style="${selectedCategory === c ? "background:#087cff;color:#fff" : ""}">
      ${esc(c)}
    </button>
  `).join("");
}

document.addEventListener("click", (e) => {
  const add = e.target.closest("[data-add]");
  if (add) {
    addToCart(add.dataset.add);
    return;
  }

  const category = e.target.closest("[data-category]");
  if (category) {
    selectedCategory = category.dataset.category;
    renderCategories();
    renderProducts();
  }
});

$("search")?.addEventListener("input", renderProducts);

function findProduct(id) {
  return products.find(p => String(p.id) === String(id));
}

function addToCart(id) {
  const product = findProduct(id);
  if (!product || product.available === false) return;

  const existing = cart.find(i => String(i.id) === String(id));

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      image: product.image || "",
      qty: 1
    });
  }

  saveCart();
  renderCart();

  const button = document.querySelector(`[data-add="${CSS.escape(String(id))}"]`);
  if (button) {
    const old = button.textContent;
    button.textContent = "✅ Ajouté";
    setTimeout(() => button.textContent = old, 900);
  }
}

function syncCartWithProducts() {
  cart = cart.map(item => {
    const p = findProduct(item.id);
    if (!p) return item;
    return {
      ...item,
      name: p.name,
      price: Number(p.price),
      image: p.image || ""
    };
  }).filter(item => item.qty > 0);

  saveCart();
  renderCart();
}

function renderCartCount() {
  if ($("cartCount")) $("cartCount").textContent = cartCount();
}

function renderCart() {
  const box = $("cart");
  if (!box) return;

  if (!cart.length) {
    box.innerHTML = `
      <div class="panel">
        <h3>Ton panier est vide 🛒</h3>
        <p style="color:var(--muted)">Ajoute des produits depuis la boutique.</p>
        <button class="primary full" data-go="boutique">🛍️ Aller à la boutique</button>
      </div>
    `;
    return;
  }

  box.innerHTML = `
    ${cart.map(item => `
      <div class="cart-item">
        <div class="cart-thumb">
          ${item.image ? `<img src="${esc(item.image)}" alt="">` : "🎮"}
        </div>
        <div class="grow">
          <b>${esc(item.name)}</b>
          <div style="color:var(--red);font-weight:900;margin-top:4px">${money(item.price)}</div>
          <div class="qty" style="margin-top:7px">
            <button data-qty="${esc(item.id)}" data-delta="-1">−</button>
            <b>${item.qty}</b>
            <button data-qty="${esc(item.id)}" data-delta="1">+</button>
          </div>
        </div>
        <button class="danger" data-remove="${esc(item.id)}">✕</button>
      </div>
    `).join("")}

    <div class="cart-summary">
      <div class="cart-total">
        <span>Total</span>
        <strong>${money(cartTotal())}</strong>
      </div>
      <button class="primary full" id="goCheckout">📦 Passer la commande</button>
      <div style="height:8px"></div>
      <button class="ghost full" id="clearCart">🗑️ Vider le panier</button>
    </div>
  `;
}

document.addEventListener("click", (e) => {
  const qty = e.target.closest("[data-qty]");
  if (qty) {
    const item = cart.find(i => String(i.id) === String(qty.dataset.qty));
    if (!item) return;
    item.qty += Number(qty.dataset.delta);
    if (item.qty <= 0) cart = cart.filter(i => String(i.id) !== String(item.id));
    saveCart();
    renderCart();
    return;
  }

  const remove = e.target.closest("[data-remove]");
  if (remove) {
    cart = cart.filter(i => String(i.id) !== String(remove.dataset.remove));
    saveCart();
    renderCart();
    return;
  }

  if (e.target.closest("#goCheckout")) {
    if (!currentUser) {
      showPage("compte");
      toast("Connecte-toi avant de finaliser ta commande.");
      return;
    }
    showPage("commande");
    prefillOrder();
  }

  if (e.target.closest("#clearCart")) {
    cart = [];
    saveCart();
    renderCart();
  }
});

/* ---------- AUTH ---------- */

async function getSession() {
  const { data } = await supabase.auth.getSession();
  currentUser = data.session?.user || null;
  await loadProfile();
  await checkAdmin();
  renderAccount();
  prefillOrder();
}

async function loadProfile() {
  currentProfile = null;
  if (!currentUser) return;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (!error) currentProfile = data || null;

  if (currentProfile?.phone && currentProfile.phone_verified) {
    verifiedPhone = true;
    pendingPhone = currentProfile.phone;
  }
}

async function checkAdmin() {
  isAdmin = false;
  if (!currentUser) return;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .maybeSingle();

  isAdmin = data?.role === "admin";

  const adminButton = $("adminOpen");
  if (adminButton) adminButton.style.display = isAdmin ? "flex" : "none";
}

function renderAccount() {
  const box = $("authPanel");
  if (!box) return;

  if (!currentUser) {
    box.innerHTML = `
      <h2>Connexion</h2>
      <p style="color:var(--muted)">Connecte-toi pour enregistrer ton profil et tes commandes.</p>

      <label>Email</label>
      <input id="emailLogin" type="email" placeholder="ton@email.com">

      <label>Mot de passe</label>
      <input id="emailPassword" type="password" placeholder="••••••••">

      <button class="primary full" id="emailLoginBtn">🔐 Se connecter</button>
      <div style="height:8px"></div>
      <button class="secondary full" id="emailSignup">✨ Créer mon compte</button>

      <div style="height:15px"></div>
      <button class="ghost full" id="googleLogin">🇬 Connexion avec Google</button>
      <div style="height:8px"></div>
      <button class="ghost full" id="appleLogin"> Continuer avec Apple</button>

      <div class="account-contact">
        <h3>💬 Support vendeur</h3>
        <p style="color:var(--muted)">Pour les informations et l'aide :</p>
        <a class="contact-number" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">
          +221 78 748 81 99
        </a>
        <button class="secondary full" id="supportWhatsApp">💬 Ouvrir WhatsApp</button>
      </div>
    `;
    return;
  }

  const first = currentProfile?.first_name || currentUser.user_metadata?.first_name || "";
  const last = currentProfile?.last_name || currentUser.user_metadata?.last_name || "";

  box.innerHTML = `
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
      <div>
        <small style="color:var(--blue2);font-weight:900">COMPTE CONNECTÉ</small>
        <h2 style="margin:5px 0">${esc(first || currentUser.email?.split("@")[0] || "Client")}</h2>
      </div>
      <div style="font-size:30px">👤</div>
    </div>

    <label>Prénom</label>
    <input id="profileFirst" value="${esc(first)}" placeholder="Prénom">

    <label>Nom</label>
    <input id="profileLast" value="${esc(last)}" placeholder="Nom">

    <label>Téléphone</label>
    <input id="profilePhone" type="tel" value="${esc(currentProfile?.phone || "")}" placeholder="+221 77 000 00 00">

    <div class="status-box ${verifiedPhone ? "ok" : ""}" id="profilePhoneStatus">
      ${verifiedPhone ? "✅ Numéro vérifié et enregistré." : "⚠️ Ton numéro n'est pas encore vérifié."}
    </div>

    <button class="secondary full" id="profileVerify">📲 Vérifier mon numéro</button>
    <div style="height:8px"></div>
    <button class="primary full" id="saveProfile">💾 Enregistrer mon profil</button>
    <div style="height:8px"></div>
    <button class="ghost full" id="logout">🚪 Se déconnecter</button>

    <div class="account-contact">
      <h3>💬 Support vendeur</h3>
      <p style="color:var(--muted)">Informations, aide et commandes :</p>
      <a class="contact-number" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">
        +221 78 748 81 99
      </a>
      <button class="secondary full" id="supportWhatsApp">💬 Contacter le vendeur</button>
    </div>

    <div class="theme-box">
      <div class="theme-title">🎨 Apparence</div>
      <div class="theme-description">Passe entre l'interface sombre gaming et la version claire.</div>
      <button class="theme-toggle" id="themeToggle">Changer le thème</button>
    </div>

    ${isAdmin ? `
      <div class="theme-box">
        <div class="theme-title">⚙️ Administration</div>
        <div class="theme-description">Ton compte possède les droits administrateur.</div>
        <button class="primary full" data-go="admin">Ouvrir Admin</button>
      </div>
    ` : ""}
  `;
}

document.addEventListener("click", async (e) => {
  if (e.target.closest("#emailLoginBtn")) {
    const email = $("emailLogin")?.value.trim();
    const password = $("emailPassword")?.value;

    if (!email || !password) {
      toast("Entre ton email et ton mot de passe.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast(error.message);
    } else {
      toast("Connexion réussie ✅");
      await getSession();
      showPage("accueil");
    }
  }

  if (e.target.closest("#emailSignup")) {
    const email = $("emailLogin")?.value.trim();
    const password = $("emailPassword")?.value;

    if (!email || !password || password.length < 6) {
      toast("Entre un email et un mot de passe d'au moins 6 caractères.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: location.origin + location.pathname
      }
    });

    if (error) toast(error.message);
    else toast("Compte créé. Vérifie ton email si Supabase le demande.");
  }

  if (e.target.closest("#googleLogin")) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.href }
    });
    if (error) toast(error.message);
  }

  if (e.target.closest("#appleLogin")) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: location.href }
    });
    if (error) toast(error.message);
  }

  if (e.target.closest("#logout")) {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    isAdmin = false;
    verifiedPhone = false;
    renderAccount();
    toast("Tu es déconnecté.");
    showPage("accueil");
  }

  if (e.target.closest("#saveProfile")) {
    await saveProfile();
  }

  if (e.target.closest("#profileVerify")) {
    await startPhoneVerification($("profilePhone")?.value.trim());
  }

  if (e.target.closest("#supportWhatsApp")) {
    openWhatsApp("Bonjour MHD SHOP, j'ai besoin d'informations.");
  }

  if (e.target.closest("#themeToggle")) {
    toggleTheme();
  }
});

async function saveProfile() {
  if (!currentUser) return;

  const first_name = $("profileFirst")?.value.trim() || "";
  const last_name = $("profileLast")?.value.trim() || "";
  const phone = $("profilePhone")?.value.trim() || "";

  const { error } = await supabase
    .from("profiles")
    .upsert({
      id: currentUser.id,
      first_name,
      last_name,
      phone: verifiedPhone ? phone : (currentProfile?.phone || null),
      phone_verified: verifiedPhone
    }, { onConflict: "id" });

  if (error) {
    toast("Profil : " + error.message);
    return;
  }

  await loadProfile();
  renderAccount();
  toast("Profil enregistré ✅");
}

async function startPhoneVerification(phone) {
  if (!currentUser) {
    toast("Connecte-toi d'abord.");
    return;
  }

  if (!phone) {
    toast("Entre ton numéro de téléphone.");
    return;
  }

  pendingPhone = phone;

  /*
    Supabase Phone Auth doit être activé et un fournisseur SMS
    doit être configuré dans le tableau de bord Supabase.
  */
  const { error } = await supabase.auth.updateUser({ phone });

  if (error) {
    toast("Vérification SMS : " + error.message);
    return;
  }

  const code = prompt("Entre le code SMS reçu :");
  if (!code) return;

  const { error: verifyError } = await supabase.auth.verifyOtp({
    phone,
    token: code,
    type: "phone_change"
  });

  if (verifyError) {
    toast("Code incorrect ou expiré : " + verifyError.message);
    return;
  }

  verifiedPhone = true;

  await supabase
    .from("profiles")
    .upsert({
      id: currentUser.id,
      phone,
      phone_verified: true
    }, { onConflict: "id" });

  await loadProfile();
  renderAccount();
  prefillOrder();
  toast("Numéro vérifié ✅");
}

/* ---------- ORDER ---------- */

function prefillOrder() {
  if (!currentUser) return;

  const first = currentProfile?.first_name || currentUser.user_metadata?.first_name || "";
  const last = currentProfile?.last_name || currentUser.user_metadata?.last_name || "";
  const phone = currentProfile?.phone || "";

  if ($("orderFirstName")) $("orderFirstName").value = first;
  if ($("orderLastName")) $("orderLastName").value = last;
  if ($("orderPhone")) $("orderPhone").value = phone;

  updatePhoneStatus();
}

function updatePhoneStatus() {
  const box = $("phoneStatus");
  if (!box) return;

  if (verifiedPhone) {
    box.classList.add("ok");
    box.textContent = "✅ Numéro vérifié. Il sera enregistré pour tes prochaines commandes.";
  } else {
    box.classList.remove("ok");
    box.textContent = "⚠️ Ton numéro doit être vérifié avant la commande.";
  }
}

$("sendOtp")?.addEventListener("click", async () => {
  await startOrderPhoneVerification();
});

$("verifyOtp")?.addEventListener("click", async () => {
  await verifyOrderOtp();
});

async function startOrderPhoneVerification() {
  if (!currentUser) {
    toast("Connecte-toi d'abord.");
    return;
  }

  const phone = $("orderPhone")?.value.trim();

  if (!phone) {
    toast("Entre ton numéro.");
    return;
  }

  pendingPhone = phone;

  const { error } = await supabase.auth.updateUser({ phone });

  if (error) {
    toast("SMS : " + error.message);
    return;
  }

  $("otpArea")?.classList.remove("hidden");
  toast("Code SMS envoyé 📲");
}

async function verifyOrderOtp() {
  const phone = $("orderPhone")?.value.trim();
  const token = $("otpCode")?.value.trim();

  if (!phone || !token) {
    toast("Entre le code reçu par SMS.");
    return;
  }

  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "phone_change"
  });

  if (error) {
    toast("Code incorrect ou expiré.");
    return;
  }

  verifiedPhone = true;

  await supabase
    .from("profiles")
    .upsert({
      id: currentUser.id,
      phone,
      phone_verified: true
    }, { onConflict: "id" });

  await loadProfile();
  updatePhoneStatus();

  if ($("otpArea")) $("otpArea").classList.add("hidden");
  if ($("sendOtp")) $("sendOtp").textContent = "✅ Numéro vérifié";

  toast("Numéro vérifié ✅");
}

$("orderOnSite")?.addEventListener("click", async () => {
  await createOrder("site");
});

$("orderOnWhatsApp")?.addEventListener("click", async () => {
  await createOrder("whatsapp");
});

async function createOrder(method) {
  if (!currentUser) {
    showPage("compte");
    toast("Connecte-toi pour commander.");
    return;
  }

  if (!cart.length) {
    toast("Ton panier est vide.");
    showPage("boutique");
    return;
  }

  const first_name = $("orderFirstName")?.value.trim();
  const last_name = $("orderLastName")?.value.trim();
  const phone = $("orderPhone")?.value.trim();

  if (!first_name || !last_name || !phone) {
    toast("Prénom, nom et téléphone sont obligatoires.");
    return;
  }

  if (!verifiedPhone) {
    toast("Vérifie ton numéro avant de commander.");
    return;
  }

  const items = cart.map(i => ({
    id: i.id,
    name: i.name,
    price: Number(i.price),
    qty: Number(i.qty),
    image: i.image || ""
  }));

  const total = cartTotal();

  const orderPayload = {
    user_id: currentUser.id,
    first_name,
    last_name,
    phone,
    phone_verified: true,
    items,
    total,
    method,
    status: "new"
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select()
    .single();

  if (error) {
    toast("Commande : " + error.message);
    return;
  }

  await supabase
    .from("profiles")
    .upsert({
      id: currentUser.id,
      first_name,
      last_name,
      phone,
      phone_verified: true
    }, { onConflict: "id" });

  if (method === "whatsapp") {
    const lines = items.map(i => `• ${i.name} × ${i.qty} — ${money(i.price * i.qty)}`);

    const message =
      `🛍️ *Nouvelle commande MHD SHOP*\n\n` +
      `👤 ${first_name} ${last_name}\n` +
      `📞 ${phone}\n\n` +
      `${lines.join("\n")}\n\n` +
      `💰 *Total : ${money(total)}*\n` +
      `🆔 Commande : ${data?.id || "site"}`;

    openWhatsApp(message);
  }

  cart = [];
  saveCart();
  renderCart();

  toast("Commande enregistrée ✅");
  showPage("accueil");
}

/* ---------- ADMIN ---------- */

async function openAdmin() {
  if (!currentUser) {
    toast("Connecte-toi pour accéder à Admin.");
    showPage("compte");
    return;
  }

  await checkAdmin();

  if (!isAdmin) {
    toast("Accès administrateur refusé.");
    showPage("accueil");
    return;
  }

  await loadOrders();
  renderAdminProducts();
}

document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-admin-tab]");
  if (!tab) return;

  document.querySelectorAll(".admin-tab").forEach(b => b.classList.remove("active"));
  tab.classList.add("active");

  const productsTab = $("adminProductsTab");
  const ordersTab = $("adminOrdersTab");

  if (tab.dataset.adminTab === "products") {
    productsTab?.classList.remove("hidden");
    ordersTab?.classList.add("hidden");
  } else {
    productsTab?.classList.add("hidden");
    ordersTab?.classList.remove("hidden");
    loadOrders();
  }
});

async function loadOrders() {
  if (!isAdmin) return;

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("Orders:", error.message);
    orders = [];
    renderAdminOrders();
    return;
  }

  orders = data || [];
  renderAdminOrders();
}

function renderAdminOrders() {
  const box = $("adminOrders");
  const badge = $("orderBadge");
  const alert = $("adminOrderAlert");

  const newCount = orders.filter(o => o.status === "new").length;

  if (badge) badge.textContent = newCount;
  if (alert) {
    alert.classList.toggle("hidden", newCount === 0);
    alert.textContent = newCount
      ? `🔔 ${newCount} nouvelle${newCount > 1 ? "s" : ""} commande${newCount > 1 ? "s" : ""} à consulter.`
      : "";
  }

  if (!box) return;

  if (!orders.length) {
    box.innerHTML = `<div class="panel">Aucune commande pour le moment.</div>`;
    return;
  }

  box.innerHTML = orders.map(order => {
    const items = Array.isArray(order.items) ? order.items : [];
    const date = order.created_at
      ? new Date(order.created_at).toLocaleString("fr-FR")
      : "";

    return `
      <article class="panel" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <div>
            <b>Commande #${esc(order.id)}</b>
            <div style="color:var(--muted);font-size:12px;margin-top:4px">${esc(date)}</div>
          </div>
          <span style="color:${order.status === "new" ? "var(--red)" : "var(--green)"};font-weight:900">
            ${esc(order.status || "new")}
          </span>
        </div>

        <div style="margin-top:13px">
          <b>${esc(order.first_name)} ${esc(order.last_name)}</b><br>
          📞 ${esc(order.phone)}
        </div>

        <div style="margin-top:13px;color:var(--muted);font-size:13px">
          ${items.map(i => `${esc(i.name)} × ${i.qty}`).join("<br>")}
        </div>

        <div style="margin-top:13px;font-size:19px;font-weight:950;color:var(--red)">
          ${money(order.total)}
        </div>

        <div style="display:flex;gap:8px;margin-top:13px">
          <button class="secondary" data-order-status="${esc(order.id)}" data-status="processing">En cours</button>
          <button class="primary" data-order-status="${esc(order.id)}" data-status="completed">Terminée</button>
        </div>
      </article>
    `;
  }).join("");
}

document.addEventListener("click", async (e) => {
  const statusBtn = e.target.closest("[data-order-status]");
  if (!statusBtn) return;

  const id = statusBtn.dataset.orderStatus;
  const status = statusBtn.dataset.status;

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) {
    toast(error.message);
    return;
  }

  await loadOrders();
  toast("Commande mise à jour ✅");
});

/* ---------- ADMIN PRODUCTS ---------- */

$("pImage")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    editingImage = await resizeImage(file, 1000, 0.82);
    if ($("imagePreview")) {
      $("imagePreview").innerHTML = `<img src="${esc(editingImage)}" alt="Aperçu">`;
    }
  } catch {
    toast("Impossible de lire cette image.");
  }
});

$("saveProduct")?.addEventListener("click", saveProduct);
$("cancelEdit")?.addEventListener("click", resetProductForm);

async function saveProduct() {
  if (!isAdmin) {
    toast("Accès refusé.");
    return;
  }

  const name = $("pName")?.value.trim();
  const category = $("pCategory")?.value.trim() || "Autre";
  const price = Number($("pPrice")?.value);
  const available = $("pAvailable")?.value === "true";
  const editId = $("editId")?.value;

  if (!name || !price || price <= 0) {
    toast("Nom et prix valides obligatoires.");
    return;
  }

  const payload = {
    name,
    category,
    price,
    image: editingImage || null,
    available
  };

  let result;

  if (editId) {
    result = await supabase
      .from("products")
      .update(payload)
      .eq("id", editId);
  } else {
    result = await supabase
      .from("products")
      .insert(payload);
  }

  if (result.error) {
    toast(result.error.message);
    return;
  }

  toast(editId ? "Produit modifié ✅" : "Produit ajouté ✅");
  resetProductForm();
  await loadProducts();
}

function renderAdminProducts() {
  const box = $("adminProducts");
  if (!box) return;

  if (!isAdmin) {
    box.innerHTML = `<div class="panel">Connecte-toi avec le compte administrateur.</div>`;
    return;
  }

  box.innerHTML = products.length
    ? products.map(p => `
      <div class="admin-item">
        <div class="cart-thumb">
          ${p.image ? `<img src="${esc(p.image)}" alt="">` : "🎮"}
        </div>
        <div class="grow">
          <b>${esc(p.name)}</b>
          <div style="color:var(--red);font-weight:900">${money(p.price)}</div>
          <small style="color:var(--muted)">${esc(p.category)} · ${p.available ? "Disponible" : "Indisponible"}</small>
        </div>
        <button class="secondary" data-edit-product="${esc(p.id)}">✏️</button>
        <button class="danger" data-delete-product="${esc(p.id)}">🗑️</button>
      </div>
    `).join("")
    : `<div class="panel">Aucun produit.</div>`;
}

document.addEventListener("click", async (e) => {
  const edit = e.target.closest("[data-edit-product]");
  if (edit) {
    const p = findProduct(edit.dataset.editProduct);
    if (!p) return;

    $("editId").value = p.id;
    $("pName").value = p.name;
    $("pCategory").value = p.category;
    $("pPrice").value = p.price;
    $("pAvailable").value = String(p.available);
    editingImage = p.image || "";

    if ($("formTitle")) $("formTitle").textContent = "Modifier le produit";
    if ($("imagePreview")) {
      $("imagePreview").innerHTML = editingImage
        ? `<img src="${esc(editingImage)}" alt="Aperçu">`
        : "Aucune photo sélectionnée";
    }

    showPage("admin");
    return;
  }

  const del = e.target.closest("[data-delete-product]");
  if (del) {
    if (!confirm("Supprimer ce produit ?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", del.dataset.deleteProduct);

    if (error) {
      toast(error.message);
      return;
    }

    toast("Produit supprimé.");
    await loadProducts();
  }
});

function resetProductForm() {
  if ($("editId")) $("editId").value = "";
  if ($("pName")) $("pName").value = "";
  if ($("pCategory")) $("pCategory").value = "";
  if ($("pPrice")) $("pPrice").value = "";
  if ($("pImage")) $("pImage").value = "";
  if ($("pAvailable")) $("pAvailable").value = "true";
  if ($("formTitle")) $("formTitle").textContent = "Ajouter un produit";
  if ($("imagePreview")) $("imagePreview").textContent = "Aucune photo sélectionnée";
  editingImage = "";
}

function resizeImage(file, maxSize = 1000, quality = .82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.onerror = reject;
      img.src = reader.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ---------- MHD IA ---------- */

function openAI() {
  $("aiBox")?.classList.remove("hidden");
  $("aiInput")?.focus();
}

function closeAI() {
  $("aiBox")?.classList.add("hidden");
}

$("aiFloat")?.addEventListener("click", () => {
  $("aiBox")?.classList.contains("hidden") ? openAI() : closeAI();
});

$("aiClose")?.addEventListener("click", closeAI);

document.querySelectorAll("[data-ai]").forEach(btn => {
  btn.addEventListener("click", () => aiAnswer(btn.dataset.ai));
});

$("aiSend")?.addEventListener("click", sendAIMessage);

$("aiInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendAIMessage();
});

function addAIMessage(text, type = "bot") {
  const box = $("aiMessages");
  if (!box) return;

  const div = document.createElement("div");
  div.className = `ai-msg ${type}`;
  div.textContent = text;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function sendAIMessage() {
  const input = $("aiInput");
  const text = input?.value.trim();

  if (!text) return;

  addAIMessage(text, "user");
  input.value = "";

  setTimeout(() => {
    const q = text.toLowerCase();

    if (q.includes("produit") || q.includes("prix") || q.includes("acheter")) {
      aiAnswer("produits");
    } else if (q.includes("commande") || q.includes("commander") || q.includes("panier")) {
      aiAnswer("commande");
    } else if (q.includes("whatsapp") || q.includes("contact") || q.includes("vendeur")) {
      aiAnswer("support");
    } else {
      addAIMessage("Je peux t'aider avec les produits, les commandes ou le support MHD SHOP. 🤖");
    }
  }, 350);
}

function aiAnswer(type) {
  if (type === "produits") {
    const available = products.filter(p => p.available !== false);

    if (!available.length) {
      addAIMessage("Aucun produit disponible pour le moment.");
      return;
    }

    const text = available.slice(0, 5)
      .map(p => `${p.name} — ${money(p.price)}`)
      .join(" • ");

    addAIMessage(`Voici quelques produits : ${text}`);
  }

  if (type === "commande") {
    addAIMessage("Ajoute tes produits au panier, connecte-toi, puis vérifie ton numéro avant de choisir Site ou WhatsApp. 📦");
  }

  if (type === "support") {
    addAIMessage("Le vendeur est joignable sur WhatsApp au +221 78 748 81 99. 💬");
  }
}

/* ---------- WHATSAPP ---------- */

function openWhatsApp(message) {
  const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener");
}

/* ---------- THEME ---------- */

function applyTheme() {
  const theme = localStorage.getItem("mhd_theme") || "dark";
  document.body.classList.toggle("light", theme === "light");
}

function toggleTheme() {
  const light = !document.body.classList.contains("light");
  localStorage.setItem("mhd_theme", light ? "light" : "dark");
  applyTheme();
}

/* ---------- TOAST ---------- */

function toast(message) {
  let box = document.getElementById("mhdToast");

  if (!box) {
    box = document.createElement("div");
    box.id = "mhdToast";
    Object.assign(box.style, {
      position:"fixed",
      left:"50%",
      bottom:"94px",
      transform:"translateX(-50%) translateY(12px)",
      zIndex:"9999",
      maxWidth:"calc(100vw - 30px)",
      padding:"12px 16px",
      borderRadius:"14px",
      background:"#101a2b",
      color:"#fff",
      border:"1px solid rgba(0,200,255,.35)",
      boxShadow:"0 14px 35px rgba(0,0,0,.35)",
      fontSize:"13px",
      fontWeight:"800",
      opacity:"0",
      transition:".2s ease",
      textAlign:"center"
    });
    document.body.appendChild(box);
  }

  box.textContent = message;
  box.style.opacity = "1";
  box.style.transform = "translateX(-50%) translateY(0)";

  clearTimeout(box._timer);
  box._timer = setTimeout(() => {
    box.style.opacity = "0";
    box.style.transform = "translateX(-50%) translateY(12px)";
  }, 2600);
}

/* ---------- REALTIME ADMIN ORDERS ---------- */

function subscribeToOrders() {
  supabase
    .channel("mhd-shop-orders")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders" },
      () => {
        if (isAdmin) loadOrders();
      }
    )
    .subscribe();
}

/* ---------- START ---------- */

applyTheme();
renderCartCount();
renderCart();
loadProducts();
getSession();
subscribeToOrders();

supabase.auth.onAuthStateChange(async (_event, session) => {
  currentUser = session?.user || null;

  /*
    On attend un court instant pour éviter de faire plusieurs requêtes
    simultanées lors du retour d'un OAuth.
  */
  setTimeout(async () => {
    await loadProfile();
    await checkAdmin();
    renderAccount();
    prefillOrder();
  }, 100);
});
