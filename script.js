const products=[
 {name:"Pack Gaming — démo",cat:"Gaming",price:10000,icon:"🎮",tag:"Nouveau"},
 {name:"Offre eFootball — démo",cat:"eFootball",price:12000,icon:"⚽",tag:"Populaire"},
 {name:"Produit digital — démo",cat:"Digital",price:7500,icon:"💻",tag:"Top"},
 {name:"Pack Premium — démo",cat:"Autres",price:15000,icon:"💎",tag:"Nouveau"}
];
const grid=document.querySelector("#productGrid"),empty=document.querySelector("#empty"),search=document.querySelector("#search");
let cart=0;

function render(list=products){
 grid.innerHTML="";
 empty.style.display=list.length?"none":"block";
 list.forEach((p,i)=>{
  const el=document.createElement("article");
  el.className="card";
  el.innerHTML=`<div class="thumb">${p.icon}</div><div class="card-body">
   <span class="tag">${p.tag}</span><h3>${p.name}</h3>
   <div class="price">${p.price.toLocaleString("fr-FR")} FCFA</div>
   <div class="stock">● Disponible</div>
   <button data-index="${i}">Ajouter au panier</button>
  </div>`;
  grid.appendChild(el);
 });
}
render();

search.addEventListener("input",()=>{
 const q=search.value.trim().toLowerCase();
 render(products.filter(p=>(p.name+" "+p.cat).toLowerCase().includes(q)));
});
document.querySelectorAll(".categories button").forEach(btn=>{
 btn.addEventListener("click",()=>render(products.filter(p=>p.cat===btn.dataset.cat)));
});
document.querySelector("#showAll").onclick=()=>{search.value="";render()};
document.querySelector("#focusSearch").onclick=()=>search.focus();
grid.addEventListener("click",e=>{
 if(e.target.matches("button")){
  cart++;document.querySelector("#cartCount").textContent=cart;
  e.target.textContent="Ajouté ✓";
  setTimeout(()=>e.target.textContent="Ajouter au panier",900);
 }
});
document.querySelector("#whatsapp").onclick=(e)=>{
 e.preventDefault();
 alert("Lien WhatsApp à configurer avec ton numéro professionnel.");
};
document.querySelector("#menuBtn").onclick=()=>alert("Menu mobile : Accueil • Boutique • Catégories • Compte");
