(() => {
"use strict";

const SUPABASE_URL="https://oabjxsclanvgmvnezab.supabase.co";
const SUPABASE_KEY="sb_publishable_Wccb86Hdfbxwx1tj0ciPDg_aRv8yqje";
const WHATSAPP="221787488199";
const SITE_URL="https://hjdnrzd792-star.github.io/MHD-shop/";

let sb=null, session=null, products=[], cart=JSON.parse(localStorage.getItem("mhd_cart")||"[]");
let category="Tous", orderMethod="site", phoneVerified=false, editingImage="";

const demo=[
 {id:"demo-1",name:"Pack Gaming Premium",category:"Gaming",price:5000,image:"logo-mhd-shop.png",available:true},
 {id:"demo-2",name:"Carte digitale",category:"Digital",price:3000,image:"logo-mhd-shop.png",available:true},
 {id:"demo-3",name:"Service Gaming",category:"Gaming",price:7500,image:"logo-mhd-shop.png",available:true}
];

const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("fr-FR")+" FCFA";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function toast(s){let t=$("toast");if(!t){t=document.createElement("div");t.id="toast";t.className="toast";document.body.appendChild(t)}t.textContent=s;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2500)}
function saveCart(){localStorage.setItem("mhd_cart",JSON.stringify(cart));updateCount()}
function updateCount(){const n=cart.reduce((a,x)=>a+x.qty,0);if($("cartCount"))$("cartCount").textContent=n}
function total(){return cart.reduce((a,x)=>a+Number(x.price||0)*x.qty,0)}

function go(page){
 document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));
 document.querySelectorAll(".liquid-nav button").forEach(b=>b.classList.toggle("active",b.dataset.go===page));
 window.scrollTo({top:0,behavior:"smooth"});
 if(page==="panier")renderCart();
 if(page==="commande")renderCheckout();
 if(page==="compte")renderAccount();
 if(page==="admin")loadAdmin();
}

function productCard(p){
 return `<article class="card glass">
   <div class="pic"><img src="${esc(p.image||"logo-mhd-shop.png")}" alt=""></div>
   <div class="info">
     <h3>${esc(p.name)}</h3>
     <p>${esc(p.category||"Digital")}</p>
     <div class="price">${money(p.price)}</div>
     <button class="primary full" data-add="${esc(p.id)}">Ajouter au panier</button>
   </div>
 </article>`;
}

function renderProducts(){
 const q=($("search")?.value||"").toLowerCase().trim();
 let list=products.filter(p=>p.available!==false&&(category==="Tous"||p.category===category));
 if(q)list=list.filter(p=>(p.name+" "+(p.category||"")).toLowerCase().includes(q));
 $("products").innerHTML=list.length?list.map(productCard).join(""):`<div class="panel glass"><h2>Aucun produit</h2><p class="auth-note">Aucun produit ne correspond.</p></div>`;
 $("homeProducts").innerHTML=products.filter(p=>p.available!==false).slice(0,4).map(productCard).join("");
 const cats=["Tous",...new Set(products.map(p=>p.category).filter(Boolean))];
 $("categories").innerHTML=cats.map(c=>`<button class="chip ${c===category?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
}

async function loadProducts(){
 if(sb){
  const r=await sb.from("products").select("*").order("created_at",{ascending:false});
  if(!r.error&&r.data?.length){products=r.data;renderProducts();return}
 }
 products=demo;renderProducts();
}

function renderCart(){
 const box=$("cart");
 if(!cart.length){
  box.innerHTML=`<div class="panel glass"><h2>Panier vide</h2><p class="auth-note">Ajoute un produit pour commencer.</p><button class="primary full" data-go="boutique">Voir la boutique</button></div>`;
  return;
 }
 box.innerHTML=`${cart.map(x=>`<div class="cart-row glass">
   <img src="${esc(x.image||"logo-mhd-shop.png")}" alt="">
   <div class="grow"><b>${esc(x.name)}</b><small>${money(x.price)}</small></div>
   <div class="qty"><button data-minus="${esc(x.id)}">−</button><b>${x.qty}</b><button data-plus="${esc(x.id)}">+</button></div>
 </div>`).join("")}
 <div class="summary glass"><div class="total-line"><span>Total</span><strong>${money(total())}</strong></div><button class="primary full" data-go="commande">Continuer la commande</button></div>`;
}

function renderCheckout(){}

async function getProfile(){
 if(!sb||!session)return null;
 const r=await sb.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
 return r.data||null;
}

function renderAuthLoggedOut(){
 $("authPanel").innerHTML=`<h2>Connexion</h2>
 <p class="auth-note">Connecte-toi pour enregistrer tes commandes et ton profil.</p>
 <label>Email</label><input id="email" type="email" autocomplete="email" placeholder="ton@email.com">
 <label>Mot de passe</label><input id="password" type="password" autocomplete="current-password" placeholder="6 caractères minimum">
 <div class="auth-actions">
  <button class="primary full" id="loginBtn">Se connecter</button>
  <button class="secondary full" id="signupBtn">Créer un compte</button>
  <button class="secondary full" id="googleBtn">Continuer avec Google</button>
  <button class="secondary full" id="appleBtn">Continuer avec Apple</button>
 </div>
 <p id="authInfo" class="status"></p>`;
 $("loginBtn").onclick=()=>auth("login");$("signupBtn").onclick=()=>auth("signup");
 $("googleBtn").onclick=()=>oauth("google");$("appleBtn").onclick=()=>oauth("apple");
}

async function renderAccount(){
 if(!session){renderAuthLoggedOut();return}
 const p=await getProfile();
 const first=p?.first_name||"",last=p?.last_name||"",phone=p?.phone||session.user.phone||"";
 $("authPanel").innerHTML=`<div class="profile-card">
   <div class="avatar">${esc((first||session.user.email||"M").slice(0,1).toUpperCase())}</div>
   <div><h2>${esc(first||"Mon compte")}</h2><small class="auth-note">${esc(session.user.email||"")}</small></div>
 </div>
 <label>Prénom</label><input id="profileFirst" value="${esc(first)}">
 <label>Nom</label><input id="profileLast" value="${esc(last)}">
 <label>Téléphone</label><input id="profilePhone" type="tel" value="${esc(phone)}">
 <button class="primary full" id="saveProfile">Enregistrer le profil</button>
 <button class="secondary full" id="myOrders">Mes commandes</button>
 ${p?.role==="admin"?`<button class="primary full" id="openAdmin">⚙️ Administration</button>`:""}
 <button class="secondary full" id="logoutBtn">Se déconnecter</button>
 <div id="accountInfo" class="status"></div><div id="ordersList"></div>`;
 $("saveProfile").onclick=saveProfile;
 $("myOrders").onclick=loadMyOrders;
 $("logoutBtn").onclick=async()=>{await sb?.auth.signOut();session=null;go("compte");toast("Déconnecté")};
 if($("openAdmin"))$("openAdmin").onclick=()=>go("admin");
}

async function ensureProfile(){
 if(!sb||!session)return;
 await sb.from("profiles").upsert({id:session.user.id},{onConflict:"id"});
}

async function auth(mode){
 if(!sb)return toast("Connexion indisponible");
 const email=$("email").value.trim(),password=$("password").value;
 if(!email||!password)return $("authInfo").textContent="Remplis email et mot de passe.";
 if(password.length<6)return $("authInfo").textContent="Le mot de passe doit contenir au moins 6 caractères.";
 const r=mode==="signup"
  ?await sb.auth.signUp({email,password,options:{emailRedirectTo:SITE_URL}})
  :await sb.auth.signInWithPassword({email,password});
 if(r.error)return $("authInfo").textContent=r.error.message;
 session=r.data.session;
 if(session){await ensureProfile();toast("Connexion réussie ✓");renderAccount()}
 else $("authInfo").textContent="Compte créé. Vérifie ton email si demandé.";
}

async function oauth(provider){
 if(!sb)return toast("Supabase indisponible");
 const r=await sb.auth.signInWithOAuth({provider,options:{redirectTo:SITE_URL}});
 if(r.error)toast(r.error.message);
}

async function saveProfile(){
 if(!sb||!session)return;
 const r=await sb.from("profiles").upsert({
  id:session.user.id,
  first_name:$("profileFirst").value.trim(),
  last_name:$("profileLast").value.trim(),
  phone:$("profilePhone").value.trim()
 },{onConflict:"id"});
 $("accountInfo").textContent=r.error?r.error.message:"Profil enregistré ✓";
}

async function loadMyOrders(){
 if(!sb||!session)return;
 const r=await sb.from("orders").select("*").eq("user_id",session.user.id).order("created_at",{ascending:false});
 $("ordersList").innerHTML=r.error?`<p class="status">${esc(r.error.message)}</p>`:
 r.data?.length?r.data.map(o=>`<div class="order glass"><strong>${money(o.total)}</strong><small>${new Date(o.created_at).toLocaleString("fr-FR")} · ${esc(o.status)}</small></div>`).join(""):`<p class="auth-note">Aucune commande.</p>`;
}

async function submitOrder(method){
 if(!cart.length)return toast("Panier vide");
 if(!session){toast("Connecte-toi d'abord");return go("compte")}
 const first=$("orderFirstName").value.trim(),last=$("orderLastName").value.trim(),phone=$("orderPhone").value.trim();
 if(!first||!last||!phone)return toast("Remplis tous les champs");
 if(!phoneVerified)return toast("Vérifie ton numéro avant la commande");
 const order={user_id:session.user.id,first_name:first,last_name:last,phone,phone_verified:true,items:cart,total:total(),method,status:"new"};
 if(sb){
  const r=await sb.from("orders").insert(order);
  if(r.error)return toast(r.error.message);
 }
 if(method==="whatsapp"){
  const lines=cart.map(x=>`${x.name} x${x.qty}`).join("\n");
  const text=`Bonjour MHD SHOP 👋\nCommande depuis le site\n\n${lines}\n\nTotal: ${money(total())}\nPrénom: ${first}\nNom: ${last}\nTéléphone: ${phone}`;
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`,"_blank");
 }
 cart=[];saveCart();toast("Commande enregistrée ✓");go("compte");
}

async function sendOtp(){
 if(!sb||!session)return toast("Connecte-toi d'abord");
 const phone=$("orderPhone").value.trim();
 if(!phone)return toast("Entre ton numéro");
 const r=await sb.auth.updateUser({phone});
 if(r.error)return toast("La vérification SMS n'est pas configurée dans Supabase.");
 $("otpArea").classList.remove("hidden");$("phoneStatus").textContent="Code envoyé. Entre le code reçu par SMS.";toast("Code envoyé");
}

async function verifyOtp(){
 if(!sb||!session)return;
 const phone=$("orderPhone").value.trim(),token=$("otpCode").value.trim();
 const r=await sb.auth.verifyOtp({phone,token,type:"phone_change"});
 if(r.error)return toast(r.error.message);
 phoneVerified=true;$("phoneStatus").textContent="✅ Numéro vérifié."; $("phoneStatus").classList.add("ok");toast("Numéro vérifié ✓");
}

async function loadAdmin(){
 if(!session){$("adminProducts").innerHTML=`<p class="auth-note">Connecte-toi avec le compte administrateur.</p>`;return}
 const p=await getProfile();
 if(p?.role!=="admin"){
  $("adminProducts").innerHTML=`<div class="panel glass"><h2>Accès réservé</h2><p class="auth-note">Ce compte n'a pas le rôle administrateur.</p></div>`;
  return;
 }
 loadAdminProducts();loadAdminOrders();
}

async function loadAdminProducts(){
 const r=await sb.from("products").select("*").order("created_at",{ascending:false});
 if(r.error)return toast(r.error.message);
 $("adminProducts").innerHTML=r.data?.length?r.data.map(p=>`<div class="admin-row glass">
   <img src="${esc(p.image||"logo-mhd-shop.png")}" alt="">
   <div class="grow"><b>${esc(p.name)}</b><small>${esc(p.category||"")} · ${money(p.price)} · ${p.available===false?"Indisponible":"Disponible"}</small></div>
   <div class="admin-actions"><button class="danger" data-del="${esc(p.id)}">Supprimer</button></div>
 </div>`).join(""):`<p class="auth-note">Aucun produit.</p>`;
}

async function loadAdminOrders(){
 const r=await sb.from("orders").select("*").order("created_at",{ascending:false});
 if(r.error)return toast(r.error.message);
 const orders=r.data||[];$("orderBadge").textContent=orders.filter(o=>o.status==="new").length;
 $("adminOrders").innerHTML=orders.length?orders.map(o=>`<div class="order glass">
   <strong>${money(o.total)} · ${esc(o.status)}</strong>
   <small>${esc(o.first_name)} ${esc(o.last_name)} · ${esc(o.phone)} · ${new Date(o.created_at).toLocaleString("fr-FR")}</small>
   <p>${esc((o.items||[]).map(x=>x.name+" x"+x.qty).join(" • "))}</p>
   ${o.status!=="completed"?`<button class="secondary full" data-complete="${esc(o.id)}">Marquer terminée</button>`:""}
 </div>`).join(""):`<p class="auth-note">Aucune commande.</p>`;
}

async function saveProduct(){
 if(!sb)return;
 const name=$("pName").value.trim(),cat=$("pCategory").value.trim(),price=Number($("pPrice").value);
 if(!name||!cat||!price)return toast("Remplis les champs du produit");
 let image=editingImage||"logo-mhd-shop.png";
 const file=$("pImage").files?.[0];
 if(file){
  image=await new Promise(res=>{const rd=new FileReader();rd.onload=()=>res(rd.result);rd.readAsDataURL(file)});
 }
 const payload={name,category:cat,price,image,available:$("pAvailable").value==="true"};
 const id=$("editId").value;
 const r=id?await sb.from("products").update(payload).eq("id",id):await sb.from("products").insert(payload);
 if(r.error)return toast(r.error.message);
 resetProductForm();toast(id?"Produit modifié ✓":"Produit ajouté ✓");await loadProducts();loadAdminProducts();
}

function resetProductForm(){
 $("editId").value="";$("pName").value="";$("pCategory").value="";$("pPrice").value="";$("pImage").value="";$("pAvailable").value="true";editingImage="";
 $("imagePreview").textContent="Aucune photo sélectionnée";$("formTitle").textContent="Ajouter un produit";
}

document.addEventListener("click",async e=>{
 const goBtn=e.target.closest("[data-go]");
 if(goBtn){e.preventDefault();go(goBtn.dataset.go);return}
 const add=e.target.closest("[data-add]");
 if(add){const p=products.find(x=>String(x.id)===String(add.dataset.add));if(p){const old=cart.find(x=>String(x.id)===String(p.id));old?old.qty++:cart.push({id:p.id,name:p.name,price:p.price,image:p.image,qty:1});saveCart();toast("Ajouté au panier 🛒");}return}
 const cat=e.target.closest("[data-cat]");
 if(cat){category=cat.dataset.cat;renderProducts();return}
 const plus=e.target.closest("[data-plus]"),minus=e.target.closest("[data-minus]");
 if(plus||minus){const id=(plus||minus).dataset[plus?"plus":"minus"],x=cart.find(x=>String(x.id)===String(id));if(x)x.qty+=plus?1:-1;cart=cart.filter(x=>x.qty>0);saveCart();renderCart();return}
 const del=e.target.closest("[data-del]");
 if(del){const r=await sb.from("products").delete().eq("id",del.dataset.del);if(r.error)toast(r.error.message);else{toast("Produit supprimé");await loadProducts();loadAdminProducts()}return}
 const complete=e.target.closest("[data-complete]");
 if(complete){const r=await sb.from("orders").update({status:"completed"}).eq("id",complete.dataset.complete);if(r.error)toast(r.error.message);else loadAdminOrders();return}
 const ai=e.target.closest("[data-ai]");
 if(ai){const answers={produits:"Je peux t'aider à trouver un produit dans la boutique. 🛍️",commande:"Pour commander, ajoute un produit au panier puis passe à la commande. 📦",support:"Support MHD SHOP : +221 78 748 81 99. 💬"};addAi(answers[ai.dataset.ai]);return}
 const tab=e.target.closest("[data-admin-tab]");
 if(tab){document.querySelectorAll(".admin-tab").forEach(x=>x.classList.toggle("active",x===tab));$("adminProductsTab").classList.toggle("hidden",tab.dataset.adminTab!=="products");$("adminOrdersTab").classList.toggle("hidden",tab.dataset.adminTab!=="orders");}
});

function addAi(text){$("aiMessages").insertAdjacentHTML("beforeend",`<div class="ai-msg bot">${esc(text)}</div>`);$("aiMessages").scrollTop=$("aiMessages").scrollHeight}

$("search").addEventListener("input",renderProducts);
$("sendOtp").onclick=sendOtp;
$("verifyOtp").onclick=verifyOtp;
$("orderOnSite").onclick=()=>{orderMethod="site";document.querySelectorAll(".choice-card").forEach(x=>x.classList.remove("selected"));$("orderOnSite").classList.add("selected");submitOrder("site")};
$("orderOnWhatsApp").onclick=()=>{orderMethod="whatsapp";document.querySelectorAll(".choice-card").forEach(x=>x.classList.remove("selected"));$("orderOnWhatsApp").classList.add("selected");submitOrder("whatsapp")};
$("adminExit").onclick=()=>go("accueil");
$("saveProduct").onclick=saveProduct;
$("cancelEdit").onclick=resetProductForm;
$("pImage").addEventListener("change",()=>{const f=$("pImage").files?.[0];if(!f)return;$("imagePreview").innerHTML=`<img src="${URL.createObjectURL(f)}" alt="">`});
$("aiFloat").onclick=()=>$("aiBox").classList.toggle("hidden");
$("aiClose").onclick=()=>$("aiBox").classList.add("hidden");
$("aiSend").onclick=()=>{const i=$("aiInput"),t=i.value.trim();if(!t)return; $("aiMessages").insertAdjacentHTML("beforeend",`<div class="ai-msg user">${esc(t)}</div>`);const q=t.toLowerCase();addAi(q.includes("whatsapp")?"WhatsApp : +221 78 748 81 99.":q.includes("produit")?"Va dans Boutique pour voir les produits disponibles.":"Je peux aider pour les produits, les commandes et le support.");i.value=""};
$("aiInput").onkeydown=e=>{if(e.key==="Enter")$("aiSend").click()};

(async()=>{
 updateCount();
 try{
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  const r=await sb.auth.getSession();session=r.data.session;
  sb.auth.onAuthStateChange((_event,s)=>{session=s;renderAccount()});
 }catch(e){console.warn(e)}
 await loadProducts();renderAccount();
})();
})();