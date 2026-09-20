/* =========================================================
   MHD SHOP — SCRIPT V7
   Navigation + panier + compte + produits + commandes + admin
   ========================================================= */

const SUPABASE_URL = "https://oabjxsclanvgmvnezabj.supabase.co";
const SUPABASE_KEY = "sb_publishable_Wccb86Hdfbxwx1tj0ciPDg_aRv8yqje";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const WHATSAPP = "221787488199";

let currentUser = null;
let products = [];

let cart = [];

try {
  cart = JSON.parse(localStorage.getItem("mhd_cart") || "[]");
  if (!Array.isArray(cart)) cart = [];
} catch {
  cart = [];
}


/* =========================================================
   OUTILS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function money(value) {
  return Number(value || 0).toLocaleString("fr-FR") + " FCFA";
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function goTo(pageId) {

  const pages = document.querySelectorAll(".page");

  pages.forEach(function(page) {
    page.classList.remove("active");
  });

  const page = $(pageId);

  if (!page) {
    console.warn("Page introuvable :", pageId);
    return;
  }

  page.classList.add("active");

  document.querySelectorAll(".bottom-nav [data-go]").forEach(
    function(button) {

      button.classList.remove("active");

      if (button.dataset.go === pageId) {
        button.classList.add("active");
      }

    }
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  if (pageId === "panier") {
    renderCart();
  }

  if (pageId === "commande") {
    prepareCheckout();
  }

  if (pageId === "compte") {
    loadProfile();
  }

  if (pageId === "admin") {
    openAdmin();
  }
}


/* =========================================================
   GESTION UNIVERSELLE DES BOUTONS
   ========================================================= */

document.addEventListener("click", function(event) {

  let target = event.target;

  if (!(target instanceof Element)) {
    target = target.parentElement;
  }

  if (!target) return;


  /* Navigation */

  const navigationButton = target.closest("[data-go]");

  if (navigationButton) {

    event.preventDefault();
    event.stopPropagation();

    const pageId =
      navigationButton.getAttribute("data-go");

    goTo(pageId);

    return;
  }


  /* Ajouter panier */

  const addButton = target.closest("[data-add]");

  if (addButton) {

    event.preventDefault();

    addToCart(
      addButton.getAttribute("data-add")
    );

    return;
  }


  /* Supprimer panier */

  const removeButton =
    target.closest("[data-remove]");

  if (removeButton) {

    event.preventDefault();

    removeFromCart(
      removeButton.getAttribute("data-remove")
    );

    return;
  }


  /* + */

  const plusButton =
    target.closest("[data-plus]");

  if (plusButton) {

    event.preventDefault();

    changeQuantity(
      plusButton.getAttribute("data-plus"),
      1
    );

    return;
  }


  /* - */

  const minusButton =
    target.closest("[data-minus]");

  if (minusButton) {

    event.preventDefault();

    changeQuantity(
      minusButton.getAttribute("data-minus"),
      -1
    );

    return;
  }


  /* Connexion */

  if (target.closest("#loginBtn")) {

    event.preventDefault();

    login();

    return;
  }


  /* Inscription */

  if (target.closest("#signupBtn")) {

    event.preventDefault();

    signup();

    return;
  }


  /* Google */

  if (target.closest("#googleBtn")) {

    event.preventDefault();

    loginGoogle();

    return;
  }


  /* Apple */

  if (target.closest("#appleBtn")) {

    event.preventDefault();

    loginApple();

    return;
  }


  /* Sauvegarde */

  if (target.closest("#saveProfile")) {

    event.preventDefault();

    saveProfile();

    return;
  }


  /* SMS */

  if (target.closest("#sendPhoneCode")) {

    event.preventDefault();

    sendPhoneCode();

    return;
  }


  if (target.closest("#verifyPhoneCode")) {

    event.preventDefault();

    verifyPhoneCode();

    return;
  }


  /* Commande site */

  if (target.closest("#siteOrderBtn")) {

    event.preventDefault();

    placeOrder("site");

    return;
  }


  /* Commande WhatsApp */

  if (target.closest("#whatsappOrderBtn")) {

    event.preventDefault();

    placeOrder("whatsapp");

    return;
  }


  /* Ajouter produit admin */

  if (target.closest("#addProductBtn")) {

    event.preventDefault();

    addProduct();

    return;
  }


  /* Supprimer produit */

  const deleteProductButton =
    target.closest("[data-delete-product]");

  if (deleteProductButton) {

    event.preventDefault();

    deleteProduct(
      deleteProductButton.dataset.deleteProduct
    );

    return;
  }


  /* Statut commande */

  const orderStatusButton =
    target.closest("[data-order-status]");

  if (orderStatusButton) {

    event.preventDefault();

    updateOrderStatus(
      orderStatusButton.dataset.orderStatus,
      orderStatusButton.dataset.status
    );

    return;
  }


  /* Déconnexion */

  if (target.closest("#logoutBtn")) {

    event.preventDefault();

    logout();

    return;
  }


  /* Quitter admin */

  if (target.closest("#adminExit")) {

    event.preventDefault();

    goTo("accueil");

    return;
  }


  /* MHD IA */

  if (target.closest("#mhdIAButton")) {

    event.preventDefault();

    toggleIA();

    return;
  }


  if (target.closest("#closeIA")) {

    event.preventDefault();

    closeIA();

    return;
  }

});


/* =========================================================
   AUTHENTIFICATION
   ========================================================= */

async function login() {

  const email =
    $("loginEmail")?.value.trim();

  const password =
    $("loginPassword")?.value;

  if (!email || !password) {

    alert(
      "Entre ton email et ton mot de passe."
    );

    return;
  }


  const result =
    await supabaseClient.auth.signInWithPassword({
      email: email,
      password: password
    });


  if (result.error) {

    alert(result.error.message);

    return;
  }


  currentUser = result.data.user;

  await loadUser();

  alert("Connexion réussie !");

  goTo("compte");
}


async function signup() {

  const email =
    $("signupEmail")?.value.trim();

  const password =
    $("signupPassword")?.value;


  if (!email || !password) {

    alert(
      "Remplis ton email et ton mot de passe."
    );

    return;
  }


  if (password.length < 6) {

    alert(
      "Le mot de passe doit contenir au moins 6 caractères."
    );

    return;
  }


  const result =
    await supabaseClient.auth.signUp({
      email: email,
      password: password
    });


  if (result.error) {

    alert(result.error.message);

    return;
  }


  currentUser =
    result.data.user;


  if (currentUser) {

    await supabaseClient
      .from("profiles")
      .upsert({
        id: currentUser.id
      });

  }


  alert("Compte créé !");

  goTo("compte");
}


async function loginGoogle() {

  const result =
    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href
      }
    });


  if (result.error) {

    alert(result.error.message);

  }
}


async function loginApple() {

  const result =
    await supabaseClient.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: window.location.href
      }
    });


  if (result.error) {

    alert(
      "Apple Login doit être configuré dans Supabase."
    );

  }
}


async function logout() {

  await supabaseClient.auth.signOut();

  currentUser = null;

  goTo("accueil");

  alert("Déconnexion réussie.");
}


/* =========================================================
   UTILISATEUR
   ========================================================= */

async function loadUser() {

  const result =
    await supabaseClient.auth.getUser();

  currentUser =
    result.data?.user || null;


  if (currentUser) {
    await loadProfile();
  }
}


async function loadProfile() {

  if (!currentUser) {

    const result =
      await supabaseClient.auth.getUser();

    currentUser =
      result.data?.user || null;
  }


  if (!currentUser) return;


  const result =
    await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();


  if (result.error) {

    console.error(
      "Erreur profil :",
      result.error
    );

    return;
  }


  const profile =
    result.data;


  if ($("profileEmail")) {
    $("profileEmail").value =
      currentUser.email || "";
  }


  if (!profile) return;


  if ($("firstName")) {
    $("firstName").value =
      profile.first_name || "";
  }


  if ($("lastName")) {
    $("lastName").value =
      profile.last_name || "";
  }


  if ($("profilePhone")) {
    $("profilePhone").value =
      profile.phone || "";
  }


  if ($("phoneStatus")) {

    $("phoneStatus").textContent =
      profile.phone_verified
        ? "✓ Numéro vérifié"
        : "⚠ Numéro non vérifié";

  }
}


async function saveProfile() {

  if (!currentUser) {

    alert(
      "Connecte-toi d'abord."
    );

    return;
  }


  const firstName =
    $("firstName")?.value.trim() || "";

  const lastName =
    $("lastName")?.value.trim() || "";

  const phone =
    $("profilePhone")?.value.trim() || "";


  const result =
    await supabaseClient
      .from("profiles")
      .upsert({
        id: currentUser.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone
      });


  if (result.error) {

    alert(result.error.message);

    return;
  }


  alert(
    "Profil enregistré !"
  );

  await loadProfile();
}


/* =========================================================
   VÉRIFICATION TÉLÉPHONE
   ========================================================= */

async function sendPhoneCode() {

  if (!currentUser) {

    alert(
      "Connecte-toi d'abord."
    );

    return;
  }


  const phone =
    $("profilePhone")?.value.trim();


  if (!phone) {

    alert(
      "Entre ton numéro."
    );

    return;
  }


  const result =
    await supabaseClient.auth.updateUser({
      phone: phone
    });


  if (result.error) {

    alert(result.error.message);

    return;
  }


  alert(
    "Le code de vérification a été envoyé."
  );
}


async function verifyPhoneCode() {

  if (!currentUser) return;


  const phone =
    $("profilePhone")?.value.trim();

  const token =
    $("phoneCode")?.value.trim();


  if (!phone || !token) {

    alert(
      "Entre le code reçu par SMS."
    );

    return;
  }


  const result =
    await supabaseClient.auth.verifyOtp({
      phone: phone,
      token: token,
      type: "phone_change"
    });


  if (result.error) {

    alert(result.error.message);

    return;
  }


  await supabaseClient
    .from("profiles")
    .update({
      phone: phone,
      phone_verified: true
    })
    .eq("id", currentUser.id);


  alert(
    "Numéro vérifié avec succès !"
  );


  await loadProfile();
}


/* =========================================================
   PRODUITS
   ========================================================= */

async function loadProducts() {

  const result =
    await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  if (result.error) {

    console.error(
      "Erreur produits :",
      result.error
    );

    return;
  }


  products =
    result.data || [];


  renderProducts();

  renderHomeProducts();
}


function productCard(product) {

  const image =
    product.image
      ? `
        <img
          src="${escapeHTML(product.image)}"
          alt="${escapeHTML(product.name)}">
      `
      : `
        <div class="no-image">
          🎮
        </div>
      `;


  return `
    <article class="product-card">

      <div class="product-image">
        ${image}
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
          type="button"
          class="primary-button"
          data-add="${product.id}">

          Ajouter au panier

        </button>

      </div>

    </article>
  `;
}


function renderProducts() {

  const container =
    $("productGrid");

  if (!container) return;


  const search =
    $("search")?.value
      .toLowerCase()
      .trim() || "";


  const filtered =
    products.filter(function(product) {

      return (
        String(product.name)
          .toLowerCase()
          .includes(search)
        ||
        String(product.category)
          .toLowerCase()
          .includes(search)
      );

    });


  if (!filtered.length) {

    container.innerHTML = `
      <div class="empty-state">

        <h3>Aucun produit</h3>

        <p>
          Aucun produit ne correspond à ta recherche.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML =
    filtered
      .map(productCard)
      .join("");
}


function renderHomeProducts() {

  const container =
    $("homeProducts");

  if (!container) return;


  const featured =
    products.slice(0, 4);


  if (!featured.length) {

    container.innerHTML = `
      <div class="empty-state">
        <p>Les produits arrivent bientôt.</p>
      </div>
    `;

    return;
  }


  container.innerHTML =
    featured
      .map(productCard)
      .join("");
}


/* =========================================================
   PANIER
   ========================================================= */

function saveCart() {

  localStorage.setItem(
    "mhd_cart",
    JSON.stringify(cart)
  );

  updateCartCount();
}


function updateCartCount() {

  const count =
    cart.reduce(
      function(total, item) {
        return total + Number(item.quantity || 0);
      },
      0
    );


  if ($("cartCount")) {

    $("cartCount").textContent =
      count;

  }
}


function addToCart(productId) {

  const product =
    products.find(function(product) {

      return String(product.id) ===
        String(productId);

    });


  if (!product) {

    alert(
      "Produit introuvable."
    );

    return;
  }


  const existing =
    cart.find(function(item) {

      return String(item.id) ===
        String(product.id);

    });


  if (existing) {

    existing.quantity =
      Number(existing.quantity || 0) + 1;

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

  renderCart();


  alert(
    "Produit ajouté au panier 🛒"
  );
}


function removeFromCart(productId) {

  cart =
    cart.filter(function(item) {

      return String(item.id) !==
        String(productId);

    });


  saveCart();

  renderCart();
}


function changeQuantity(productId, amount) {

  const item =
    cart.find(function(item) {

      return String(item.id) ===
        String(productId);

    });


  if (!item) return;


  item.quantity =
    Number(item.quantity || 0) + amount;


  if (item.quantity <= 0) {

    removeFromCart(productId);

    return;
  }


  saveCart();

  renderCart();
}


function renderCart() {

  const container =
    $("cartItems");

  if (!container) return;


  if (!cart.length) {

    container.innerHTML = `
      <div class="empty-state">

        <h3>
          Ton panier est vide 🛒
        </h3>

        <button
          type="button"
          class="primary-button"
          data-go="boutique">

          Voir la boutique

        </button>

      </div>
    `;


    if ($("cartTotal")) {
      $("cartTotal").textContent =
        "0 FCFA";
    }

    return;
  }


  let total = 0;


  container.innerHTML =
    cart.map(function(item) {

      const subtotal =
        Number(item.price) *
        Number(item.quantity);


      total += subtotal;


      return `
        <div class="cart-item">

          ${
            item.image
              ? `
                <img
                  src="${escapeHTML(item.image)}"
                  alt="">
              `
              : ""
          }

          <div class="cart-item-info">

            <strong>
              ${escapeHTML(item.name)}
            </strong>

            <span>
              ${money(item.price)}
            </span>

            <div class="quantity-controls">

              <button
                type="button"
                data-minus="${item.id}">
                −
              </button>

              <span>
                ${item.quantity}
              </span>

              <button
                type="button"
                data-plus="${item.id}">
                +
              </button>

            </div>

          </div>


          <button
            type="button"
            class="delete-button"
            data-remove="${item.id}">

            🗑️

          </button>

        </div>
      `;

    }).join("");


  if ($("cartTotal")) {

    $("cartTotal").textContent =
      money(total);

  }
}


/* =========================================================
   CHECKOUT
   ========================================================= */

async function prepareCheckout() {

  if (!currentUser) {

    alert(
      "Connecte-toi avant de commander."
    );

    goTo("compte");

    return;
  }


  if (!cart.length) {

    alert(
      "Ton panier est vide."
    );

    goTo("boutique");

    return;
  }


  await loadProfile();


  const result =
    await supabaseClient
      .from("profiles")
      .select("first_name,last_name,phone")
      .eq("id", currentUser.id)
      .maybeSingle();


  if (result.data) {

    if ($("orderFirstName")) {
      $("orderFirstName").value =
        result.data.first_name || "";
    }

    if ($("orderLastName")) {
      $("orderLastName").value =
        result.data.last_name || "";
    }

    if ($("orderPhone")) {
      $("orderPhone").value =
        result.data.phone || "";
    }

  }
}


async function placeOrder(method) {

  if (!currentUser) {

    alert(
      "Connecte-toi avant de commander."
    );

    goTo("compte");

    return;
  }


  if (!cart.length) {

    alert(
      "Ton panier est vide."
    );

    return;
  }


  const firstName =
    $("orderFirstName")?.value.trim() || "";

  const lastName =
    $("orderLastName")?.value.trim() || "";

  const phone =
    $("orderPhone")?.value.trim() || "";


  if (!firstName ||
      !lastName ||
      !phone) {

    alert(
      "Remplis ton prénom, ton nom et ton numéro."
    );

    return;
  }


  const profile =
    await supabaseClient
      .from("profiles")
      .select("phone_verified")
      .eq("id", currentUser.id)
      .maybeSingle();


  if (!profile.data?.phone_verified) {

    alert(
      "Ton numéro doit être vérifié avant de commander."
    );

    goTo("compte");

    return;
  }


  const total =
    cart.reduce(
      function(sum, item) {

        return sum +
          Number(item.price) *
          Number(item.quantity);

      },
      0
    );


  const result =
    await supabaseClient
      .from("orders")
      .insert({
        user_id: currentUser.id,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        phone_verified: true,
        items: cart,
        total: total,
        method: method,
        status: "new"
      });


  if (result.error) {

    alert(
      result.error.message
    );

    return;
  }


  const text =
    "🛍️ Nouvelle commande MHD SHOP\n\n" +

    "Client : " +
    firstName +
    " " +
    lastName +
    "\n" +

    "Téléphone : " +
    phone +
    "\n\n" +

    cart.map(function(item) {

      return (
        "• " +
        item.name +
        " x" +
        item.quantity +
        " — " +
        money(
          Number(item.price) *
          Number(item.quantity)
        )
      );

    }).join("\n") +

    "\n\nTotal : " +
    money(total);


  cart = [];

  saveCart();


  if (method === "whatsapp") {

    window.location.href =
      "https://wa.me/" +
      WHATSAPP +
      "?text=" +
      encodeURIComponent(text);

    return;
  }


  alert(
    "Commande envoyée avec succès !"
  );


  goTo("accueil");
}


/* =========================================================
   ADMIN
   ========================================================= */

async function isAdmin() {

  if (!currentUser) return false;


  const result =
    await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .maybeSingle();


  if (result.error) {

    console.error(
      "Admin check :",
      result.error
    );

    return false;
  }


  return result.data?.role === "admin";
}


async function openAdmin() {

  if (!currentUser) {

    alert(
      "Connecte-toi d'abord."
    );

    goTo("compte");

    return;
  }


  const admin =
    await isAdmin();


  if (!admin) {

    alert(
      "Accès administrateur refusé."
    );

    goTo("accueil");

    return;
  }


  await loadAdminProducts();

  await loadAdminOrders();
}


async function addProduct() {

  if (!(await isAdmin())) {

    alert(
      "Accès refusé."
    );

    return;
  }


  const name =
    $("productName")?.value.trim();

  const category =
    $("productCategory")?.value.trim();

  const price =
    Number(
      $("productPrice")?.value
    );

  const image =
    $("productImage")?.value.trim() || "";


  if (!name ||
      !category ||
      !price) {

    alert(
      "Remplis le nom, la catégorie et le prix."
    );

    return;
  }


  const result =
    await supabaseClient
      .from("products")
      .insert({
        name: name,
        category: category,
        price: price,
        image: image,
        available: true
      });


  if (result.error) {

    alert(
      result.error.message
    );

    return;
  }


  alert(
    "Produit ajouté !"
  );


  if ($("productName"))
    $("productName").value = "";

  if ($("productCategory"))
    $("productCategory").value = "";

  if ($("productPrice"))
    $("productPrice").value = "";

  if ($("productImage"))
    $("productImage").value = "";


  await loadProducts();

  await loadAdminProducts();
}


async function loadAdminProducts() {

  const container =
    $("adminProducts");

  if (!container) return;


  const result =
    await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  if (result.error) {

    console.error(
      result.error
    );

    return;
  }


  const list =
    result.data || [];


  if (!list.length) {

    container.innerHTML = `
      <div class="empty-state">
        <p>Aucun produit.</p>
      </div>
    `;

    return;
  }


  container.innerHTML =
    list.map(function(product) {

      return `
        <div class="admin-product">

          <div>

            <strong>
              ${escapeHTML(product.name)}
            </strong>

            <small>
              ${money(product.price)}
            </small>

          </div>

          <button
            type="button"
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

    alert(
      "Accès refusé."
    );

    return;
  }


  const confirmed =
    window.confirm(
      "Supprimer ce produit ?"
    );


  if (!confirmed) return;


  const result =
    await supabaseClient
      .from("products")
      .delete()
      .eq("id", id);


  if (result.error) {

    alert(
      result.error.message
    );

    return;
  }


  await loadProducts();

  await loadAdminProducts();


  alert(
    "Produit supprimé."
  );
}


/* =========================================================
   COMMANDES ADMIN
   ========================================================= */

async function loadAdminOrders() {

  if (!(await isAdmin())) return;


  const container =
    $("adminOrders");

  if (!container) return;


  const result =
    await supabaseClient
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false
      });


  if (result.error) {

    console.error(
      "Commandes :",
      result.error
    );

    return;
  }


  const orders =
    result.data || [];


  if (!orders.length) {

    container.innerHTML = `
      <div class="empty-state">

        <h3>Aucune commande</h3>

        <p>
          Les nouvelles commandes apparaîtront ici.
        </p>

      </div>
    `;

    return;
  }


  container.innerHTML =
    orders.map(function(order) {

      return `
        <div class="admin-order">

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
            Statut :
            ${escapeHTML(order.status)}
          </p>


          <div class="order-actions">

            <button
              type="button"
              data-order-status="${order.id}"
              data-status="processing">

              En préparation

            </button>


            <button
              type="button"
              data-order-status="${order.id}"
              data-status="completed">

              Terminée

            </button>

          </div>

        </div>
      `;

    }).join("");
}


async function updateOrderStatus(
  id,
  status
) {

  if (!(await isAdmin())) {

    alert(
      "Accès refusé."
    );

    return;
  }


  const result =
    await supabaseClient
      .from("orders")
      .update({
        status: status
      })
      .eq("id", id);


  if (result.error) {

    alert(
      result.error.message
    );

    return;
  }


  await loadAdminOrders();
}


/* =========================================================
   MHD IA
   ========================================================= */

function toggleIA() {

  const box =
    $("mhdIABox");

  if (!box) return;

  box.classList.toggle("show");
}


function closeIA() {

  const box =
    $("mhdIABox");

  if (!box) return;

  box.classList.remove("show");
}


/* =========================================================
   RECHERCHE
   ========================================================= */

function setupSearch() {

  const search =
    $("search");

  if (!search) return;


  search.addEventListener(
    "input",
    function() {

      renderProducts();

    }
  );
}


/* =========================================================
   SESSION
   ========================================================= */

async function setupAuth() {

  const sessionResult =
    await supabaseClient.auth.getSession();


  currentUser =
    sessionResult.data?.session?.user ||
    null;


  if (currentUser) {
    await loadProfile();
  }


  supabaseClient.auth.onAuthStateChange(
    function(_event, session) {

      currentUser =
        session?.user || null;

    }
  );
}


/* =========================================================
   TEMPS RÉEL COMMANDES
   ========================================================= */

function setupRealtime() {

  supabaseClient
    .channel("mhd-shop-orders")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders"
      },
      function() {

        if (currentUser) {
          loadAdminOrders();
        }

      }
    )
    .subscribe();
}


/* =========================================================
   INITIALISATION
   ========================================================= */

async function init() {

  console.log(
    "🔥 MHD SHOP V7 chargé"
  );


  updateCartCount();

  setupSearch();

  await setupAuth();

  await loadProducts();

  renderCart();

  setupRealtime();


  /*
    On force l'accueil au démarrage.
  */

  goTo("accueil");
}


/* =========================================================
   LANCEMENT
   ========================================================= */

if (
  document.readyState === "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

} else {

  init();

}
