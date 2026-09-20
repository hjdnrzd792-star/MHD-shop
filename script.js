/* =========================================================
   MHD SHOP — SCRIPT PRINCIPAL
   Compatible avec l'ancien index.html
   ========================================================= */

/* =========================
   SUPABASE
   ========================= */

const SUPABASE_URL = "https://oabjxsclanvgmvnezab.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_Wccb86Hdfbxwx1tj0ciPDg_aRv8yqje";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

/* =========================
   CONFIGURATION
   ========================= */

const SHOP_NAME = "𝓜𝓗𝓓𝓢𝓗𝓞𝓟";
const WHATSAPP = "221787488199";

const DEMO_PRODUCTS = [
  {
    id: "demo-1",
    name: "Pack Gaming Premium",
    category: "Gaming",
    price: 5000,
    image: "",
    available: true
  },
  {
    id: "demo-2",
    name: "Service Digital Premium",
    category: "Digital",
    price: 7500,
    image: "",
    available: true
  },
  {
    id: "demo-3",
    name: "Pack Gamer",
    category: "Gaming",
    price: 10000,
    image: "",
    available: true
  }
];

/* =========================
   ÉTAT
   ========================= */

let products = [];
let cart = loadCart();

let currentCategory = "Tous";
let currentUser = null;
let currentProfile = null;

let phoneVerified = false;
let selectedImageData = "";

let adminOrders = [];

/* =========================
   UTILITAIRES
   ========================= */

function $(id) {
  return document.getElementById(id);
}

function money(value) {
  return (
    Number(value || 0)
      .toLocaleString("fr-FR")
      .replace(/\u202F/g, " ") + " FCFA"
  );
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  let toast = document.querySelector(".toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.remove();
  }, 2800);
}

function setStatus(message, type = "") {
  const box = $("phoneStatus");

  if (!box) return;

  box.textContent = message;

  box.className = "status-box";

  if (type) {
    box.classList.add(type);
  }
}

function normalizePhone(phone) {
  let p = String(phone || "")
    .replace(/[^\d+]/g, "");

  if (p.startsWith("00")) {
    p = "+" + p.slice(2);
  }

  if (!p.startsWith("+")) {
    if (p.startsWith("221")) {
      p = "+" + p;
    } else {
      p = "+221" + p.replace(/^0+/, "");
    }
  }

  return p;
}

/* =========================
   NAVIGATION
   ========================= */

function goTo(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const target = $(pageId);

  if (!target) return;

  target.classList.add("active");

  document.querySelectorAll(".liquid-nav button").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.go === pageId
    );
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (pageId === "panier") {
    renderCart();
  }

  if (pageId === "compte") {
    renderAuthPanel();
  }

  if (pageId === "admin") {
    openAdmin();
  }

  if (pageId === "commande") {
    prepareCheckout();
  }
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-go]");

  if (!button) return;

  const page = button.dataset.go;

  if (page) {
    goTo(page);
  }
});

/* =========================
   CART
   ========================= */

function loadCart() {
  try {
    const saved = localStorage.getItem("mhd_cart");

    return saved
      ? JSON.parse(saved)
      : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(
    "mhd_cart",
    JSON.stringify(cart)
  );

  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce(
    (total, item) =>
      total + Number(item.quantity || 0),
    0
  );

  if ($("cartCount")) {
    $("cartCount").textContent = count;
  }
}

function addToCart(productId) {
  const product = products.find(
    p => String(p.id) === String(productId)
  );

  if (!product) return;

  if (!product.available) {
    showToast("Ce produit est indisponible.");
    return;
  }

  const existing = cart.find(
    item => String(item.id) === String(product.id)
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      category: product.category,
      price: Number(product.price),
      image: product.image || "",
      quantity: 1
    });
  }

  saveCart();

  showToast("Produit ajouté au panier 🛒");
}

function changeQuantity(id, amount) {
  const item = cart.find(
    product => String(product.id) === String(id)
  );

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    cart = cart.filter(
      product => String(product.id) !== String(id)
    );
  }

  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(
    product => String(product.id) !== String(id)
  );

  saveCart();
  renderCart();
}

function cartTotal() {
  return cart.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
      Number(item.quantity || 0),
    0
  );
}

function renderCart() {
  const container = $("cart");

  if (!container) return;

  updateCartCount();

  if (!cart.length) {
    container.innerHTML = `
      <div class="empty-state">
        🛒<br><br>
        Ton panier est vide.
        <br><br>
        <button class="primary" data-go="boutique">
          🛍️ Voir la boutique
        </button>
      </div>
    `;

    return;
  }

  container.innerHTML = `
    ${cart.map(item => `
      <div class="cart-item">

        ${
          item.image
            ? `<img src="${item.image}" alt="">`
            : `<div style="
                width:66px;
                height:66px;
                border-radius:13px;
                display:flex;
                align-items:center;
                justify-content:center;
                background:rgba(22,140,255,.10);
                font-size:24px;
              ">🎮</div>`
        }

        <div>
          <div class="cart-item-name">
            ${escapeHTML(item.name)}
          </div>

          <div class="cart-item-price">
            ${money(item.price)}
          </div>

          <div class="cart-controls">
            <button
              data-cart-minus="${item.id}"
            >−</button>

            <strong>${item.quantity}</strong>

            <button
              data-cart-plus="${item.id}"
            >+</button>

            <button
              class="cart-remove"
              data-cart-remove="${item.id}"
            >×</button>
          </div>
        </div>

        <strong>
          ${money(
            Number(item.price) *
            Number(item.quantity)
          )}
        </strong>

      </div>
    `).join("")}

    <div class="cart-total">

      <div class="cart-total-row">
        <span>Total</span>
        <strong>${money(cartTotal())}</strong>
      </div>

      <button
        class="primary full"
        style="margin-top:14px"
        data-go="commande"
      >
        📦 Passer la commande
      </button>

    </div>
  `;
}

document.addEventListener("click", event => {

  const plus = event.target.closest("[data-cart-plus]");
  const minus = event.target.closest("[data-cart-minus]");
  const remove = event.target.closest("[data-cart-remove]");

  if (plus) {
    changeQuantity(
      plus.dataset.cartPlus,
      1
    );
  }

  if (minus) {
    changeQuantity(
      minus.dataset.cartMinus,
      -1
    );
  }

  if (remove) {
    removeFromCart(
      remove.dataset.cartRemove
    );
  }
});

/* =========================
   PRODUCTS
   ========================= */

async function loadProducts() {

  const { data, error } =
    await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.warn(
      "Supabase products:",
      error.message
    );

    products = [...DEMO_PRODUCTS];
  } else if (data && data.length) {
    products = data;
  } else {
    products = [];
  }

  renderCategories();
  renderProducts();
  renderHomeProducts();
  renderAdminProducts();
}

function productImage(product) {

  if (product.image) {
    return `
      <img
        class="product-image"
        src="${product.image}"
        alt="${escapeHTML(product.name)}"
        loading="lazy"
      >
    `;
  }

  return `
    <div
      class="product-image"
      style="
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:42px;
      "
    >
      🎮
    </div>
  `;
}

function productCard(product) {

  const available =
    product.available !== false;

  return `
    <article class="product-card">

      ${productImage(product)}

      <div class="product-content">

        <span class="product-category">
          ${escapeHTML(
            product.category || "Gaming"
          )}
        </span>

        <div class="product-name">
          ${escapeHTML(product.name)}
        </div>

        <div class="product-price">
          ${money(product.price)}
        </div>

        <span class="
          product-availability
          ${available ? "" : "unavailable"}
        ">
          ${available
            ? "✓ Disponible"
            : "✕ Indisponible"}
        </span>

        <button
          class="add-cart"
          data-add-cart="${product.id}"
          ${available ? "" : "disabled"}
        >
          ${available
            ? "🛒 Ajouter au panier"
            : "Indisponible"}
        </button>

      </div>

    </article>
  `;
}

function renderProducts() {

  const container = $("products");

  if (!container) return;

  const search =
    ($("search")?.value || "")
      .trim()
      .toLowerCase();

  let filtered = products.filter(product => {

    const matchesSearch =
      !search ||
      String(product.name || "")
        .toLowerCase()
        .includes(search) ||
      String(product.category || "")
        .toLowerCase()
        .includes(search);

    const matchesCategory =
      currentCategory === "Tous" ||
      String(product.category || "") ===
      currentCategory;

    return matchesSearch && matchesCategory;
  });

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state"
        style="grid-column:1/-1">
        🔎<br><br>
        Aucun produit trouvé.
      </div>
    `;

    return;
  }

  container.innerHTML =
    filtered.map(productCard).join("");
}

function renderHomeProducts() {

  const container = $("homeProducts");

  if (!container) return;

  const popular =
    products.slice(0, 4);

  if (!popular.length) {
    container.innerHTML = `
      <div class="empty-state"
        style="grid-column:1/-1">
        Aucun produit disponible pour le moment.
      </div>
    `;

    return;
  }

  container.innerHTML =
    popular.map(productCard).join("");
}

function renderCategories() {

  const container = $("categories");

  if (!container) return;

  const categories = [
    "Tous",
    ...new Set(
      products
        .map(product =>
          product.category
        )
        .filter(Boolean)
    )
  ];

  container.innerHTML =
    categories.map(category => `
      <button
        class="chip ${
          category === currentCategory
            ? "active"
            : ""
        }"
        data-category="${escapeHTML(category)}"
      >
        ${escapeHTML(category)}
      </button>
    `).join("");
}

document.addEventListener("click", event => {

  const add =
    event.target.closest("[data-add-cart]");

  if (add) {
    addToCart(add.dataset.addCart);
  }

  const category =
    event.target.closest("[data-category]");

  if (category) {

    currentCategory =
      category.dataset.category;

    renderCategories();
    renderProducts();
  }
});

$("search")?.addEventListener(
  "input",
  renderProducts
);

/* =========================
   AUTH
   ========================= */

async function getCurrentUser() {

  const {
    data,
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    currentUser = null;
    return null;
  }

  currentUser = data.user || null;

  return currentUser;
}

async function loadProfile() {

  if (!currentUser) {
    currentProfile = null;
    return null;
  }

  const {
    data,
    error
  } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.warn(
      "Profile:",
      error.message
    );

    currentProfile = null;
    return null;
  }

  currentProfile = data;

  return data;
}

function renderAuthPanel() {

  const panel = $("authPanel");

  if (!panel) return;

  if (!currentUser) {

    panel.innerHTML = `
      <div class="auth-box">

        <h2>Connexion</h2>

        <p style="
          color:#94a3b8;
          font-size:12px;
          line-height:1.5;
        ">
          Connecte-toi pour gérer ton compte
          et suivre tes commandes.
        </p>

        <label>Email</label>
        <input
          id="authEmail"
          type="email"
          autocomplete="email"
          placeholder="ton@email.com"
        >

        <label>Mot de passe</label>
        <input
          id="authPassword"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
        >

        <button
          id="loginButton"
          class="primary full"
        >
          🔐 Se connecter
        </button>

        <button
          id="signupButton"
          class="secondary full"
        >
          ✨ Créer mon compte
        </button>

        <div class="auth-divider">
          ou continuer avec
        </div>

        <div class="social-auth">

          <button
            id="googleLogin"
            class="social-button"
          >
            🌐 Google
          </button>

          <button
            id="appleLogin"
            class="social-button"
          >
             Apple
          </button>

        </div>

      </div>
    `;

    return;
  }

  const firstName =
    currentProfile?.first_name ||
    currentUser.user_metadata?.first_name ||
    "";

  const lastName =
    currentProfile?.last_name ||
    currentUser.user_metadata?.last_name ||
    "";

  const phone =
    currentProfile?.phone ||
    currentUser.phone ||
    "";

  const role =
    currentProfile?.role ||
    "client";

  panel.innerHTML = `

    <div class="profile-card">

      <div class="profile-name">
        ${escapeHTML(
          `${firstName} ${lastName}`.trim() ||
          "Mon compte"
        )}
      </div>

      <div class="profile-email">
        ${escapeHTML(
          currentUser.email || ""
        )}
      </div>

      <span class="profile-role">
        ${role === "admin"
          ? "ADMINISTRATEUR"
          : "CLIENT"}
      </span>

    </div>

    <label>Prénom</label>
    <input
      id="profileFirstName"
      value="${escapeHTML(firstName)}"
      placeholder="Prénom"
    >

    <label>Nom</label>
    <input
      id="profileLastName"
      value="${escapeHTML(lastName)}"
      placeholder="Nom"
    >

    <label>Téléphone</label>
    <input
      id="profilePhone"
      type="tel"
      value="${escapeHTML(phone)}"
      placeholder="+221 77 000 00 00"
    >

    <button
      id="saveProfile"
      class="primary full"
      style="margin-top:15px"
    >
      💾 Enregistrer mon profil
    </button>

    ${
      role === "admin"
        ? `
          <button
            id="profileAdmin"
            class="secondary full"
            style="margin-top:9px"
          >
            ⚙️ Ouvrir l'administration
          </button>
        `
        : ""
    }

    <button
      id="logoutButton"
      class="ghost full"
      style="margin-top:9px"
    >
      🚪 Se déconnecter
    </button>
  `;
}

/* =========================
   LOGIN
   ========================= */

async function login() {

  const email =
    $("authEmail")?.value.trim();

  const password =
    $("authPassword")?.value;

  if (!email || !password) {
    showToast(
      "Entre ton email et ton mot de passe."
    );
    return;
  }

  const {
    error
  } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showToast(
      error.message
    );
    return;
  }

  await refreshAuth();

  showToast("Connexion réussie 👋");

  renderAuthPanel();
}

async function signup() {

  const email =
    $("authEmail")?.value.trim();

  const password =
    $("authPassword")?.value;

  if (!email || !password) {
    showToast(
      "Entre ton email et un mot de passe."
    );
    return;
  }

  if (password.length < 6) {
    showToast(
      "Le mot de passe doit avoir au moins 6 caractères."
    );
    return;
  }

  const {
    data,
    error
  } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    showToast(error.message);
    return;
  }

  if (data.user) {
    showToast(
      "Compte créé. Vérifie ton email si nécessaire."
    );
  }
}

async function oauthLogin(provider) {

  const {
    error
  } =
    await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          window.location.origin +
          window.location.pathname
      }
    });

  if (error) {
    showToast(error.message);
  }
}

/* =========================
   PROFILE
   ========================= */

async function saveProfile() {

  if (!currentUser) return;

  const firstName =
    $("profileFirstName")?.value.trim();

  const lastName =
    $("profileLastName")?.value.trim();

  const phone =
    normalizePhone(
      $("profilePhone")?.value.trim()
    );

  const {
    error
  } = await supabaseClient
    .from("profiles")
    .upsert({
      id: currentUser.id,
      first_name: firstName,
      last_name: lastName,
      phone: phone || null
    });

  if (error) {
    showToast(
      "Erreur : " + error.message
    );
    return;
  }

  await loadProfile();

  showToast(
    "Profil enregistré ✅"
  );

  renderAuthPanel();
}

/* =========================
   PHONE OTP
   ========================= */

async function sendOTP() {

  if (!currentUser) {
    showToast(
      "Connecte-toi d'abord à ton compte."
    );

    goTo("compte");
    return;
  }

  const phone =
    normalizePhone(
      $("orderPhone")?.value.trim()
    );

  if (!phone || phone.length < 10) {
    setStatus(
      "Entre un numéro de téléphone valide.",
      "error"
    );

    return;
  }

  const {
    error
  } =
    await supabaseClient.auth.updateUser({
      phone
    });

  if (error) {

    setStatus(
      error.message,
      "error"
    );

    return;
  }

  $("otpArea")?.classList.remove(
    "hidden"
  );

  setStatus(
    "Un code de vérification a été envoyé par SMS.",
    ""
  );

  showToast("Code SMS envoyé 📲");
}

async function verifyOTP() {

  if (!currentUser) return;

  const phone =
    normalizePhone(
      $("orderPhone")?.value.trim()
    );

  const token =
    $("otpCode")?.value.trim();

  if (!phone || !token) {
    showToast(
      "Entre le code reçu par SMS."
    );

    return;
  }

  const {
    error
  } =
    await supabaseClient.auth.verifyOtp({
      phone,
      token,
      type: "phone_change"
    });

  if (error) {

    setStatus(
      error.message,
      "error"
    );

    return;
  }

  phoneVerified = true;

  setStatus(
    "Numéro vérifié avec succès ✅",
    "success"
  );

  await supabaseClient
    .from("profiles")
    .upsert({
      id: currentUser.id,
      phone,
      phone_verified: true
    });

  showToast(
    "Téléphone vérifié ✅"
  );
}

/* =========================
   CHECKOUT
   ========================= */

function prepareCheckout() {

  if (!$("orderPhone")) return;

  if (currentUser) {

    const firstName =
      currentProfile?.first_name || "";

    const lastName =
      currentProfile?.last_name || "";

    const phone =
      currentProfile?.phone ||
      currentUser.phone ||
      "";

    if (!$("orderFirstName").value) {
      $("orderFirstName").value =
        firstName;
    }

    if (!$("orderLastName").value) {
      $("orderLastName").value =
        lastName;
    }

    if (!$("orderPhone").value) {
      $("orderPhone").value =
        phone;
    }

    if (
      currentProfile?.phone_verified &&
      phone
    ) {
      phoneVerified = true;

      setStatus(
        "Numéro déjà vérifié ✅",
        "success"
      );
    }
  }
}

function validateOrder() {

  if (!currentUser) {
    showToast(
      "Connecte-toi avant de commander."
    );

    goTo("compte");

    return false;
  }

  if (!cart.length) {
    showToast(
      "Ton panier est vide."
    );

    goTo("boutique");

    return false;
  }

  const firstName =
    $("orderFirstName")?.value.trim();

  const lastName =
    $("orderLastName")?.value.trim();

  const phone =
    normalizePhone(
      $("orderPhone")?.value.trim()
    );

  if (!firstName || !lastName || !phone) {
    showToast(
      "Remplis toutes les informations obligatoires."
    );

    return false;
  }

  if (!phoneVerified) {
    showToast(
      "Vérifie ton numéro de téléphone."
    );

    setStatus(
      "Ton numéro doit être vérifié avant la commande.",
      ""
    );

    return false;
  }

  return true;
}

async function createOrder(method) {

  if (!validateOrder()) return;

  const firstName =
    $("orderFirstName").value.trim();

  const lastName =
    $("orderLastName").value.trim();

  const phone =
    normalizePhone(
      $("orderPhone").value.trim()
    );

  const items =
    cart.map(item => ({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price,
      quantity: item.quantity,
      image: item.image || ""
    }));

  const total = cartTotal();

  const {
    data,
    error
  } =
    await supabaseClient
      .from("orders")
      .insert({
        user_id: currentUser.id,
        first_name: firstName,
        last_name: lastName,
        phone,
        phone_verified: true,
        items,
        total,
        method,
        status: "new"
      })
      .select()
      .single();

  if (error) {

    showToast(
      "Impossible d'enregistrer la commande : " +
      error.message
    );

    return;
  }

  if (method === "whatsapp") {

    const lines = items.map(item =>
      `• ${item.name} x${item.quantity} — ${money(
        item.price * item.quantity
      )}`
    );

    const message =
`Bonjour MHD SHOP 👋

Je souhaite commander :

${lines.join("\n")}

Total : ${money(total)}

Nom : ${firstName} ${lastName}
Téléphone : ${phone}

Référence commande :
${data?.id || "N/A"}`;

    const url =
      `https://wa.me/${WHATSAPP}?text=` +
      encodeURIComponent(message);

    window.open(
      url,
      "_blank"
    );

  } else {

    showToast(
      "Commande envoyée à l'administration ✅"
    );
  }

  cart = [];
  saveCart();

  goTo("accueil");
}

/* =========================
   AUTH EVENTS
   ========================= */

document.addEventListener("click", event => {

  if (event.target.closest("#loginButton")) {
    login();
  }

  if (event.target.closest("#signupButton")) {
    signup();
  }

  if (event.target.closest("#googleLogin")) {
    oauthLogin("google");
  }

  if (event.target.closest("#appleLogin")) {
    oauthLogin("apple");
  }

  if (event.target.closest("#logoutButton")) {
    logout();
  }

  if (event.target.closest("#saveProfile")) {
    saveProfile();
  }

  if (event.target.closest("#profileAdmin")) {
    goTo("admin");
  }
});

async function logout() {

  await supabaseClient.auth.signOut();

  currentUser = null;
  currentProfile = null;
  phoneVerified = false;

  showToast(
    "Tu es déconnecté."
  );

  renderAuthPanel();
  goTo("accueil");
}

/* =========================
   ADMIN
   ========================= */

async function isAdmin() {

  if (!currentUser) {
    return false;
  }

  if (!currentProfile) {
    await loadProfile();
  }

  return (
    currentProfile?.role === "admin"
  );
}

async function openAdmin() {

  const allowed =
    await isAdmin();

  if (!allowed) {

    $("adminProductsTab")?.classList.add(
      "hidden"
    );

    $("adminOrdersTab")?.classList.add(
      "hidden"
    );

    const alert =
      $("adminOrderAlert");

    if (alert) {
      alert.classList.remove("hidden");

      alert.textContent =
        "🔒 Cet espace est réservé au compte administrateur.";
    }

    return;
  }

  $("adminProductsTab")?.classList.remove(
    "hidden"
  );

  loadAdminOrders();
  renderAdminProducts();
}

/* =========================
   IMAGE COMPRESSION
   ========================= */

function compressImage(file) {

  return new Promise((resolve, reject) => {

    const reader =
      new FileReader();

    reader.onload = event => {

      const img =
        new Image();

      img.onload = () => {

        const maxSize = 900;

        let width = img.width;
        let height = img.height;

        if (width > height) {

          if (width > maxSize) {
            height =
              Math.round(
                height *
                maxSize /
                width
              );

            width = maxSize;
          }

        } else {

          if (height > maxSize) {
            width =
              Math.round(
                width *
                maxSize /
                height
              );

            height = maxSize;
          }
        }

        const canvas =
          document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const ctx =
          canvas.getContext("2d");

        ctx.drawImage(
          img,
          0,
          0,
          width,
          height
        );

        resolve(
          canvas.toDataURL(
            "image/jpeg",
            0.76
          )
        );
      };

      img.onerror =
        () =>
          reject(
            new Error(
              "Image invalide"
            )
          );

      img.src =
        event.target.result;
    };

    reader.onerror =
      () =>
        reject(
          new Error(
            "Lecture impossible"
          )
        );

    reader.readAsDataURL(file);
  });
}

$("pImage")?.addEventListener(
  "change",
  async event => {

    const file =
      event.target.files?.[0];

    if (!file) return;

    try {

      selectedImageData =
        await compressImage(file);

      const preview =
        $("imagePreview");

      if (preview) {
        preview.innerHTML = `
          <img
            src="${selectedImageData}"
            alt="Aperçu"
          >
        `;
      }

    } catch {

      showToast(
        "Impossible de lire cette image."
      );
    }
  }
);

/* =========================
   ADMIN PRODUCTS
   ========================= */

async function saveProduct() {

  if (!(await isAdmin())) {
    showToast(
      "Accès administrateur requis."
    );
    return;
  }

  const id =
    $("editId")?.value;

  const name =
    $("pName")?.value.trim();

  const category =
    $("pCategory")?.value.trim();

  const price =
    Number(
      $("pPrice")?.value
    );

  const available =
    $("pAvailable")?.value === "true";

  if (!name || !category || !price) {

    showToast(
      "Remplis le nom, la catégorie et le prix."
    );

    return;
  }

  const payload = {
    name,
    category,
    price,
    available
  };

  if (selectedImageData) {
    payload.image =
      selectedImageData;
  }

  let result;

  if (id) {

    result =
      await supabaseClient
        .from("products")
        .update(payload)
        .eq("id", id);

  } else {

    result =
      await supabaseClient
        .from("products")
        .insert(payload);
  }

  if (result.error) {

    showToast(
      "Erreur : " +
      result.error.message
    );

    return;
  }

  showToast(
    id
      ? "Produit modifié ✅"
      : "Produit ajouté ✅"
  );

  resetProductForm();

  await loadProducts();
}

function resetProductForm() {

  if ($("editId"))
    $("editId").value = "";

  if ($("pName"))
    $("pName").value = "";

  if ($("pCategory"))
    $("pCategory").value = "";

  if ($("pPrice"))
    $("pPrice").value = "";

  if ($("pAvailable"))
    $("pAvailable").value = "true";

  if ($("pImage"))
    $("pImage").value = "";

  selectedImageData = "";

  if ($("imagePreview")) {
    $("imagePreview").textContent =
      "Aucune photo sélectionnée";
  }

  if ($("formTitle")) {
    $("formTitle").textContent =
      "Ajouter un produit";
  }
}

async function editProduct(id) {

  const product =
    products.find(
      p => String(p.id) === String(id)
    );

  if (!product) return;

  $("editId").value =
    product.id;

  $("pName").value =
    product.name || "";

  $("pCategory").value =
    product.category || "";

  $("pPrice").value =
    product.price || "";

  $("pAvailable").value =
    product.available === false
      ? "false"
      : "true";

  selectedImageData =
    product.image || "";

  if (selectedImageData) {

    $("imagePreview").innerHTML = `
      <img
        src="${selectedImageData}"
        alt="Photo actuelle"
      >
    `;

  } else {

    $("imagePreview").textContent =
      "Aucune photo sélectionnée";
  }

  $("formTitle").textContent =
    "Modifier le produit";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function deleteProduct(id) {

  if (!(await isAdmin())) return;

  const confirmed =
    window.confirm(
      "Supprimer ce produit ?"
    );

  if (!confirmed) return;

  const {
    error
  } =
    await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);

  if (error) {

    showToast(
      "Erreur : " +
      error.message
    );

    return;
  }

  showToast(
    "Produit supprimé."
  );

  await loadProducts();
}

function renderAdminProducts() {

  const container =
    $("adminProducts");

  if (!container) return;

  if (!products.length) {

    container.innerHTML = `
      <div class="empty-state">
        Aucun produit.
      </div>
    `;

    return;
  }

  container.innerHTML =
    products.map(product => `

      <div class="admin-product">

        ${
          product.image
            ? `
              <img
                src="${product.image}"
                alt=""
              >
            `
            : `
              <div style="
                width:70px;
                height:70px;
                border-radius:13px;
                display:flex;
                align-items:center;
                justify-content:center;
                background:rgba(22,140,255,.10);
                font-size:28px;
              ">
                🎮
              </div>
            `
        }

        <div>

          <div class="admin-product-name">
            ${escapeHTML(product.name)}
          </div>

          <div class="admin-product-price">
            ${money(product.price)}
          </div>

          <div style="
            color:${
              product.available
                ? "#86efac"
                : "#fda4af"
            };
            font-size:9px;
            margin-top:4px;
          ">
            ${
              product.available
                ? "Disponible"
                : "Indisponible"
            }
          </div>

        </div>

        <div class="admin-product-actions">

          <button
            data-edit-product="${product.id}"
          >
            Modifier
          </button>

          <button
            class="delete"
            data-delete-product="${product.id}"
          >
            Supprimer
          </button>

        </div>

      </div>

    `).join("");
}

/* =========================
   ADMIN ORDERS
   ========================= */

async function loadAdminOrders() {

  if (!(await isAdmin())) return;

  const {
    data,
    error
  } =
    await supabaseClient
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.warn(
      "Admin orders:",
      error.message
    );

    return;
  }

  adminOrders =
    data || [];

  renderAdminOrders();
}

function renderAdminOrders() {

  const container =
    $("adminOrders");

  if (!container) return;

  const newOrders =
    adminOrders.filter(
      order => order.status === "new"
    );

  if ($("orderBadge")) {
    $("orderBadge").textContent =
      newOrders.length;
  }

  if (!adminOrders.length) {

    container.innerHTML = `
      <div class="empty-state">
        📦<br><br>
        Aucune commande pour le moment.
      </div>
    `;

    return;
  }

  container.innerHTML =
    adminOrders.map(order => {

      let items = [];

      try {
        items =
          Array.isArray(order.items)
            ? order.items
            : JSON.parse(order.items || "[]");
      } catch {
        items = [];
      }

      const itemText =
        items.map(item =>
          `${escapeHTML(item.name)} × ${item.quantity}`
        ).join("<br>");

      const date =
        order.created_at
          ? new Date(
              order.created_at
            ).toLocaleString(
              "fr-FR"
            )
          : "";

      return `

        <div class="admin-order">

          <div class="admin-order-head">

            <div class="admin-order-id">
              ${escapeHTML(
                String(order.id)
              )}
            </div>

            <div class="admin-order-date">
              ${escapeHTML(date)}
            </div>

          </div>

          <div class="admin-order-customer">
            ${escapeHTML(
              `${order.first_name || ""} ${order.last_name || ""}`
            )}
          </div>

          <div class="admin-order-phone">
            📱 ${escapeHTML(
              order.phone || ""
            )}
            ${
              order.phone_verified
                ? " • ✓ vérifié"
                : ""
            }
          </div>

          <div class="admin-order-items">
            ${itemText || "Aucun article"}
          </div>

          <div class="admin-order-total">
            ${money(order.total)}
          </div>

          <select
            class="admin-order-status"
            data-order-status="${order.id}"
          >

            <option
              value="new"
              ${order.status === "new" ? "selected" : ""}
            >
              Nouvelle commande
            </option>

            <option
              value="processing"
              ${order.status === "processing" ? "selected" : ""}
            >
              En traitement
            </option>

            <option
              value="completed"
              ${order.status === "completed" ? "selected" : ""}
            >
              Terminée
            </option>

          </select>

        </div>

      `;

    }).join("");

  if ($("adminOrderAlert")) {

    if (newOrders.length) {

      $("adminOrderAlert")
        .classList.remove("hidden");

      $("adminOrderAlert").textContent =
        `🔔 ${newOrders.length} nouvelle${
          newOrders.length > 1 ? "s" : ""
        } commande${
          newOrders.length > 1 ? "s" : ""
        }.`;

    } else {

      $("adminOrderAlert")
        .classList.add("hidden");
    }
  }
}

async function updateOrderStatus(
  id,
  status
) {

  if (!(await isAdmin())) return;

  const {
    error
  } =
    await supabaseClient
      .from("orders")
      .update({
        status
      })
      .eq("id", id);

  if (error) {

    showToast(
      "Erreur : " +
      error.message
    );

    return;
  }

  showToast(
    "Statut de la commande mis à jour."
  );

  await loadAdminOrders();
}

/* =========================
   ADMIN EVENTS
   ========================= */

document.addEventListener("click", event => {

  if (
    event.target.closest("#saveProduct")
  ) {
    saveProduct();
  }

  if (
    event.target.closest("#cancelEdit")
  ) {
    resetProductForm();
  }

  const edit =
    event.target.closest(
      "[data-edit-product]"
    );

  if (edit) {
    editProduct(
      edit.dataset.editProduct
    );
  }

  const del =
    event.target.closest(
      "[data-delete-product]"
    );

  if (del) {
    deleteProduct(
      del.dataset.deleteProduct
    );
  }

  if (
    event.target.closest("#adminExit")
  ) {
    goTo("accueil");
  }

  const tab =
    event.target.closest(
      "[data-admin-tab]"
    );

  if (tab) {

    document.querySelectorAll(
      ".admin-tab"
    ).forEach(button => {
      button.classList.remove("active");
    });

    tab.classList.add("active");

    const name =
      tab.dataset.adminTab;

    if (name === "products") {

      $("adminProductsTab")
        ?.classList.remove("hidden");

      $("adminOrdersTab")
        ?.classList.add("hidden");

    } else {

      $("adminProductsTab")
        ?.classList.add("hidden");

      $("adminOrdersTab")
        ?.classList.remove("hidden");

      loadAdminOrders();
    }
  }
});

document.addEventListener(
  "change",
  event => {

    const status =
      event.target.closest(
        "[data-order-status]"
      );

    if (status) {

      updateOrderStatus(
        status.dataset.orderStatus,
        status.value
      );
    }
  }
);

/* =========================
   CHECKOUT EVENTS
   ========================= */

$("sendOtp")?.addEventListener(
  "click",
  sendOTP
);

$("verifyOtp")?.addEventListener(
  "click",
  verifyOTP
);

$("orderOnSite")?.addEventListener(
  "click",
  () => createOrder("site")
);

$("orderOnWhatsApp")?.addEventListener(
  "click",
  () => createOrder("whatsapp")
);

/* =========================
   MHD IA
   ========================= */

function addAIMessage(
  text,
  type = "bot"
) {

  const messages =
    $("aiMessages");

  if (!messages) return;

  const div =
    document.createElement("div");

  div.className =
    `ai-msg ${type}`;

  div.textContent = text;

  messages.appendChild(div);

  messages.scrollTop =
    messages.scrollHeight;
}

function aiAnswer(question) {

  const q =
    String(question || "")
      .toLowerCase()
      .trim();

  if (
    q.includes("produit") ||
    q.includes("boutique") ||
    q.includes("prix")
  ) {

    return `
Tu peux voir tous les produits dans la Boutique 🛍️.
Les prix sont affichés en FCFA.
  `.trim();
  }

  if (
    q.includes("commande") ||
    q.includes("acheter") ||
    q.includes("commander")
  ) {

    return `
Ajoute les produits au panier 🛒, puis passe à la commande.
Tu peux commander sur le site ou préparer une commande WhatsApp.
  `.trim();
  }

  if (
    q.includes("support") ||
    q.includes("contact") ||
    q.includes("whatsapp")
  ) {

    return `
Le support MHD SHOP est disponible sur WhatsApp au +221 78 748 81 99 💬.
  `.trim();
  }

  if (
    q.includes("bonjour") ||
    q.includes("salut") ||
    q.includes("hello")
  ) {

    return `
Salut 👋 Bienvenue sur MHD SHOP !
Je peux t'aider pour les produits, le panier et les commandes.
  `.trim();
  }

  return `
Je peux t'aider pour les produits 🛍️, les commandes 📦 et le support 💬.
  `.trim();
}

$("aiFloat")?.addEventListener(
  "click",
  () => {
    $("aiBox")
      ?.classList.toggle("hidden");
  }
);

$("aiClose")?.addEventListener(
  "click",
  () => {
    $("aiBox")
      ?.classList.add("hidden");
  }
);

function sendAI() {

  const input =
    $("aiInput");

  const question =
    input?.value.trim();

  if (!question) return;

  addAIMessage(
    question,
    "user"
  );

  input.value = "";

  setTimeout(() => {

    addAIMessage(
      aiAnswer(question),
      "bot"
    );

  }, 250);
}

$("aiSend")?.addEventListener(
  "click",
  sendAI
);

$("aiInput")?.addEventListener(
  "keydown",
  event => {

    if (event.key === "Enter") {
      sendAI();
    }
  }
);

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-ai]"
      );

    if (!button) return;

    const type =
      button.dataset.ai;

    let question = "";

    if (type === "produits") {
      question =
        "Quels sont les produits ?";
    }

    if (type === "commande") {
      question =
        "Comment commander ?";
    }

    if (type === "support") {
      question =
        "Comment contacter le support ?";
    }

    addAIMessage(
      question,
      "user"
    );

    setTimeout(() => {
      addAIMessage(
        aiAnswer(question),
        "bot"
      );
    }, 250);
  }
);

/* =========================
   REALTIME COMMANDES
   ========================= */

function subscribeToOrders() {

  try {

    supabaseClient
      .channel("mhd-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders"
        },
        payload => {

          if (
            currentProfile?.role ===
            "admin"
          ) {

            loadAdminOrders();

            if (
              payload.eventType ===
              "INSERT"
            ) {
              showToast(
                "🔔 Nouvelle commande !"
              );
            }
          }
        }
      )
      .subscribe();

  } catch (error) {

    console.warn(
      "Realtime:",
      error
    );
  }
}

/* =========================
   AUTH STATE
   ========================= */

async function refreshAuth() {

  await getCurrentUser();

  if (currentUser) {
    await loadProfile();
  } else {
    currentProfile = null;
  }

  renderAuthPanel();
}

supabaseClient.auth.onAuthStateChange(
  async () => {

    await refreshAuth();

    if (
      currentProfile?.role ===
      "admin"
    ) {
      loadAdminOrders();
    }
  }
);

/* =========================
   INITIALISATION
   ========================= */

async function init() {

  updateCartCount();

  renderCart();

  await refreshAuth();

  await loadProducts();

  subscribeToOrders();

  /* Page d'accueil par défaut */
  goTo("accueil");
}

init();
