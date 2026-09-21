(() => {
"use strict";

const URL="https://oabjxsclanvgmvnezab.supabase.co";
const KEY="sb_publishable_Wccb86Hdfbxwx1tj0ciPDg_aRv8yqje";
const WA="221787488199";
const SITE_URL="https://hjdnrzd792-star.github.io/MHD-shop/";

let sb=null,session=null,products=[],cart=JSON.parse(localStorage.getItem("mhd_cart")||"[]"),category="Tous",method="site",phoneVerified=false;

const demo=[
{id:"d1",name:"Pack Gaming Premium",category:"Gaming",price:5000,image:"logo-mhd-shop.png",available:true},
{id:"d2",name:"Carte digitale",category:"Digital",price:3000,image:"logo-mhd-shop.png",available:true},
{id:"d3",name:"Service Gaming",category:"Gaming",price:7500,image:"logo-mhd-shop.png",available:true}
];

const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("fr-FR")+" FCFA";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function toast(s){
  const e=$("toast");
  if(!e)return;
  e.textContent=s;
  e.classList.add("show");
  clearTimeout(window.tt);
  window.tt=setTimeout(()=>e.classList.remove("show"),2500);
}

function saveCart(){
  localStorage.setItem("mhd_cart",JSON.stringify(cart));
  count();
}

function count(){
  const n=cart.reduce((a,x)=>a+x.qty,0);
  if($("cartCount"))$("cartCount").textContent=n;
  if($("navCount"))$("navCount").textContent=n;
}

function go(page){
  document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id===page));
  document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.go===page));
  scrollTo({top:0,behavior:"smooth"});
  if(page==="cart")renderCart();
  if(page==="checkout")renderCheckout();
  if(page==="account")account();
  if(page==="admin")admin();
}

function add(id){
  const p=products.find(x=>String(x.id)===String(id));
  if(!p)return;
  const x=cart.find(x=>String(x.id)===String(id));
  x?x.qty++:cart.push({id:p.id,name:p.name,price:p.price,image:p.image,qty:1});
  saveCart();
  toast("Ajouté au panier 🛒");
  renderCart();
}

function total(){
  return cart.reduce((a,x)=>a+x.price*x.qty,0);
}

function card(p){
  return `<article class="card glass"><div class="pic"><img src="${esc(p.image||"logo-mhd-shop.png")}" alt=""></div><div class="info"><h3>${esc(p.name)}</h3><p>${esc(p.category||"Digital")}</p><div class="price">${money(p.price)}</div><button class="btn primary wide" data-add="${esc(p.id)}" style="margin-top:11px">Ajouter</button></div></article>`;
}

function render(){
  let list=products.filter(p=>p.available!==false&&(category==="Tous"||p.category===category));
  const q=($("search")?.value||"").toLowerCase().trim();
  if(q)list=list.filter(p=>(p.name+" "+p.category).toLowerCase().includes(q));

  if($("products")){
    $("products").innerHTML=list.length?list.map(card).join(""):`<div class="form glass"><h2>Aucun produit</h2><p class="muted">Aucun produit ne correspond.</p></div>`;
  }

  if($("featured")){
    $("featured").innerHTML=products.filter(p=>p.available!==false).slice(0,4).map(card).join("");
  }

  const cats=["Tous",...new Set(products.map(p=>p.category).filter(Boolean))];
  if($("cats")){
    $("cats").innerHTML=cats.map(c=>`<button class="chip ${c===category?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  }
}

function renderCart(){
  if(!$("cartItems")||!$("cartTotal"))return;

  $("cartItems").innerHTML=cart.length
    ?cart.map(x=>`<div class="admin-row glass"><img src="${esc(x.image||"logo-mhd-shop.png")}"><div class="grow"><b>${esc(x.name)}</b><small>${money(x.price)} · quantité ${x.qty}</small></div><button class="btn glass-btn" data-minus="${esc(x.id)}">−</button><button class="btn glass-btn" data-plus="${esc(x.id)}">+</button></div>`).join("")
    :`<div class="form glass"><h2>Panier vide</h2><button class="btn primary" data-go="shop">Voir la boutique</button></div>`;

  $("cartTotal").textContent=money(total());
}

function renderCheckout(){
  if($("checkoutTotal"))$("checkoutTotal").textContent=money(total());
}

async function loadProducts(){
  if(sb){
    const r=await sb.from("products").select("*").order("created_at",{ascending:false});
    if(!r.error&&r.data?.length){
      products=r.data;
      render();
      return;
    }
  }
  products=demo;
  render();
}

async function profile(){
  if(!sb||!session)return null;
  const r=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
  return r.data;
}

async function account(){
  if(!session){
    if($("loginBox"))$("loginBox").classList.remove("hidden");
    if($("profileBox"))$("profileBox").classList.add("hidden");
    return;
  }

  if($("loginBox"))$("loginBox").classList.add("hidden");
  if($("profileBox"))$("profileBox").classList.remove("hidden");
  if($("accountEmail"))$("accountEmail").textContent=session.user.email||"Compte";

  const p=await profile();

  if(p){
    if($("profileFirst"))$("profileFirst").value=p.first_name||"";
    if($("profileLast"))$("profileLast").value=p.last_name||"";
    if($("profilePhone"))$("profilePhone").value=p.phone||"";
    if($("role"))$("role").textContent=(p.role||"client").toUpperCase();
    if($("adminBtn"))$("adminBtn").classList.toggle("hidden",p.role!=="admin");
  }

  renderThemeSetting();
}

async function auth(mode){
  if(!sb)return toast("Connexion indisponible");

  const email=$("email")?.value.trim()||"";
  const password=$("password")?.value||"";

  if(!email||!password)return toast("Remplis email et mot de passe");

  if(password.length<6){
    return $("authInfo").textContent="Le mot de passe doit contenir au moins 6 caractères.";
  }

  let r;

  if(mode==="signup"){
    r=await sb.auth.signUp({
      email,
      password,
      options:{
        emailRedirectTo:SITE_URL
      }
    });
  }else{
    r=await sb.auth.signInWithPassword({
      email,
      password
    });
  }

  if(r.error){
    console.error("Auth error:",r.error);
    $("authInfo").textContent=r.error.message;
    return;
  }

  if(mode==="signup"){
    if(r.data.session){
      session=r.data.session;
      await ensureProfile();
      toast("Compte créé et connecté ✓");
      await account();
    }else{
      $("authInfo").textContent="Compte créé ✓ Vérifie ton email puis reviens te connecter.";
      toast("Vérifie ton email 📧");
    }
    return;
  }

  session=r.data.session;

  if(session){
    await ensureProfile();
    toast("Connexion réussie ✓");
    await account();
  }
}

async function ensureProfile(){
  if(!sb||!session?.user?.id)return;

  const r=await sb.from("profiles").upsert(
    {id:session.user.id},
    {onConflict:"id"}
  );

  if(r.error){
    console.warn("Profil non créé automatiquement:",r.error.message);
  }
}

async function oauth(provider){
  if(!sb)return toast("Supabase indisponible");

  if(provider==="apple"){
    toast("Ouverture de Connexion Apple…");
  }else{
    toast("Ouverture de Google…");
  }

  const r=await sb.auth.signInWithOAuth({
    provider,
    options:{
      redirectTo:SITE_URL
    }
  });

  if(r.error){
    console.error("OAuth error:",r.error);
    toast(r.error.message);
  }
}

async function saveProfile(){
  if(!sb||!session)return;

  const r=await sb.from("profiles").upsert({
    id:session.user.id,
    first_name:$("profileFirst").value.trim(),
    last_name:$("profileLast").value.trim(),
    phone:$("profilePhone").value.trim()
  },{onConflict:"id"});

  $("profileInfo").textContent=r.error?r.error.message:"Profil enregistré ✓";
}

async function checkout(e){
  e.preventDefault();

  if(!cart.length)return toast("Panier vide");

  if(!session){
    toast("Connecte-toi d'abord");
    return go("account");
  }

  const first=$("firstName").value.trim();
  const last=$("lastName").value.trim();
  const phone=$("phone").value.trim();

  if(!first||!last||!phone)return toast("Remplis tous les champs");

  const order={
    user_id:session.user.id,
    first_name:first,
    last_name:last,
    phone,
    phone_verified:phoneVerified,
    items:cart,
    total:total(),
    method,
    status:"new"
  };

  if(sb){
    const r=await sb.from("orders").insert(order);
    if(r.error)return toast(r.error.message);
  }

  if(method==="whatsapp"){
    const lines=cart.map(x=>`${x.name} x${x.qty}`).join("\n");
    const text=`Bonjour MHD SHOP 👋\nCommande depuis le site\n\n${lines}\n\nTotal: ${money(total())}\nPrénom: ${first}\nNom: ${last}\nTéléphone: ${phone}`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(text)}`,"_blank");
  }

  cart=[];
  saveCart();
  toast("Commande enregistrée ✓");
  go("account");
}

async function admin(){
  if(!sb||!session)return;

  const p=await profile();
  const ok=p?.role==="admin";

  $("adminMsg").textContent=ok?"Accès administrateur autorisé ✓":"Accès réservé à l'administrateur.";
  $("adminArea").classList.toggle("hidden",!ok);

  if(ok){
    loadAdminProducts();
    loadAdminOrders();
  }
}

async function loadAdminProducts(){
  const r=await sb.from("products").select("*").order("created_at",{ascending:false});
  if(r.error)return;

  $("adminProducts").innerHTML=r.data.map(p=>`<div class="admin-row glass"><img src="${esc(p.image||"logo-mhd-shop.png")}"><div class="grow"><b>${esc(p.name)}</b><small>${esc(p.category)} · ${money(p.price)}</small></div><button class="btn danger" data-del="${p.id}">Supprimer</button></div>`).join("");
}

async function addProduct(e){
  e.preventDefault();

  const r=await sb.from("products").insert({
    name:$("pName").value.trim(),
    category:$("pCat").value.trim(),
    price:Number($("pPrice").value),
    image:$("pImage").value.trim()||"logo-mhd-shop.png",
    available:$("pAvailable").checked
  });

  if(r.error)return toast(r.error.message);

  e.target.reset();
  $("pAvailable").checked=true;
  toast("Produit ajouté ✓");
  await loadProducts();
  loadAdminProducts();
}

async function loadAdminOrders(){
  const r=await sb.from("orders").select("*").order("created_at",{ascending:false});
  if(r.error)return;

  $("adminOrders").innerHTML=r.data.length
    ?r.data.map(o=>`<div class="order glass"><strong>${money(o.total)} · ${esc(o.status)}</strong><small>${esc(o.first_name)} ${esc(o.last_name)} · ${esc(o.phone)} · ${new Date(o.created_at).toLocaleString("fr-FR")}</small><p>${esc((o.items||[]).map(x=>x.name+" x"+x.qty).join(" • "))}</p><button class="btn glass-btn" data-complete="${o.id}">Marquer terminée</button></div>`).join("")
    :"<p class='muted'>Aucune commande.</p>";
}

/* =========================
   THÈME CLAIR / SOMBRE
   ========================= */

function applyTheme(theme){
  document.body.classList.toggle("light-theme",theme==="light");
  localStorage.setItem("mhd_theme",theme);
}

function loadTheme(){
  applyTheme(localStorage.getItem("mhd_theme")||"dark");
}

function renderThemeSetting(){
  const profileBox=$("profileBox");
  if(!profileBox||$("themeSetting"))return;

  const box=document.createElement("div");
  box.id="themeSetting";
  box.className="theme-setting glass";

  box.innerHTML=`
    <div>
      <b>🎨 Apparence</b>
      <small>Choisis le thème de MHD SHOP</small>
    </div>
    <div class="theme-buttons">
      <button id="themeDark" class="theme-button" type="button">🌙 Sombre</button>
      <button id="themeLight" class="theme-button" type="button">☀️ Clair</button>
    </div>
  `;

  profileBox.appendChild(box);

  $("themeDark").onclick=()=>{
    applyTheme("dark");
    toast("🌙 Mode sombre activé");
  };

  $("themeLight").onclick=()=>{
    applyTheme("light");
    toast("☀️ Mode clair activé");
  };
}

/* =========================
   CLICS
   ========================= */

document.addEventListener("click",async e=>{
  const g=e.target.closest("[data-go]");
  if(g){
    e.preventDefault();
    go(g.dataset.go);
    return;
  }

  const a=e.target.closest("[data-add]");
  if(a)return add(a.dataset.add);

  const c=e.target.closest("[data-cat]");
  if(c){
    category=c.dataset.cat;
    render();
    return;
  }

  const plus=e.target.closest("[data-plus]");
  const minus=e.target.closest("[data-minus]");

  if(plus||minus){
    const id=(plus||minus).dataset[plus?"plus":"minus"];
    const x=cart.find(x=>String(x.id)===String(id));

    if(x)plus?x.qty++:x.qty--;

    cart=cart.filter(x=>x.qty>0);
    saveCart();
    renderCart();
    return;
  }

  const m=e.target.closest("[data-method]");
  if(m){
    method=m.dataset.method;
    document.querySelectorAll(".method").forEach(x=>x.classList.toggle("active",x===m));
    return;
  }

  const d=e.target.closest("[data-del]");
  if(d){
    const r=await sb.from("products").delete().eq("id",d.dataset.del);
    if(r.error)toast(r.error.message);
    else{
      toast("Produit supprimé");
      loadProducts();
      loadAdminProducts();
    }
    return;
  }

  const co=e.target.closest("[data-complete]");
  if(co){
    await sb.from("orders").update({status:"completed"}).eq("id",co.dataset.complete);
    loadAdminOrders();
  }
});

/* =========================
   EVENTS
   ========================= */

$("search").addEventListener("input",render);
$("checkoutForm").addEventListener("submit",checkout);
$("login").onclick=()=>auth("login");
$("signup").onclick=()=>auth("signup");
$("google").onclick=()=>oauth("google");
$("apple").onclick=()=>oauth("apple");
$("saveProfile").onclick=saveProfile;

$("logout").onclick=async()=>{
  await sb?.auth.signOut();
  session=null;
  go("account");
  toast("Déconnecté");
};

$("adminBtn").onclick=()=>go("admin");
$("productForm").onsubmit=addProduct;
$("refreshOrders").onclick=loadAdminOrders;

$("aiButton").onclick=()=>$("aiBox").classList.toggle("hidden");
$("closeAI").onclick=()=>$("aiBox").classList.add("hidden");

$("aiSend").onclick=()=>{
  const i=$("aiInput");
  const t=i.value.trim();
  if(!t)return;

  $("aiMessages").insertAdjacentHTML(
    "beforeend",
    `<div class="msg user">${esc(t)}</div><div class="msg bot">${esc(t.toLowerCase().includes("whatsapp")?"WhatsApp : +221 78 748 81 99.":"Je peux t'aider avec la boutique, le panier, les commandes et WhatsApp. ✦")}</div>`
  );

  i.value="";
};

$("aiInput").onkeydown=e=>{
  if(e.key==="Enter")$("aiSend").click();
};

$("sendOtp").onclick=async()=>{
  if(!sb||!session)return toast("Connecte-toi d'abord");

  const phone=$("phone").value.trim();
  const r=await sb.auth.updateUser({phone});

  if(r.error)return toast("Vérification SMS non configurée dans Supabase");

  $("otp").hidden=false;
  $("verifyOtp").hidden=false;
  $("phoneInfo").textContent="Code envoyé.";
};

$("verifyOtp").onclick=async()=>{
  const r=await sb.auth.verifyOtp({
    phone:$("phone").value.trim(),
    token:$("otp").value.trim(),
    type:"phone_change"
  });

  if(r.error)return toast(r.error.message);

  phoneVerified=true;
  $("phoneInfo").textContent="Numéro vérifié ✓";
  toast("Numéro vérifié");
};

$("ordersBtn").onclick=async()=>{
  if(!sb||!session)return;

  const r=await sb.from("orders")
    .select("*")
    .eq("user_id",session.user.id)
    .order("created_at",{ascending:false});

  $("orders").innerHTML=r.error
    ?`<p class="status">${esc(r.error.message)}</p>`
    :(r.data.length
      ?r.data.map(o=>`<div class="order glass"><strong>${money(o.total)}</strong><small>${new Date(o.created_at).toLocaleString("fr-FR")} · ${esc(o.status)}</small></div>`).join("")
      :"<p class='muted'>Aucune commande.</p>");
};

document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  t.classList.add("active");
  $("productsTab").classList.toggle("hidden",t.dataset.tab!=="productsTab");
  $("ordersTab").classList.toggle("hidden",t.dataset.tab!=="ordersTab");
});

/* =========================
   DÉMARRAGE
   ========================= */

(async()=>{
  loadTheme();
  count();

  try{
    sb=window.supabase.createClient(URL,KEY);

    const r=await sb.auth.getSession();
    session=r.data.session;

    sb.auth.onAuthStateChange(async(_e,s)=>{
      session=s;

      if(session){
        await ensureProfile();
      }

      await account();
    });
  }catch(e){
    console.warn("Supabase:",e);
    toast("Erreur de connexion à Supabase");
  }

  await loadProducts();
  await account();
})();

})();
