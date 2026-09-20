const SUPABASE_URL="https://oabjxsclanvgmvnezabj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_Wccb86Hdfbxwx1tj0ciPDg_aRv8yqje";

const db=supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const demo=[
  {
    id:"d1",
    name:"Pack Gaming — démo",
    category:"Gaming",
    price:5000,
    image:"🎮",
    available:true
  },
  {
    id:"d2",
    name:"Offre eFootball — démo",
    category:"eFootball",
    price:3000,
    image:"⚽",
    available:true
  },
  {
    id:"d3",
    name:"Produit digital — démo",
    category:"Digital",
    price:2500,
    image:"💻",
    available:true
  },
  {
    id:"d4",
    name:"Pack Premium — démo",
    category:"Premium",
    price:7500,
    image:"⭐",
    available:true
  }
];

let products=[];
let cart=JSON.parse(localStorage.getItem("mhd_cart")||"{}");
let active="Tous";
let session=null;
let isAdmin=false;
let editingImage="";


const $=x=>document.querySelector(x);

const money=n=>
  new Intl.NumberFormat("fr-FR").format(n)+" FCFA";


function saveCart(){

  localStorage.setItem(
    "mhd_cart",
    JSON.stringify(cart)
  );

  count();
}


function count(){

  const el=$("#cartCount");

  if(!el)return;

  el.textContent=
    Object.values(cart)
    .reduce((a,b)=>a+b,0);
}


function go(id){

  if(id==="admin"&&!isAdmin){

    alert("Accès réservé à l’administrateur.");

    go("compte");

    return;
  }

  document
    .querySelectorAll(".page")
    .forEach(x=>x.classList.remove("active"));

  const page=$("#"+id);

  if(page){

    page.classList.add("active");

    scrollTo(0,0);
  }

  if(id==="panier"){
    renderCart();
  }

  if(id==="admin"){
    renderAdmin();
  }
}


document.addEventListener("click",e=>{

  const b=e.target.closest("[data-go]");

  if(b){

    go(b.dataset.go);
  }

});


function cats(){

  return[
    "Tous",
    ...new Set(
      products.map(p=>p.category)
    )
  ];

}


function renderCats(){

  const el=$("#categories");

  if(!el)return;

  el.innerHTML=cats()
    .map(c=>
      `<button class="chip"
      onclick="setCat(${JSON.stringify(c)})">
      ${c}
      </button>`
    )
    .join("");
}


function imageHTML(image){

  if(!image){

    return `<span>📦</span>`;
  }

  if(
    image.startsWith("http")||
    image.startsWith("data:image/")
  ){

    return `
      <img
        src="${image}"
        alt="Produit"
        loading="lazy"
      >
    `;
  }

  return `<span>${image}</span>`;
}


function card(p){

  return `
    <article class="card">

      <div class="product-image">
        ${imageHTML(p.image)}
      </div>

      <h3>${p.name}</h3>

      <div class="price">
        ${money(p.price)}
      </div>

      <p class="${p.available?"available":"unavailable"}">
        ${p.available?"Disponible":"Indisponible"}
      </p>

      <button
        class="primary"
        ${p.available?"":"disabled"}
        onclick="add('${String(p.id).replace(/'/g,"\\'")}')"
      >
        ${p.available?"Ajouter au panier":"Indisponible"}
      </button>

    </article>
  `;
}


function render(){

  const search=$("#search");

  const q=
    (search?.value||"")
    .toLowerCase()
    .trim();

  const arr=products.filter(p=>
    (active==="Tous"||p.category===active)&&
    (!q||p.name.toLowerCase().includes(q))
  );


  const productBox=$("#products");

  if(productBox){

    productBox.innerHTML=
      arr.map(card).join("")||
      "<p>Aucun produit trouvé.</p>";
  }


  const homeBox=$("#homeProducts");

  if(homeBox){

    homeBox.innerHTML=
      products
      .filter(p=>p.available)
      .slice(0,4)
      .map(card)
      .join("");
  }


  renderCats();

}


function setCat(c){

  active=c;

  render();
}


function add(id){

  cart[id]=(cart[id]||0)+1;

  saveCart();

  renderCart();

  go("panier");
}


function change(id,d){

  cart[id]=(cart[id]||0)+d;

  if(cart[id]<=0){

    delete cart[id];
  }

  saveCart();

  renderCart();
}


function renderCart(){

  const box=$("#cart");

  if(!box)return;

  const ids=Object.keys(cart);

  if(!ids.length){

    box.innerHTML=`
      <div class="panel">

        <p>Ton panier est vide.</p>

        <button
          class="primary"
          data-go="boutique"
        >
          Voir la boutique
        </button>

      </div>
    `;

    return;
  }


  let total=0;


  const rows=ids.map(id=>{

    const p=
      products.find(
        x=>String(x.id)===String(id)
      );

    const q=cart[id];

    if(!p)return"";


    total+=p.price*q;


    return `
      <div class="admin-item">

        <div class="grow">

          <b>${p.name}</b>

          <br>

          ${money(p.price)}

        </div>

        <button
          onclick="change('${id}',-1)"
        >
          −
        </button>

        <b>${q}</b>

        <button
          onclick="change('${id}',1)"
        >
          +
        </button>

      </div>
    `;

  }).join("");


  box.innerHTML=`

    ${rows}

    <div class="panel">

      <h2>
        Total : ${money(total)}
      </h2>

      <button
        class="primary"
        onclick="orderWhatsApp()"
      >
        Commander sur WhatsApp
      </button>

    </div>

  `;
}


function orderWhatsApp(){

  if(!session){

    alert(
      "Tu dois créer un compte ou te connecter avant de commander."
    );

    go("compte");

    return;
  }


  if(!Object.keys(cart).length){

    alert("Ton panier est vide.");

    return;
  }


  let text=
    "Bonjour MHD SHOP, je souhaite commander :\n";


  Object.keys(cart).forEach(id=>{

    const p=
      products.find(
        x=>String(x.id)===String(id)
      );

    if(p){

      text+=
        `- ${p.name} x${cart[id]} — ${money(p.price*cart[id])}\n`;
    }

  });


  const total=
    Object.keys(cart).reduce((sum,id)=>{

      const p=
        products.find(
          x=>String(x.id)===String(id)
        );

      return p
        ?sum+p.price*cart[id]
        :sum;

    },0);


  text+=
    `\nTotal : ${money(total)}`;


  location.href=
    `https://wa.me/221787488199?text=${encodeURIComponent(text)}`;
}


function authHTML(){

  if(!session){

    return `

      <p>
        Crée un compte ou connecte-toi
        pour pouvoir commander.
      </p>

      <button
        class="primary"
        id="googleLogin"
      >
        Continuer avec Google
      </button>

      <hr>

      <label>Email</label>

      <input
        id="email"
        type="email"
        placeholder="ton@email.com"
      >

      <label>Mot de passe</label>

      <input
        id="password"
        type="password"
        placeholder="••••••••"
      >

      <button
        class="primary"
        id="emailLogin"
      >
        Se connecter
      </button>

      <button
        id="emailSignup"
      >
        Créer un compte
      </button>

      <p id="authMsg"></p>

    `;
  }


  return `

    <p>
      <b>
        ${session.user.email||"Compte connecté"}
      </b>
    </p>

    ${
      isAdmin
      ?`
        <p class="available">
          Administrateur autorisé ✅
        </p>
      `
      :""
    }

    <button id="logout">
      Se déconnecter
    </button>

  `;
}


async function renderAuth(){

  const box=$("#authPanel");

  if(!box)return;

  box.innerHTML=authHTML();


  if(!session){

    $("#googleLogin").onclick=
      googleLogin;

    $("#emailLogin").onclick=
      ()=>emailAuth(false);

    $("#emailSignup").onclick=
      ()=>emailAuth(true);

  }else{

    $("#logout").onclick=
      logout;
  }

}


async function googleLogin(){

  const{error}=
    await db.auth.signInWithOAuth({

      provider:"google",

      options:{
        redirectTo:
        "https://hjdnrzd792-star.github.io/MHD-shop/"
      }

    });


  if(error){

    alert(error.message);
  }

}


async function emailAuth(signup){

  const email=
    $("#email").value.trim();

  const password=
    $("#password").value;


  if(
    !email||
    password.length<6
  ){

    $("#authMsg").textContent=
      "Entre un email et un mot de passe d’au moins 6 caractères.";

    return;
  }


  const r=
    signup
    ?await db.auth.signUp({

        email,
        password,

        options:{
          emailRedirectTo:
          "https://hjdnrzd792-star.github.io/MHD-shop/"
        }

      })

    :await db.auth.signInWithPassword({
        email,
        password
      });


  if(r.error){

    $("#authMsg").textContent=
      r.error.message;

    return;
  }


  $("#authMsg").textContent=
    signup
    ?"Compte créé. Vérifie ton email si Supabase le demande."
    :"Connexion réussie.";

}


async function logout(){

  await db.auth.signOut();

  go("accueil");
}


async function refreshUser(){

  const r=
    await db.auth.getSession();

  session=r.data.session;

  isAdmin=false;


  if(session){

    const p=
      await db
      .from("profiles")
      .select("role")
      .eq("id",session.user.id)
      .maybeSingle();

    isAdmin=
      p.data?.role==="admin";
  }


  const adminButton=$("#adminOpen");

  if(adminButton){

    adminButton.style.display=
      isAdmin?"flex":"none";
  }


  await renderAuth();
}


async function loadProducts(){

  const r=
    await db
    .from("products")
    .select(
      "id,name,category,price,image,available"
    )
    .order(
      "created_at",
      {ascending:false}
    );


  if(r.error){

    products=demo;

  }else{

    products=
      r.data?.length
      ?r.data
      :demo;
  }


  render();

  renderCart();

  count();
}


async function renderAdmin(){

  if(!isAdmin)return;


  const r=
    await db
    .from("products")
    .select(
      "id,name,category,price,image,available"
    )
    .order(
      "created_at",
      {ascending:false}
    );


  const list=r.data||[];

  $("#adminProducts").innerHTML=
    list.map(p=>`

      <div class="admin-item">

        <div class="grow">

          <b>${p.name}</b>

          <br>

          ${p.category}
          ·
          ${money(p.price)}

          <br>

          <small
            class="${p.available?"available":"unavailable"}"
          >
            ${p.available?"Disponible":"Indisponible"}
          </small>

        </div>


        <button
          onclick="edit(${p.id})"
        >
          ✏️
        </button>


        <button
          class="danger"
          onclick="del(${p.id})"
        >
          🗑️
        </button>

      </div>

    `).join("")
    ||
    "<p>Aucun produit.</p>";

}


function reset(){

  $("#editId").value="";
  $("#pName").value="";
  $("#pCategory").value="";
  $("#pPrice").value="";
  $("#pImage").value="";
  $("#pAvailable").value="true";

  editingImage="";

  const preview=$("#imagePreview");

  if(preview){

    preview.innerHTML=
      "Aucune photo sélectionnée";
  }

  $("#formTitle").textContent=
    "Ajouter un produit";
}


async function edit(id){

  let p=
    products.find(
      x=>x.id==id
    );


  if(!p){

    const r=
      await db
      .from("products")
      .select("*")
      .eq("id",id)
      .single();

    p=r.data;
  }


  if(!p)return;


  $("#editId").value=p.id;
  $("#pName").value=p.name;
  $("#pCategory").value=p.category;
  $("#pPrice").value=p.price;
  $("#pImage").value="";
  $("#pAvailable").value=
    String(p.available);


  editingImage=p.image||"";


  const preview=$("#imagePreview");

  if(preview){

    preview.innerHTML=
      imageHTML(p.image);
  }


  $("#formTitle").textContent=
    "Modifier le produit";

}


function resizeImage(file){

  return new Promise((resolve,reject)=>{

    const reader=
      new FileReader();


    reader.onload=e=>{

      const img=
        new Image();


      img.onload=()=>{

        const max=1200;

        let width=img.width;
        let height=img.height;


        if(width>max||height>max){

          if(width>height){

            height=
              Math.round(
                height*max/width
              );

            width=max;

          }else{

            width=
              Math.round(
                width*max/height
              );

            height=max;
          }
        }


        const canvas=
          document.createElement("canvas");

        canvas.width=width;
        canvas.height=height;


        const ctx=
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
            .82
          )
        );

      };


      img.onerror=reject;

      img.src=e.target.result;

    };


    reader.onerror=reject;

    reader.readAsDataURL(file);

  });

}


$("#pImage").onchange=async()=>{

  const file=
    $("#pImage").files[0];

  if(!file)return;


  if(!file.type.startsWith("image/")){

    alert(
      "Choisis une image."
    );

    $("#pImage").value="";

    return;
  }


  try{

    const image=
      await resizeImage(file);

    editingImage=image;


    const preview=
      $("#imagePreview");

    if(preview){

      preview.innerHTML=
        `<img src="${image}" alt="Aperçu">`;
    }

  }catch(e){

    alert(
      "Impossible de charger cette image."
    );
  }

};


$("#saveProduct").onclick=async()=>{

  if(!isAdmin){

    alert(
      "Accès administrateur requis."
    );

    return;
  }


  const name=
    $("#pName").value.trim();

  const category=
    $("#pCategory").value.trim();

  const price=
    Number($("#pPrice").value);


  if(
    !name||
    !category||
    price<=0
  ){

    alert(
      "Remplis le nom, la catégorie et le prix."
    );

    return;
  }


  const id=
    $("#editId").value;


  const obj={

    name,
    category,
    price,

    image:
      editingImage||"📦",

    available:
      $("#pAvailable").value==="true"

  };


  const r=
    id

    ?await db
      .from("products")
      .update(obj)
      .eq("id",id)

    :await db
      .from("products")
      .insert(obj);


  if(r.error){

    alert(r.error.message);

    return;
  }


  reset();

  await loadProducts();

  await renderAdmin();

};


$("#cancelEdit").onclick=
  reset;


$("#adminExit").onclick=
  ()=>go("accueil");


$("#search").oninput=
  render;


async function boot(){

  await refreshUser();

  await loadProducts();

  count();


  db.auth.onAuthStateChange(
    ()=>setTimeout(
      refreshUser,
      0
    )
  );

}


boot();
