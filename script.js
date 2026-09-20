const SUPABASE_URL = "https://oabjxsclanvgmvnezabj.supabase.co";
const SUPABASE_KEY = "sb_publishable_Wccb86Hdfbxwx1tj0ciPDg_aRv8yqje";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const WHATSAPP = "221787488199";

let currentUser = null;
let products = [];
let cart = JSON.parse(localStorage.getItem("mhd_cart") || "[]");

// =========================
// OUTILS
// =========================

const $ = (id) => document.getElementById(id);

function escapeHTML(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function money(value) {
  return Number(value || 0).toLocaleString("fr-FR") + " FCFA";
}

// =========================
// NAVIGATION
// =========================

function goTo(page) {
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
  });

  const target = $(page);

  if (target) {
    target.classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.classList.remove("active");
  });

  document
    .querySelectorAll(`[data-go="${page}"]`)
    .forEach((button) => button.classList.add("active"));

  if (page === "panier") renderCart();
  if (page === "commande") prepareCheckout();
  if (page === "compte") loadProfile();
  if (page === "admin") openAdmin();
}

// =========================
// CLICS — VERSION IPHONE
// =========================

document.addEventListener("click", function (event) {

  const element = event.target instanceof Element
    ? event.target
    : event.target.parentElement;

  if (!element) return;

  // Navigation
  const navigation = element.closest("[data-go]");

  if (navigation) {
    event.preventDefault();
    event.stopPropagation();

    const page = navigation.getAttribute("data-go");

    if (page) {
      goTo(page);
    }

    return;
  }

  // Ajouter au panier
  const addButton = element.closest("[data-add]");

  if (addButton) {
    event.preventDefault();
    event.stopPropagation();

    addToCart(addButton.getAttribute("data-add"));
    return;
  }

  // Supprimer du panier
  const removeButton = element.closest("[data-remove]");

  if (removeButton) {
    event.preventDefault();

    removeFromCart(removeButton.getAttribute("data-remove"));
    return;
  }

  // Quantité +
  const plusButton = element.closest("[data-plus]");

  if (plusButton) {
    event.preventDefault();

    changeQuantity(
      plusButton.getAttribute("data-plus"),
      1
    );

    return;
  }

  // Quantité -
  const minusButton = element.closest("[data-minus]");

  if (minusButton) {
    event.preventDefault();

    changeQuantity(
      minusButton.getAttribute("data-minus"),
      -1
    );

    return;
  }

  // MHD IA
  if (element.closest("#mhdIAButton")) {
    event.preventDefault();
    toggleIA();
    return;
  }

  // Fermer IA
  if (element.closest("#closeIA")) {
    event.preventDefault();
    closeIA();
    return;
  }

  // Déconnexion
  if (element.closest("#logoutBtn")) {
    event.preventDefault();
    logout();
    return;
  }

  // Admin quitter
  if (element.closest("#adminExit")) {
    event.preventDefault();
    goTo("accueil");
    return;
  }

  // Connexion
  if (element.closest("#loginBtn")) {
    event.preventDefault();
    login();
    return;
  }

  // Inscription
  if (element.closest("#signupBtn")) {
    event.preventDefault();
    signup();
    return;
  }

  // Google
  if (element.closest("#googleBtn")) {
    event.preventDefault();
    loginGoogle();
    return;
  }

  // Apple
  if (element.closest("#appleBtn")) {
    event.preventDefault();
    loginApple();
    return;
  }

  // Sauvegarde profil
  if (element.closest("#saveProfile")) {
    event.preventDefault();
    saveProfile();
    return;
  }

  // Vérification téléphone
  if (element.closest("#sendPhoneCode")) {
    event.preventDefault();
    sendPhoneCode();
    return;
  }

  if (element.closest("#verifyPhoneCode")) {
    event.preventDefault();
    verifyPhoneCode();
    return;
  }

  // Commander
  if (element.closest("#siteOrderBtn")) {
    event.preventDefault();
    placeOrder("site");
    return;
  }

  if (element.closest("#whatsappOrderBtn")) {
    event.preventDefault();
    placeOrder("whatsapp");
    return;
  }

  // Admin produit
  if (element.closest("#addProductBtn")) {
    event.preventDefault();
    addProduct();
    return;
  }

  const deleteProductButton = element.closest("[data-delete-product]");

  if (deleteProductButton) {
    event.preventDefault();

    deleteProduct(
      deleteProductButton.getAttribute("data-delete-product")
    );

    return;
  }

  const statusButton = element.closest("[data-order-status]");

  if (statusButton) {
    event.preventDefault();

    updateOrderStatus(
      statusButton.getAttribute("data-order-status"),
      statusButton.getAttribute("data-status")
    );

    return;
  }

});

// =========================
// AUTH
// =========================

async function login() {

  const email = $("loginEmail")?.value.trim();
  const password = $("loginPassword")?.value;

  if (!email || !password) {
    alert("Entre ton email et ton mot de passe.");
    return;
  }

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = data.user;

  alert("Connexion réussie !");
  await loadUser();

  goTo("compte");
}

async function signup() {

  const email = $("signupEmail")?.value.trim();
  const password = $("signupPassword")?.value;

  if (!email || !password) {
    alert("Remplis tous les champs.");
    return;
  }

  if (password.length < 6) {
    alert("Le mot de passe doit avoir au moins 6 caractères.");
    return;
  }

  const { data, error } = await db.auth.signUp({
    email,
    password
  });

  if (error) {
    alert(error.message);
    return;
  }

  currentUser = data.user;

  if (currentUser) {
    await db.from("profiles").upsert({
      id: currentUser.id
    });
  }

  alert("Compte créé !");
  goTo("compte");
}

async function loginGoogle() {

  const { error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.href
    }
  });

  if (error) {
    alert(error.message);
  }
}

async function loginApple() {

  const { error } = await db.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: window.location.href
    }
  });

  if (error) {
    alert(
      "Apple Login doit d'abord être configuré dans Supabase."
    );
  }
}

async function logout() {

  await db.auth.signOut();

  currentUser = null;

  alert("Déconnexion réussie.");

  goTo("accueil");
}

// =========================
// UTILISATEUR
// =========================

async function loadUser() {

  const { data } = await db.auth.getUser();

  currentUser = data?.user || null;

  if (!currentUser) return;

  await loadProfile();
}

async function loadProfile() {

  if (!currentUser) {
    const { data } = await db.auth.getUser();
    currentUser = data?.user || null;
  }

  if (!currentUser) return;

  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (!data) return;

  if ($("firstName")) $("firstName").value = data.first_name || "";
  if ($("lastName")) $("lastName").value = data.last_name || "";
  if ($("profilePhone")) $("profilePhone").value = data.phone || "";

  const verified = $("phoneStatus");

  if (verified) {
    verified.textContent =
      data.phone_verified
        ? "✓ Numéro vérifié"
        : "⚠ Numéro non vérifié";
  }

  if ($("profileEmail")) {
    $("profileEmail").value = currentUser.email || "";
  }
}

async function saveProfile() {

  if (!currentUser) {
    alert("Connecte-toi d'abord.");
    goTo("compte");
    return;
  }

  const firstName = $("firstName")?.value.trim() || "";
  const lastName = $("lastName")?.value.trim() || "";
  const phone = $("profilePhone")?.value.trim() || "";

  const { error } = await db
    .from("profiles")
    .upsert({
      id: currentUser.id,
      first_name: firstName,
      last_name: lastName,
      phone
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Profil enregistré !");
}

// =========================
// TÉLÉPHONE OTP
// =========================

async function sendPhoneCode() {

  if (!currentUser) {
    alert("Connecte-toi d'abord.");
    return;
  }

  const phone = $("profilePhone")?.value.trim();

  if (!phone) {
    alert("Entre ton numéro de téléphone.");
    return;
  }

  const { error } = await db.auth.updateUser({
    phone
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Code envoyé par SMS.");
}

async function verifyPhoneCode() {

  if (!currentUser) return;

  const phone = $("profilePhone")?.value.trim();
  const token = $("phoneCode")?.value.trim();

  if (!phone || !token) {
    alert("Entre le code reçu par SMS.");
    return;
  }

  const { error } = await db.auth.verifyOtp({
    phone,
    token,
    type: "phone_change"
  });

  if (error) {
    alert(error.message);
    return;
  }

  await db
    .from("profiles")
    .update({
      phone,
      phone_verified: true
    })
    .eq("id", currentUser.id);

  alert("Numéro vérifié !");

  await loadProfile();
}

// =========================
// PRODUITS
// =========================

async function loadProducts() {

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  products = data || [];

  renderProducts();
}

function renderProducts() {

  const container = $("productGrid");

  if (!container) return;

  const search = $("search")?.value.toLowerCase().trim() || "";

  const filtered = products.filter((product) => {

    return (
      product.name.toLowerCase().includes(search) ||
      product.category.toLowerCase().includes(search)
    );

  });

  if (!filtered.length) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>Aucun produit</h3>
        <p>Essaie une autre recherche.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = filtered.map((product) => {

    return `
      <article class="product-card">

        <div class="product-image">

          ${
            product.image
              ? `<img src="${product.image}" alt="${escapeHTML(product.name)}">`
              : `<div class="no-image">🎮</div>`
          }

        </div>

        <div class="product-info">

          <div class="product-category">
            ${escapeHTML(product.category)}
          </div>

          <h3>
            ${escapeHTML(product.name)}
          </h3>

          <strong>
            ${money(product.price)}
          </strong>

          <button
            class="primary-button"
            data-add="${product.id}">
            Ajouter au panier
          </button>

        </div>

      </article>
    `;

  }).join("");
}

// =========================
// PANIER
// =========================

function saveCart() {

  localStorage.setItem(
    "mhd_cart",
    JSON.stringify(cart)
  );

  updateCartCount();
}

function updateCartCount() {

  const count = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  if ($("cartCount")) {
    $("cartCount").textContent = count;
  }
}

function addToCart(productId) {

  const product = products.find(
    (p) => String(p.id) === String(productId)
  );

  if (!product) {
    alert("Produit introuvable.");
    return;
  }

  const existing = cart.find(
    (item) => String(item.id) === String(product.id)
  );

  if (existing) {
    existing.quantity++;
  } else {

    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1
    });

  }

  saveCart();

  alert("Produit ajouté au panier 🛒");
}

function removeFromCart(productId) {

  cart = cart.filter(
    (item) => String(item.id) !== String(productId)
  );

  saveCart();
  renderCart();
}

function changeQuantity(productId, amount) {

  const item = cart.find(
    (item) => String(item.id) === String(productId)
  );

  if (!item) return;

  item.quantity += amount;

  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  saveCart();
  renderCart();
}

function renderCart() {

  const container = $("cartItems");

  if (!container) return;

  if (!cart.length) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>Ton panier est vide 🛒</h3>
        <button
          class="primary-button"
          data-go="boutique">
          Voir la boutique
        </button>
      </div>
    `;

    if ($("cartTotal")) {
      $("cartTotal").textContent = "0 FCFA";
    }

    return;
  }

  let total = 0;

  container.innerHTML = cart.map((item) => {

    const subtotal =
      Number(item.price) * Number(item.quantity);

    total += subtotal;

    return `
      <div class="cart-item">

        ${
          item.image
            ? `<img src="${item.image}" alt="">`
            : ""
        }

        <div class="cart-item-info">

          <strong>${escapeHTML(item.name)}</strong>

          <span>${money(item.price)}</span>

          <div class="quantity-controls">

            <button data-minus="${item.id}">
              −
            </button>

            <span>${item.quantity}</span>

            <button data-plus="${item.id}">
              +
            </button>

          </div>

        </div>

        <button
          class="delete-button"
          data-remove="${item.id}">
          🗑️
        </button>

      </div>
    `;

  }).join("");

  if ($("cartTotal")) {
    $("cartTotal").textContent = money(total);
  }
}

// =========================
// COMMANDE
// =========================

function prepareCheckout() {

  if (!currentUser) {
    alert("Connecte-toi avant de commander.");
    goTo("compte");
    return;
  }

  if (!cart.length) {
    alert("Ton panier est vide.");
    goTo("boutique");
    return;
  }

  loadProfile();
}

async function placeOrder(method) {

  if (!currentUser) {
    alert("Connecte-toi avant de commander.");
    goTo("compte");
    return;
  }

  if (!cart.length) {
    alert("Ton panier est vide.");
    return;
  }

  const firstName = $("orderFirstName")?.value.trim() || "";
  const lastName = $("orderLastName")?.value.trim() || "";
  const phone = $("orderPhone")?.value.trim() || "";

  if (!firstName || !lastName || !phone) {
    alert("Remplis ton prénom, ton nom et ton numéro.");
    return;
  }

  const { data: profile } = await db
    .from("profiles")
    .select("phone_verified")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (!profile?.phone_verified) {
    alert("Ton numéro doit être vérifié avant de commander.");
    goTo("compte");
    return;
  }

  const total = cart.reduce(
    (sum, item) =>
      sum + Number(item.price) * Number(item.quantity),
    0
  );

  const { error } = await db
    .from("orders")
    .insert({
      user_id: currentUser.id,
      first_name: firstName,
      last_name: lastName,
      phone,
      phone_verified: true,
      items: cart,
      total,
      method,
      status: "new"
    });

  if (error) {
    alert(error.message);
    return;
  }

  const message =
    `🛍️ Nouvelle commande MHD SHOP%0A%0A` +
    `Client : ${firstName} ${lastName}%0A` +
    `Téléphone : ${phone}%0A%0A` +
    cart.map(
      item =>
        `• ${item.name} x${item.quantity} — ${money(
          item.price * item.quantity
        )}`
    ).join("%0A") +
    `%0A%0ATotal : ${money(total)}`;

  cart = [];
  saveCart();

  if (method === "whatsapp") {

    window.location.href =
      `https://wa.me/${WHATSAPP}?text=${message}`;

    return;
  }

  alert(
    "Commande envoyée ! MHD SHOP a bien reçu ta commande."
  );

  goTo("accueil");
}

// =========================
// ADMIN
// =========================

async function isAdmin() {

  if (!currentUser) return false;

  const { data, error } = await db
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .maybeSingle();

  if (error) return false;

  return data?.role === "admin";
}

async function openAdmin() {

  if (!currentUser) {
    alert("Connecte-toi.");
    goTo("compte");
    return;
  }

  const admin = await isAdmin();

  if (!admin) {
    alert("Accès administrateur refusé.");
    goTo("accueil");
    return;
  }

  await loadAdminProducts();
  await loadAdminOrders();
}

async function addProduct() {

  if (!(await isAdmin())) {
    alert("Accès refusé.");
    return;
  }

  const name = $("productName")?.value.trim();
  const category = $("productCategory")?.value.trim();
  const price = Number($("productPrice")?.value);
  const image = $("productImage")?.value.trim() || "";

  if (!name || !category || !price) {
    alert("Remplis tous les champs du produit.");
    return;
  }

  const { error } = await db
    .from("products")
    .insert({
      name,
      category,
      price,
      image,
      available: true
    });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Produit ajouté !");

  if ($("productName")) $("productName").value = "";
  if ($("productCategory")) $("productCategory").value = "";
  if ($("productPrice")) $("productPrice").value = "";
  if ($("productImage")) $("productImage").value = "";

  await loadProducts();
  await loadAdminProducts();
}

async function loadAdminProducts() {

  const container = $("adminProducts");

  if (!container) return;

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  container.innerHTML = (data || []).map((product) => {

    return `
      <div class="admin-product">

        <div>
          <strong>${escapeHTML(product.name)}</strong>
          <small>${money(product.price)}</small>
        </div>

        <button
          class="delete-button"
          data-delete-product="${product.id}">
          Supprimer
        </button>

      </div>
    `;

  }).join("");
}

async function deleteProduct(id) {

  if (!(await isAdmin())) {
    alert("Accès refusé.");
    return;
  }

  if (!confirm("Supprimer ce produit ?")) return;

  const { error } = await db
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadProducts();
  await loadAdminProducts();

  alert("Produit supprimé.");
}

async function loadAdminOrders() {

  if (!(await isAdmin())) return;

  const container = $("adminOrders");

  if (!container) return;

  const { data, error } = await db
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  if (!data?.length) {

    container.innerHTML = `
      <div class="empty-state">
        <h3>Aucune commande</h3>
        <p>Les nouvelles commandes apparaîtront ici.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = data.map((order) => {

    return `
      <div class="admin-order">

        <div>
          <strong>
            ${escapeHTML(order.first_name)}
            ${escapeHTML(order.last_name)}
          </strong>

          <p>
            📞 ${escapeHTML(order.phone)}
          </p>

          <p>
            💰 ${money(order.total)}
          </p>

          <p>
            📦 ${escapeHTML(order.method)}
          </p>

          <p>
            Statut : ${escapeHTML(order.status)}
          </p>

        </div>

        <div class="order-actions">

          <button
            data-order-status="${order.id}"
            data-status="processing">
            En préparation
          </button>

          <button
            data-order-status="${order.id}"
            data-status="completed">
            Terminée
          </button>

        </div>

      </div>
    `;

  }).join("");
}

async function updateOrderStatus(id, status) {

  if (!(await isAdmin())) {
    alert("Accès refusé.");
    return;
  }

  const { error } = await db
    .from("orders")
    .update({ status })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  await loadAdminOrders();
}

// =========================
// MHD IA
// =========================

function toggleIA() {

  const box = $("mhdIABox");

  if (!box) return;

  box.classList.toggle("show");
}

function closeIA() {

  const box = $("mhdIABox");

  if (!box) return;

  box.classList.remove("show");
}

// =========================
// INITIALISATION
// =========================

async function init() {

  const { data } = await db.auth.getSession();

  currentUser = data?.session?.user || null;

  updateCartCount();

  await loadProducts();

  if (currentUser) {
    await loadProfile();
  }

  const search = $("search");

  if (search) {
    search.addEventListener("input", renderProducts);
  }

  // Auth automatique après retour Google/Apple
  db.auth.onAuthStateChange(async (_event, session) => {

    currentUser = session?.user || null;

    if (currentUser) {
      await loadProfile();
    }

  });

  // Commandes en temps réel pour l'admin
  db
    .channel("mhd-orders")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders"
      },
      async () => {

        if (currentUser && await isAdmin()) {
          await loadAdminOrders();
        }

      }
    )
    .subscribe();
}

document.addEventListener("DOMContentLoaded", init);
