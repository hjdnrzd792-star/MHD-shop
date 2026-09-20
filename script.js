const SUPABASE_URL = "https://oabjxsclanvgmvnezabj.supabase.co";
const SUPABASE_KEY = "sb_publishable_Wccb86Hdfbxwx1tj0ciPDg_aRv8yqje";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const WHATSAPP = "221787488199";

let products = [];
let cart = JSON.parse(localStorage.getItem("mhd_cart") || "[]");
let currentUser = null;
let profile = null;
let selectedCategory = "Tous";
let editingProductId = null;
let currentImage = null;

/* =========================================================
   UTILITAIRES
========================================================= */

const $ = id => document.getElementById(id);

function money(value){
  return Number(value || 0).toLocaleString("fr-FR") + " FCFA";
}

function saveCart(){
  localStorage.setItem("mhd_cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount(){
  const count = cart.reduce((sum,item) => sum + Number(item.qty || 1),0);
  const el = $("cartCount");
  if(el) el.textContent = count;
}

function escapeHTML(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function notify(message){
  const old = document.querySelector(".mhd-toast");
  if(old) old.remove();

  const toast = document.createElement("div");
  toast.className = "mhd-toast";
  toast.textContent = message;

  Object.assign(toast.style,{
    position:"fixed",
    top:"90px",
    left:"50%",
    transform:"translateX(-50%)",
    zIndex:"9999",
    padding:"13px 17px",
    borderRadius:"16px",
    background:"rgba(15,20,30,.88)",
    border:"1px solid rgba(255,255,255,.16)",
    color:"#fff",
    backdropFilter:"blur(20px)",
    WebkitBackdropFilter:"blur(20px)",
    boxShadow:"0 15px 40px rgba(0,0,0,.35)",
    fontWeight:"800",
    fontSize:"13px",
    maxWidth:"90%",
    textAlign:"center"
  });

  document.body.appendChild(toast);

  setTimeout(()=>{
    toast.style.opacity="0";
    toast.style.transition=".25s";
    setTimeout(()=>toast.remove(),250);
  },2200);
}

/* =========================================================
   NAVIGATION — CORRECTION PRINCIPALE
========================================================= */

function goTo(pageId){

  const pages = document.querySelectorAll(".page");

  pages.forEach(page=>{
    page.classList.remove("active");
  });

  const target = document.getElementById(pageId);

  if(!target){
    console.warn("Page introuvable:",pageId);
    return;
  }

  target.classList.add("active");

  document.querySelectorAll(".liquid-nav button[data-go]")
    .forEach(button=>{
      button.classList.toggle(
        "active",
        button.dataset.go === pageId
      );
    });

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

  if(pageId === "boutique") renderProducts();
  if(pageId === "panier") renderCart();
  if(pageId === "compte") renderAccount();
  if(pageId === "admin") openAdmin();
  if(pageId === "commande") prepareCheckout();
}

/* Tous les boutons data-go fonctionnent ici */
document.addEventListener("click",event=>{

  const button = event.target.closest("[data-go]");

  if(!button) return;

  event.preventDefault();

  const page = button.dataset.go;

  if(page) goTo(page);
});

/* =========================================================
   AUTH
========================================================= */

async function loadUser(){

  const {data} = await supabase.auth.getSession();

  currentUser = data.session?.user || null;

  if(currentUser){
    await loadProfile();
  }

  renderAccount();
}

supabase.auth.onAuthStateChange(async(_event,session)=>{

  currentUser = session?.user || null;

  if(currentUser){
    setTimeout(loadProfile,0);
  }else{
    profile = null;
    renderAccount();
  }
});

/* =========================================================
   PROFIL
========================================================= */

async function loadProfile(){

  if(!currentUser) return;

  const {data,error} = await supabase
    .from("profiles")
    .select("*")
    .eq("id",currentUser.id)
    .maybeSingle();

  if(error){
    console.error(error);
    return;
  }

  profile = data;

  if(profile){
    if($("orderFirstName")) $("orderFirstName").value = profile.first_name || "";
    if($("orderLastName")) $("orderLastName").value = profile.last_name || "";
    if($("orderPhone")) $("orderPhone").value = profile.phone || "";
  }
}

async function saveProfile(){

  if(!currentUser){
    notify("Connecte-toi d'abord.");
    return;
  }

  const firstName = $("profileFirstName")?.value.trim() || "";
  const lastName = $("profileLastName")?.value.trim() || "";
  const phone = $("profilePhone")?.value.trim() || "";

  const {error} = await supabase
    .from("profiles")
    .upsert({
      id:currentUser.id,
      first_name:firstName,
      last_name:lastName,
      phone:phone
    });

  if(error){
    console.error(error);
    notify("Impossible d'enregistrer le profil.");
    return;
  }

  await loadProfile();

  notify("Profil enregistré ✅");
}

/* =========================================================
   COMPTE
========================================================= */

function renderAccount(){

  const panel = $("authPanel");

  if(!panel) return;

  if(!currentUser){

    panel.innerHTML = `
      <h2>Bienvenue 👋</h2>
      <p style="color:#9ca8bd">
        Connecte-toi pour gérer ton profil et tes commandes.
      </p>

      <label>Email</label>
      <input id="loginEmail" type="email" placeholder="ton@email.com">

      <label>Mot de passe</label>
      <input id="loginPassword" type="password" placeholder="Mot de passe">

      <button class="primary full" id="loginButton">
        🔐 Se connecter
      </button>

      <button class="secondary full" id="signupButton">
        ✨ Créer un compte
      </button>

      <button class="ghost full" id="googleButton">
        🌐 Continuer avec Google
      </button>

      <button class="ghost full" id="appleButton">
         Continuer avec Apple
      </button>
    `;

    $("loginButton").onclick = login;
    $("signupButton").onclick = signup;
    $("googleButton").onclick = loginGoogle;
    $("appleButton").onclick = loginApple;

    return;
  }

  const email = escapeHTML(currentUser.email || "");

  panel.innerHTML = `
    <div style="margin-bottom:18px">
      <small style="color:#63baff">COMPTE CONNECTÉ</small>
      <h2 style="margin:5px 0">${email}</h2>
    </div>

    <label>Prénom</label>
    <input
      id="profileFirstName"
      value="${escapeHTML(profile?.first_name || "")}"
      placeholder="Ton prénom"
    >

    <label>Nom</label>
    <input
      id="profileLastName"
      value="${escapeHTML(profile?.last_name || "")}"
      placeholder="Ton nom"
    >

    <label>Téléphone</label>
    <input
      id="profilePhone"
      type="tel"
      value="${escapeHTML(profile?.phone || "")}"
      placeholder="+221 77 000 00 00"
    >

    <div class="status-box">
      ${profile?.phone_verified
        ? "✅ Numéro vérifié"
        : "⚠️ Numéro non vérifié"}
    </div>

    <button class="primary full" id="saveProfileButton">
      💾 Enregistrer mon profil
    </button>

    <button class="secondary full" id="accountVerifyPhone">
      📲 Vérifier mon numéro
    </button>

    <button class="ghost full" id="logoutButton">
      🚪 Se déconnecter
    </button>

    <div style="
      margin-top:18px;
      padding:15px;
      border-radius:18px;
      background:rgba(22,140,255,.08);
      border:1px solid rgba(22,140,255,.15);
    ">
      <b>💬 Support vendeur</b>
      <p style="margin:7px 0;color:#9ca8bd">
        +221 78 748 81 99
      </p>
    </div>
  `;

  $("saveProfileButton").onclick = saveProfile;
  $("logoutButton").onclick = logout;
  $("accountVerifyPhone").onclick = verifyPhoneFromAccount;
}

/* =========================================================
   LOGIN
========================================================= */

async function login(){

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  if(!email || !password){
    notify("Remplis ton email et ton mot de passe.");
    return;
  }

  const {error} = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if(error){
    notify(error.message);
    return;
  }

  notify("Connexion réussie ✅");
  goTo("compte");
}

async function signup(){

  const email = $("loginEmail").value.trim();
  const password = $("loginPassword").value;

  if(!email || !password){
    notify("Remplis ton email et choisis un mot de passe.");
    return;
  }

  if(password.length < 6){
    notify("Le mot de passe doit avoir au moins 6 caractères.");
    return;
  }

  const {error} = await supabase.auth.signUp({
    email,
    password
  });

  if(error){
    notify(error.message);
    return;
  }

  notify("Compte créé. Vérifie ton email si demandé.");
}

async function loginGoogle(){

  const {error} = await supabase.auth.signInWithOAuth({
    provider:"google",
    options:{
      redirectTo:window.location.origin + window.location.pathname
    }
  });

  if(error) notify(error.message);
}

async function loginApple(){

  const {error} = await supabase.auth.signInWithOAuth({
    provider:"apple",
    options:{
      redirectTo:window.location.origin + window.location.pathname
    }
  });

  if(error) notify(error.message);
}

async function logout(){

  await supabase.auth.signOut();

  currentUser = null;
  profile = null;

  notify("Déconnexion effectuée.");
  goTo("accueil");
}

/* =========================================================
   TÉLÉPHONE
========================================================= */

async function sendPhoneOTP(){

  if(!currentUser){
    notify("Connecte-toi d'abord.");
    return;
  }

  const phone = $("orderPhone")?.value.trim();

  if(!phone){
    notify("Entre ton numéro de téléphone.");
    return;
  }

  const {error} = await supabase.auth.updateUser({
    phone
  });

  if(error){
    console.error(error);
    notify("Vérification SMS indisponible ou configuration SMS manquante.");
    return;
  }

  $("otpArea")?.classList.remove("hidden");

  if($("phoneStatus")){
    $("phoneStatus").textContent =
      "📲 Code envoyé. Entre le code reçu par SMS.";
  }

  notify("Code SMS envoyé.");
}

async function verifyPhone(){

  if(!currentUser) return;

  const phone = $("orderPhone")?.value.trim();
  const token = $("otpCode")?.value.trim();

  if(!phone || !token){
    notify("Entre le code reçu par SMS.");
    return;
  }

  const {error} = await supabase.auth.verifyOtp({
    phone,
    token,
    type:"phone_change"
  });

  if(error){
    console.error(error);
    notify("Code incorrect ou expiré.");
    return;
  }

  const {error:profileError} = await supabase
    .from("profiles")
    .upsert({
      id:currentUser.id,
      phone,
      phone_verified:true
    });

  if(profileError){
    console.error(profileError);
    notify("Numéro vérifié, mais profil non enregistré.");
    return;
  }

  await loadProfile();

  if($("phoneStatus")){
    $("phoneStatus").textContent =
      "✅ Numéro vérifié avec succès.";
  }

  notify("Numéro vérifié ✅");
}

async function verifyPhoneFromAccount(){

  const phone = $("profilePhone")?.value.trim();

  if(!phone){
    notify("Entre d'abord ton numéro.");
    return;
  }

  if(!currentUser){
    notify("Connecte-toi d'abord.");
    return;
  }

  const {error} = await supabase.auth.updateUser({phone});

  if(error){
    console.error(error);
    notify("La vérification SMS doit être configurée dans Supabase.");
    return;
  }

  const code = prompt("Entre le code reçu par SMS :");

  if(!code) return;

  const {error:verifyError} = await supabase.auth.verifyOtp({
    phone,
    token:code,
    type:"phone_change"
  });

  if(verifyError){
    notify("Code incorrect ou expiré.");
    return;
  }

  await supabase
    .from("profiles")
    .upsert({
      id:currentUser.id,
      phone,
      phone_verified:true
    });

  await loadProfile();
  renderAccount();

  notify("Numéro vérifié ✅");
}

/* =========================================================
   PRODUITS
========================================================= */

const demoProducts = [
  {
    id:"demo1",
    name:"Gaming Premium",
    category:"Gaming",
    price:5000,
    image:"",
    available:true
  },
  {
    id:"demo2",
    name:"Service Digital",
    category:"Digital",
    price:3000,
    image:"",
    available:true
  }
];

async function loadProducts(){

  const {data,error} = await supabase
    .from("products")
    .select("*")
    .order("created_at",{ascending:false});

  if(error){
    console.error(error);
    products = demoProducts;
  }else{
    products = data || [];
  }

  renderProducts();
  renderHomeProducts();
  renderCategories();
}

/* =========================================================
   CATÉGORIES
========================================================= */

function renderCategories(){

  const box = $("categories");

  if(!box) return;

  const cats = [
    "Tous",
    ...new Set(
      products
        .map(p=>p.category)
        .filter(Boolean)
    )
  ];

  box.innerHTML = cats.map(cat=>`
    <button
      class="${selectedCategory === cat ? "active":""}"
      data-category="${escapeHTML(cat)}"
    >
      ${escapeHTML(cat)}
    </button>
  `).join("");

  box.querySelectorAll("[data-category]").forEach(button=>{
    button.onclick = ()=>{
      selectedCategory = button.dataset.category;
      renderCategories();
      renderProducts();
    };
  });
}

/* =========================================================
   CARTES PRODUITS
========================================================= */

function productHTML(product){

  const image = product.image
    ? `<img class="product-image" src="${product.image}" alt="${escapeHTML(product.name)}">`
    : `
      <div class="product-image"
        style="
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:42px;
          background:linear-gradient(135deg,#0b1628,#111827);
        ">
        🎮
      </div>
    `;

  return `
    <article class="product-card">

      ${image}

      <h3>${escapeHTML(product.name)}</h3>

      <p>
        ${escapeHTML(product.category || "Digital")}
      </p>

      <div class="price">
        ${money(product.price)}
      </div>

      <div class="product-actions">

        <button
          data-add="${escapeHTML(product.id)}"
          ${product.available === false ? "disabled":""}
        >
          ${product.available === false
            ? "Indisponible"
            : "Ajouter 🛒"}
        </button>

      </div>

    </article>
  `;
}

function renderProducts(){

  const box = $("products");

  if(!box) return;

  const search =
    ($("search")?.value || "")
      .trim()
      .toLowerCase();

  let list = products.filter(product=>{

    const matchesCategory =
      selectedCategory === "Tous" ||
      product.category === selectedCategory;

    const matchesSearch =
      !search ||
      product.name.toLowerCase().includes(search) ||
      String(product.category || "")
        .toLowerCase()
        .includes(search);

    return matchesCategory && matchesSearch;
  });

  if(!list.length){
    box.innerHTML = `
      <div class="panel glass">
        <h3>Aucun produit trouvé 🔎</h3>
        <p style="color:#9ca8bd">
          Essaie une autre recherche.
        </p>
      </div>
    `;
    return;
  }

  box.innerHTML = list.map(productHTML).join("");

  box.querySelectorAll("[data-add]").forEach(button=>{
    button.onclick = ()=>{
      addToCart(button.dataset.add);
    };
  });
}

function renderHomeProducts(){

  const box = $("homeProducts");

  if(!box) return;

  box.innerHTML =
    products
      .filter(p=>p.available !== false)
      .slice(0,4)
      .map(productHTML)
      .join("");

  box.querySelectorAll("[data-add]").forEach(button=>{
    button.onclick = ()=>{
      addToCart(button.dataset.add);
    };
  });
}

$("search")?.addEventListener("input",renderProducts);

/* =========================================================
   PANIER
========================================================= */

function addToCart(id){

  const product = products.find(
    p=>String(p.id) === String(id)
  );

  if(!product){
    notify("Produit introuvable.");
    return;
  }

  const existing = cart.find(
    item=>String(item.id) === String(id)
  );

  if(existing){
    existing.qty = Number(existing.qty || 1) + 1;
  }else{
    cart.push({
      id:product.id,
      name:product.name,
      price:Number(product.price),
      image:product.image || "",
      qty:1
    });
  }

  saveCart();

  notify("Produit ajouté au panier 🛒");
}

function removeFromCart(id){

  cart = cart.filter(
    item=>String(item.id) !== String(id)
  );

  saveCart();
  renderCart();
}

function changeQty(id,delta){

  const item = cart.find(
    x=>String(x.id) === String(id)
  );

  if(!item) return;

  item.qty = Number(item.qty || 1) + delta;

  if(item.qty <= 0){
    removeFromCart(id);
    return;
  }

  saveCart();
  renderCart();
}

function cartTotal(){

  return cart.reduce(
    (sum,item)=>
      sum + Number(item.price) * Number(item.qty || 1),
    0
  );
}

function renderCart(){

  const box = $("cart");

  if(!box) return;

  if(!cart.length){

    box.innerHTML = `
      <div class="panel glass" style="text-align:center;padding:35px 20px">
        <div style="font-size:48px">🛒</div>
        <h2>Ton panier est vide</h2>
        <p style="color:#9ca8bd">
          Ajoute des produits pour commencer.
        </p>
        <button class="primary" data-go="boutique">
          🛍️ Voir la boutique
        </button>
      </div>
    `;

    return;
  }

  box.innerHTML = `

    ${cart.map(item=>`

      <div class="cart-item">

        ${
          item.image
            ? `<img src="${item.image}" alt="">`
            : `<div style="
                width:70px;
                height:70px;
                display:grid;
                place-items:center;
                border-radius:15px;
                background:#101827;
                font-size:28px
              ">🎮</div>`
        }

        <div class="cart-item-info">

          <b>${escapeHTML(item.name)}</b>

          <small>${money(item.price)}</small>

          <div style="
            display:flex;
            align-items:center;
            gap:7px;
            margin-top:8px;
          ">

            <button
              class="ghost"
              style="min-height:32px;padding:0 11px"
              data-minus="${item.id}"
            >−</button>

            <b>${item.qty}</b>

            <button
              class="ghost"
              style="min-height:32px;padding:0 11px"
              data-plus="${item.id}"
            >+</button>

          </div>

        </div>

        <button
          class="ghost"
          data-remove="${item.id}"
          style="min-height:40px;padding:0 10px"
        >
          🗑️
        </button>

      </div>

    `).join("")}

    <div class="cart-total glass">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">
        <span>Total</span>
        <strong>${money(cartTotal())}</strong>
      </div>

      <button
        class="primary full"
        id="checkoutButton"
      >
        🚀 Passer commande
      </button>

    </div>
  `;

  box.querySelectorAll("[data-minus]").forEach(btn=>{
    btn.onclick=()=>{
      changeQty(btn.dataset.minus,-1);
    };
  });

  box.querySelectorAll("[data-plus]").forEach(btn=>{
    btn.onclick=()=>{
      changeQty(btn.dataset.plus,1);
    };
  });

  box.querySelectorAll("[data-remove]").forEach(btn=>{
    btn.onclick=()=>{
      removeFromCart(btn.dataset.remove);
    };
  });

  $("checkoutButton").onclick=()=>{
    goTo("commande");
  };
}

/* =========================================================
   COMMANDE
========================================================= */

function prepareCheckout(){

  if(!cart.length){
    notify("Ton panier est vide.");
    goTo("boutique");
    return;
  }

  if(profile){

    if($("orderFirstName"))
      $("orderFirstName").value =
        profile.first_name || "";

    if($("orderLastName"))
      $("orderLastName").value =
        profile.last_name || "";

    if($("orderPhone"))
      $("orderPhone").value =
        profile.phone || "";
  }
}

function getOrderData(){

  return {
    first_name:$("orderFirstName")?.value.trim() || "",
    last_name:$("orderLastName")?.value.trim() || "",
    phone:$("orderPhone")?.value.trim() || ""
  };
}

function validateOrder(){

  if(!currentUser){
    notify("Connecte-toi avant de commander.");
    goTo("compte");
    return false;
  }

  if(!cart.length){
    notify("Ton panier est vide.");
    goTo("boutique");
    return false;
  }

  const data = getOrderData();

  if(!data.first_name || !data.last_name || !data.phone){
    notify("Prénom, nom et téléphone sont obligatoires.");
    return false;
  }

  if(!profile?.phone_verified){
    notify("Ton numéro doit être vérifié.");
    return false;
  }

  return true;
}

async function createOrder(method){

  if(!validateOrder()) return;

  const data = getOrderData();

  const items = cart.map(item=>({
    id:item.id,
    name:item.name,
    price:item.price,
    quantity:item.qty,
    image:item.image || ""
  }));

  const total = cartTotal();

  const {error} = await supabase
    .from("orders")
    .insert({
      user_id:currentUser.id,
      first_name:data.first_name,
      last_name:data.last_name,
      phone:data.phone,
      phone_verified:true,
      items,
      total,
      method,
      status:"new"
    });

  if(error){
    console.error(error);
    notify("Impossible d'enregistrer la commande.");
    return;
  }

  await supabase
    .from("profiles")
    .upsert({
      id:currentUser.id,
      first_name:data.first_name,
      last_name:data.last_name,
      phone:data.phone,
      phone_verified:true
    });

  await loadProfile();

  if(method === "whatsapp"){

    const text =
      `🛍️ MHD SHOP — Nouvelle commande%0A%0A` +
      `👤 ${encodeURIComponent(data.first_name)} ${encodeURIComponent(data.last_name)}%0A` +
      `📱 ${encodeURIComponent(data.phone)}%0A%0A` +
      `📦 Produits :%0A` +
      items.map(item=>
        `• ${encodeURIComponent(item.name)} x${item.quantity} — ${encodeURIComponent(money(item.price * item.quantity))}`
      ).join("%0A") +
      `%0A%0A💰 Total : ${encodeURIComponent(money(total))}`;

    window.open(
      `https://wa.me/${WHATSAPP}?text=${text}`,
      "_blank"
    );
  }

  cart = [];
  saveCart();

  notify("Commande envoyée ✅");

  setTimeout(()=>{
    goTo("accueil");
  },600);
}

$("sendOtp")?.addEventListener("click",sendPhoneOTP);
$("verifyOtp")?.addEventListener("click",verifyPhone);

$("orderOnSite")?.addEventListener("click",()=>{
  createOrder("site");
});

$("orderOnWhatsApp")?.addEventListener("click",()=>{
  createOrder("whatsapp");
});

/* =========================================================
   ADMIN
========================================================= */

async function isAdmin(){

  if(!currentUser) return false;

  const {data,error} = await supabase
    .from("profiles")
    .select("role")
    .eq("id",currentUser.id)
    .maybeSingle();

  if(error){
    console.error(error);
    return false;
  }

  return data?.role === "admin";
}

async function openAdmin(){

  if(!currentUser){
    notify("Connecte-toi avec le compte administrateur.");
    goTo("compte");
    return;
  }

  const admin = await isAdmin();

  if(!admin){
    notify("Accès administrateur refusé.");
    goTo("accueil");
    return;
  }

  loadAdminProducts();
  loadAdminOrders();
}

/* Navigation admin */

document.querySelectorAll("[data-admin-tab]").forEach(tab=>{

  tab.addEventListener("click",()=>{

    document.querySelectorAll("[data-admin-tab]")
      .forEach(x=>x.classList.remove("active"));

    tab.classList.add("active");

    const productsTab = $("adminProductsTab");
    const ordersTab = $("adminOrdersTab");

    if(tab.dataset.adminTab === "products"){
      productsTab?.classList.remove("hidden");
      ordersTab?.classList.add("hidden");
    }else{
      productsTab?.classList.add("hidden");
      ordersTab?.classList.remove("hidden");
      loadAdminOrders();
    }

  });

});

$("adminExit")?.addEventListener("click",()=>{
  goTo("accueil");
});

/* =========================================================
   ADMIN PRODUITS
========================================================= */

async function loadAdminProducts(){

  const box = $("adminProducts");

  if(!box) return;

  const {data,error} = await supabase
    .from("products")
    .select("*")
    .order("created_at",{ascending:false});

  if(error){
    console.error(error);
    box.innerHTML = `
      <div class="panel">
        Impossible de charger les produits.
      </div>
    `;
    return;
  }

  const list = data || [];

  if(!list.length){
    box.innerHTML = `
      <div class="panel">
        Aucun produit pour le moment.
      </div>
    `;
    return;
  }

  box.innerHTML = list.map(product=>`

    <div class="admin-product">

      ${
        product.image
          ? `<img src="${product.image}" alt="">`
          : `<div style="
              width:65px;
              height:65px;
              border-radius:14px;
              display:grid;
              place-items:center;
              background:#101827;
              font-size:25px
            ">🎮</div>`
      }

      <div class="admin-product-info">

        <b>${escapeHTML(product.name)}</b>

        <small>
          ${escapeHTML(product.category)}
          · ${money(product.price)}
        </small>

        <small>
          ${product.available ? "🟢 Disponible" : "🔴 Indisponible"}
        </small>

      </div>

      <div style="display:flex;flex-direction:column;gap:6px">

        <button
          class="ghost"
          data-edit-product="${product.id}"
          style="min-height:36px;padding:0 9px"
        >
          ✏️
        </button>

        <button
          class="ghost"
          data-delete-product="${product.id}"
          style="min-height:36px;padding:0 9px"
        >
          🗑️
        </button>

      </div>

    </div>

  `).join("");

  box.querySelectorAll("[data-edit-product]").forEach(btn=>{
    btn.onclick=()=>{
      editProduct(btn.dataset.editProduct);
    };
  });

  box.querySelectorAll("[data-delete-product]").forEach(btn=>{
    btn.onclick=()=>{
      deleteProduct(btn.dataset.deleteProduct);
    };
  });
}

/* Image */

$("pImage")?.addEventListener("change",event=>{

  const file = event.target.files?.[0];

  if(!file) return;

  const reader = new FileReader();

  reader.onload = ()=>{
    currentImage = reader.result;

    const preview = $("imagePreview");

    if(preview){
      preview.innerHTML =
        `<img src="${currentImage}" alt="Prévisualisation">`;
    }
  };

  reader.readAsDataURL(file);
});

/* Save product */

$("saveProduct")?.addEventListener("click",saveProduct);

async function saveProduct(){

  const name = $("pName")?.value.trim();
  const category = $("pCategory")?.value.trim();
  const price = Number($("pPrice")?.value);
  const available = $("pAvailable")?.value === "true";

  if(!name || !category || !price){
    notify("Remplis tous les champs obligatoires.");
    return;
  }

  const payload = {
    name,
    category,
    price,
    available
  };

  if(currentImage){
    payload.image = currentImage;
  }

  let result;

  if(editingProductId){

    result = await supabase
      .from("products")
      .update(payload)
      .eq("id",editingProductId);

  }else{

    result = await supabase
      .from("products")
      .insert(payload);
  }

  if(result.error){
    console.error(result.error);
    notify("Impossible d'enregistrer le produit.");
    return;
  }

  notify(
    editingProductId
      ? "Produit modifié ✅"
      : "Produit ajouté ✅"
  );

  resetProductForm();
  await loadProducts();
  await loadAdminProducts();
}

async function editProduct(id){

  const {data,error} = await supabase
    .from("products")
    .select("*")
    .eq("id",id)
    .single();

  if(error || !data){
    notify("Produit introuvable.");
    return;
  }

  editingProductId = id;

  $("formTitle").textContent = "Modifier le produit";
  $("pName").value = data.name || "";
  $("pCategory").value = data.category || "";
  $("pPrice").value = data.price || "";
  $("pAvailable").value =
    data.available ? "true" : "false";

  currentImage = data.image || null;

  $("imagePreview").innerHTML =
    data.image
      ? `<img src="${data.image}" alt="">`
      : "Aucune photo";

  window.scrollTo({top:0,behavior:"smooth"});
}

async function deleteProduct(id){

  if(!confirm("Supprimer ce produit ?")) return;

  const {error} = await supabase
    .from("products")
    .delete()
    .eq("id",id);

  if(error){
    console.error(error);
    notify("Impossible de supprimer.");
    return;
  }

  notify("Produit supprimé.");
  await loadProducts();
  await loadAdminProducts();
}

$("cancelEdit")?.addEventListener("click",resetProductForm);

function resetProductForm(){

  editingProductId = null;
  currentImage = null;

  if($("formTitle"))
    $("formTitle").textContent = "Ajouter un produit";

  if($("pName")) $("pName").value="";
  if($("pCategory")) $("pCategory").value="";
  if($("pPrice")) $("pPrice").value="";
  if($("pImage")) $("pImage").value="";
  if($("pAvailable")) $("pAvailable").value="true";

  if($("imagePreview"))
    $("imagePreview").textContent =
      "Aucune photo sélectionnée";
}

/* =========================================================
   ADMIN COMMANDES
========================================================= */

async function loadAdminOrders(){

  const box = $("adminOrders");

  if(!box) return;

  const admin = await isAdmin();

  if(!admin) return;

  const {data,error} = await supabase
    .from("orders")
    .select("*")
    .order("created_at",{ascending:false});

  if(error){
    console.error(error);
    box.innerHTML = `
      <div class="panel">
        Impossible de charger les commandes.
      </div>
    `;
    return;
  }

  const orders = data || [];

  updateOrderBadge(orders);

  if(!orders.length){
    box.innerHTML = `
      <div class="panel">
        <h3>Aucune commande 📦</h3>
        <p style="color:#9ca8bd">
          Les nouvelles commandes apparaîtront ici.
        </p>
      </div>
    `;
    return;
  }

  box.innerHTML = orders.map(order=>`

    <div class="panel glass">

      <div style="
        display:flex;
        justify-content:space-between;
        gap:10px;
      ">

        <div>
          <small style="color:#63baff">
            COMMANDE #${order.id}
          </small>

          <h3 style="margin:5px 0">
            ${escapeHTML(order.first_name)}
            ${escapeHTML(order.last_name)}
          </h3>
        </div>

        <b style="color:#62b8ff">
          ${money(order.total)}
        </b>

      </div>

      <p style="color:#9ca8bd;font-size:12px">
        📱 ${escapeHTML(order.phone)}
      </p>

      <p style="color:#9ca8bd;font-size:12px">
        🛍️ ${escapeHTML(order.method)}
      </p>

      <div style="
        margin:12px 0;
        padding:12px;
        border-radius:15px;
        background:rgba(255,255,255,.045);
      ">
        ${(order.items || []).map(item=>`
          <div style="
            display:flex;
            justify-content:space-between;
            margin:5px 0;
            font-size:12px;
          ">
            <span>
              ${escapeHTML(item.name)} ×${item.quantity}
            </span>
            <b>
              ${money(Number(item.price)*Number(item.quantity))}
            </b>
          </div>
        `).join("")}
      </div>

      <select
        data-order-status="${order.id}"
      >
        <option value="new" ${order.status==="new"?"selected":""}>
          🆕 Nouvelle
        </option>
        <option value="processing" ${order.status==="processing"?"selected":""}>
          🔄 En traitement
        </option>
        <option value="completed" ${order.status==="completed"?"selected":""}>
          ✅ Terminée
        </option>
      </select>

    </div>

  `).join("");

  box.querySelectorAll("[data-order-status]")
    .forEach(select=>{
      select.onchange=()=>{
        updateOrderStatus(
          select.dataset.orderStatus,
          select.value
        );
      };
    });
}

function updateOrderBadge(orders){

  const badge = $("orderBadge");

  if(!badge) return;

  const count = orders.filter(
    order=>order.status === "new"
  ).length;

  badge.textContent = count;

  const alert = $("adminOrderAlert");

  if(alert){

    if(count > 0){

      alert.classList.remove("hidden");

      alert.textContent =
        `🔔 ${count} nouvelle${count>1?"s":""} commande${count>1?"s":""} !`;

    }else{

      alert.classList.add("hidden");

    }
  }
}

async function updateOrderStatus(id,status){

  const {error} = await supabase
    .from("orders")
    .update({status})
    .eq("id",id);

  if(error){
    console.error(error);
    notify("Impossible de modifier la commande.");
    return;
  }

  notify("Commande mise à jour ✅");
  loadAdminOrders();
}

/* =========================================================
   REALTIME COMMANDES
========================================================= */

supabase
  .channel("mhd-orders-live")
  .on(
    "postgres_changes",
    {
      event:"*",
      schema:"public",
      table:"orders"
    },
    ()=>{
      loadAdminOrders();
    }
  )
  .subscribe();

/* =========================================================
   MHD IA
========================================================= */

function aiReply(text){

  const q = text.toLowerCase();

  if(
    q.includes("produit") ||
    q.includes("boutique")
  ){
    return "🛍️ Tu peux voir tous les produits dans la Boutique.";
  }

  if(
    q.includes("commande") ||
    q.includes("acheter")
  ){
    return "📦 Ajoute un produit au panier puis appuie sur « Passer commande ».";
  }

  if(
    q.includes("whatsapp") ||
    q.includes("vendeur") ||
    q.includes("support")
  ){
    return "💬 Le support vendeur est disponible au +221 78 748 81 99.";
  }

  if(
    q.includes("prix") ||
    q.includes("fcfa")
  ){
    return "💰 Les prix sont affichés directement sur chaque produit.";
  }

  return "🤖 Je peux t'aider avec les produits, les commandes, le panier ou le support.";
}

function addAIMessage(text,type="bot"){

  const box = $("aiMessages");

  if(!box) return;

  const message = document.createElement("div");

  message.className =
    `ai-msg ${type}`;

  message.textContent = text;

  box.appendChild(message);
  box.scrollTop = box.scrollHeight;
}

function sendAI(){

  const input = $("aiInput");

  if(!input) return;

  const text = input.value.trim();

  if(!text) return;

  addAIMessage(text,"user");

  input.value="";

  setTimeout(()=>{
    addAIMessage(aiReply(text),"bot");
  },300);
}

$("aiFloat")?.addEventListener("click",()=>{
  $("aiBox")?.classList.toggle("hidden");
});

$("aiClose")?.addEventListener("click",()=>{
  $("aiBox")?.classList.add("hidden");
});

$("aiSend")?.addEventListener("click",sendAI);

$("aiInput")?.addEventListener("keydown",event=>{
  if(event.key === "Enter"){
    event.preventDefault();
    sendAI();
  }
});

document.querySelectorAll("[data-ai]").forEach(button=>{

  button.onclick=()=>{

    const type = button.dataset.ai;

    if(type === "produits"){
      addAIMessage(
        "🛍️ Ouvre Boutique pour découvrir les produits disponibles."
      );
    }

    if(type === "commande"){
      addAIMessage(
        "📦 Ajoute tes produits au panier puis passe commande."
      );
    }

    if(type === "support"){
      addAIMessage(
        "💬 Support vendeur : +221 78 748 81 99."
      );
    }

  };

});

/* =========================================================
   DÉMARRAGE
========================================================= */

async function init(){

  updateCartCount();

  await loadUser();
  await loadProducts();

  goTo("accueil");
}

init();
