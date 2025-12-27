const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

const state = { draws: [], winners: [], activeDrawId: null, qty: 1, currency: "R$" };

function uuid(){
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function daysFromNow(n){ const d=new Date(); d.setDate(d.getDate()+n); return d; }
function fmtDate(date){ return new Date(date).toLocaleDateString("es-BO",{year:"numeric",month:"short",day:"2-digit"}); }
function fmtDateTime(date){ return new Date(date).toLocaleString("es-BO",{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit"}); }
function fmtMoney(n){ return `${state.currency} ${Number(n).toLocaleString("es-BO")}`; }
function fmtInt(n){ return Number(n).toLocaleString("es-BO"); }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function availableTickets(d){ return Math.max(0, d.totalTickets - d.soldTickets); }
function pctSold(d){ return d.totalTickets ? clamp(Math.round((d.soldTickets/d.totalTickets)*100),0,100) : 0; }
function labelCategory(c){ return ({autos:"Autos",casas:"Casas",motos:"Motos",tecnologia:"Tecnología"}[c] || "Otros"); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[m])); }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }
function fakeName(){
  const first=["Ana","Bruno","Carla","Diego","Elena","Felipe","Gabi","Hugo","Iris","João","Luca","Marina","Nico","Paula","Rafa","Sofia","Tiago","Valeria"];
  const last=["Silva","Pereira","Souza","Gómez","Rojas","Fernández","Almeida","Costa","Rodrigues","Mendoza","Flores","Herrera","Castro","Santos","Vargas"];
  return `${pick(first)} ${pick(last)}`;
}

function themeBg(theme){
  const presets = {
    violet:`radial-gradient(160px 160px at 30% 30%, rgba(124,92,255,.34), transparent 60%),
            radial-gradient(180px 180px at 75% 60%, rgba(77,225,255,.20), transparent 60%),
            linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.03))`,
    cyan:`radial-gradient(160px 160px at 30% 30%, rgba(77,225,255,.34), transparent 60%),
          radial-gradient(180px 180px at 75% 60%, rgba(34,197,94,.18), transparent 60%),
          linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.03))`,
    amber:`radial-gradient(160px 160px at 30% 30%, rgba(245,158,11,.30), transparent 60%),
           radial-gradient(180px 180px at 75% 60%, rgba(124,92,255,.20), transparent 60%),
           linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.03))`,
    lime:`radial-gradient(160px 160px at 30% 30%, rgba(34,197,94,.30), transparent 60%),
          radial-gradient(180px 180px at 75% 60%, rgba(77,225,255,.22), transparent 60%),
          linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.03))`,
    pink:`radial-gradient(160px 160px at 30% 30%, rgba(236,72,153,.30), transparent 60%),
          radial-gradient(180px 180px at 75% 60%, rgba(77,225,255,.18), transparent 60%),
          linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.03))`,
  };
  return presets[theme] || presets.violet;
}

let toastTimer=null;
function toast(msg){
  const t=$("#toast");
  if(!t) return alert(msg);
  t.textContent=msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove("show"),2600);
}

function showModal(m){ m.classList.add("show"); m.setAttribute("aria-hidden","false"); document.body.style.overflow="hidden"; }
function hideModal(m){ if(!m.classList.contains("show")) return; m.classList.remove("show"); m.setAttribute("aria-hidden","true"); document.body.style.overflow=""; }

function startCountdown(el, endsAt){
  const tick=()=>{
    const diff=endsAt - new Date();
    if(diff<=0){ el.textContent="Cerrado"; return; }
    const d=Math.floor(diff/(1000*60*60*24));
    const h=Math.floor(diff/(1000*60*60))%24;
    const m=Math.floor(diff/(1000*60))%60;
    el.textContent=`⏳ ${d}d ${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m`;
  };
  tick(); setInterval(tick, 1000*15);
}

function seedDraws(){
  return [
    { id:uuid(), title:"Auto 0km • Edición 2026", category:"autos", desc:"Participa por un auto 0km (demo).",
      price:10, totalTickets:5000, soldTickets:1580, endsAt:daysFromNow(12), theme:"violet", featured:true },
    { id:uuid(), title:"Casa moderna • Zona premium", category:"casas", desc:"Sorteo de vivienda (demo).",
      price:25, totalTickets:8000, soldTickets:3240, endsAt:daysFromNow(22), theme:"cyan", featured:false },
    { id:uuid(), title:"Moto urbana • 150cc", category:"motos", desc:"Moto ideal para ciudad (demo).",
      price:8, totalTickets:4200, soldTickets:2100, endsAt:daysFromNow(8), theme:"amber", featured:true },
    { id:uuid(), title:"Setup Gamer • Full", category:"tecnologia", desc:"PC + monitor + periféricos (demo).",
      price:5, totalTickets:3000, soldTickets:980, endsAt:daysFromNow(15), theme:"pink", featured:false },
    { id:uuid(), title:"Camioneta • 4x4", category:"autos", desc:"Sorteo de vehículo 4x4 (demo).",
      price:15, totalTickets:6500, soldTickets:4120, endsAt:daysFromNow(5), theme:"lime", featured:false },
  ];
}

function sortFn(sort,a,b){
  if(sort==="featured") return (b.featured-a.featured) || (a.endsAt-b.endsAt);
  if(sort==="ending") return a.endsAt-b.endsAt;
  if(sort==="priceAsc") return a.price-b.price;
  if(sort==="priceDesc") return b.price-a.price;
  return 0;
}

function renderGrid(){
  const grid=$("#cardsGrid");
  if(!grid) return;

  const q=($("#searchInput")?.value || "").trim().toLowerCase();
  const cat=$("#categorySelect")?.value || "all";
  const sort=$("#sortSelect")?.value || "featured";

  let items=[...state.draws];
  if(cat!=="all") items=items.filter(d=>d.category===cat);
  if(q) items=items.filter(d=>d.title.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q));

  items.sort((a,b)=>sortFn(sort,a,b));
  grid.innerHTML="";

  if(!items.length){
    grid.innerHTML=`<div class="muted">No hay sorteos que coincidan.</div>`;
    return;
  }

  items.forEach(draw=>{
    const percent=pctSold(draw);

    const el=document.createElement("article");
    el.className="card";

    // ✅ IMPORTANTE: backticks ` ` (no comillas)
    el.innerHTML = `
      <div class="card__media" data-theme="${draw.theme}"></div>
      <div class="card__body">
        <div class="card__row">
          <span class="chip">${labelCategory(draw.category)}</span>
          <span class="small">Cierra: ${fmtDate(draw.endsAt)}</span>
        </div>

        <div class="card__title">${escapeHtml(draw.title)}</div>

        <div class="card__row">
          <div>
            <div class="small">Ticket</div>
            <div class="price">${fmtMoney(draw.price)}</div>
          </div>
          <div style="text-align:right">
            <div class="small">Disponibles</div>
            <div class="price">${fmtInt(availableTickets(draw))}</div>
          </div>
        </div>

        <div class="progressMini">
          <div class="progressMini__top">
            <span class="small">Progreso</span>
            <span class="small">${percent}%</span>
          </div>
          <div class="progress">
            <div class="progress__bar" style="width:${percent}%"></div>
          </div>
        </div>

        <div style="margin-top:12px; display:flex; gap:10px">
          <button class="btn btn--soft w-100" data-open="${draw.id}" type="button">Ver detalle</button>
        </div>
      </div>
    `;

    grid.appendChild(el);
  });

  $$("[data-open]").forEach(btn=>{
    btn.addEventListener("click", ()=>openDrawModal(btn.dataset.open));
  });
}

function openDrawModal(id){
  const draw=state.draws.find(d=>d.id===id);
  if(!draw) return;
  state.activeDrawId=id;
  state.qty=1;

  $("#modalCategory").textContent=labelCategory(draw.category);
  $("#modalTitle").textContent=draw.title;
  $("#modalDesc").textContent=draw.desc;
  $("#modalTicket").textContent=fmtMoney(draw.price);
  $("#modalAvailable").textContent=fmtInt(availableTickets(draw));
  $("#modalEnds").textContent=fmtDate(draw.endsAt);

  const percent=pctSold(draw);
  $("#modalProgressText").textContent=`${percent}% vendido`;
  $("#modalProgressBar").style.width=`${percent}%`;

  $("#modalMedia").style.background = themeBg(draw.theme);
  $("#qtyInput").value="1";

  showModal($("#drawModal"));
}

function closeDrawModal(){ hideModal($("#drawModal")); state.activeDrawId=null; }
function closeAdmin(){ hideModal($("#adminModal")); }

function setQty(n){ state.qty=clamp(Number(n)||1,1,999); $("#qtyInput").value=String(state.qty); }

function buyTicketsDemo(){
  const draw=state.draws.find(d=>d.id===state.activeDrawId);
  if(!draw) return;
  const qty=clamp(state.qty,1,999);
  const available=availableTickets(draw);

  if(available<=0) return toast("⚠️ No hay tickets disponibles.");
  if(qty>available) return toast(`⚠️ Solo quedan ${available}.`);

  draw.soldTickets += qty;
  toast(`✅ Compra simulada: ${qty} ticket(s) • Total ${fmtMoney(qty*draw.price)}`);
  renderGrid();
  openDrawModal(draw.id);
}

function resetAdminForm(){
  $("#aId").value="";
  $("#aTitle").value="";
  $("#aCategory").value="autos";
  $("#aPrice").value=10;
  $("#aTotal").value=5000;
  $("#aDesc").value="";
  $("#aTheme").value="violet";
  $("#aEnds").value = toDateInputValue(daysFromNow(10));
}

function toDateInputValue(date){
  const d=new Date(date);
  const yyyy=d.getFullYear();
  const mm=String(d.getMonth()+1).padStart(2,"0");
  const dd=String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function refreshAdmin(){
  const list=$("#adminList");
  if(!list) return;
  list.innerHTML="";

  state.draws.forEach(d=>{
    const item=document.createElement("div");
    item.className="adminItem";
    item.innerHTML=`
      <div>
        <div class="t">${escapeHtml(d.title)}</div>
        <div class="s">${labelCategory(d.category)} • Ticket ${fmtMoney(d.price)} • Cierra ${fmtDate(d.endsAt)}</div>
      </div>
      <div class="rowBtns">
        <button class="smallBtn" data-edit="${d.id}" type="button">Editar</button>
        <button class="smallBtn danger" data-del="${d.id}" type="button">Eliminar</button>
      </div>
    `;
    list.appendChild(item);
  });

  $$("[data-edit]").forEach(b=>b.addEventListener("click", ()=>loadToForm(b.dataset.edit)));
  $$("[data-del]").forEach(b=>b.addEventListener("click", ()=>deleteDraw(b.dataset.del)));

  const sel=$("#winnerDrawSelect");
  sel.innerHTML = state.draws.map(d=>`<option value="${d.id}">${escapeHtml(d.title)}</option>`).join("");

  renderWinners();
}

function loadToForm(id){
  const d=state.draws.find(x=>x.id===id);
  if(!d) return;
  $("#aId").value=d.id;
  $("#aTitle").value=d.title;
  $("#aCategory").value=d.category;
  $("#aPrice").value=d.price;
  $("#aTotal").value=d.totalTickets;
  $("#aDesc").value=d.desc;
  $("#aTheme").value=d.theme;
  $("#aEnds").value = toDateInputValue(d.endsAt);
  toast("✏️ Editando sorteo.");
}

function deleteDraw(id){
  const d=state.draws.find(x=>x.id===id);
  if(!d) return;
  if(!confirm(`¿Eliminar "${d.title}"?`)) return;
  state.draws = state.draws.filter(x=>x.id!==id);
  toast("🗑️ Eliminado.");
  refreshAdmin();
  renderGrid();
}

function onAdminSubmit(e){
  e.preventDefault();
  const isEdit=Boolean($("#aId").value);
  const id=$("#aId").value || uuid();

  const title=$("#aTitle").value.trim();
  const category=$("#aCategory").value;
  const price=parseInt($("#aPrice").value||"10",10);
  const totalTickets=parseInt($("#aTotal").value||"5000",10);
  const desc=$("#aDesc").value.trim() || "Descripción pendiente.";
  const endsAt = $("#aEnds").value ? new Date($("#aEnds").value + "T23:59:59") : daysFromNow(10);
  const theme=$("#aTheme").value;

  if(!title) return toast("⚠️ Título requerido.");

  if(isEdit){
    const idx=state.draws.findIndex(d=>d.id===id);
    const sold = clamp(state.draws[idx].soldTickets, 0, totalTickets);
    state.draws[idx] = { ...state.draws[idx], title, category, price, totalTickets, desc, endsAt, theme, soldTickets: sold };
    toast("✅ Actualizado.");
  } else {
    state.draws.unshift({ id, title, category, desc, price, totalTickets, soldTickets:0, endsAt, theme, featured:false });
    toast("✅ Creado.");
  }

  resetAdminForm();
  refreshAdmin();
  renderGrid();
}

function publishWinnerDemo(){
  const drawId=$("#winnerDrawSelect").value;
  const draw=state.draws.find(d=>d.id===drawId);
  if(!draw) return;

  state.winners.unshift({
    id: uuid(),
    drawId,
    drawTitle: draw.title,
    name: fakeName(),
    ticket: String(Math.floor(Math.random()*draw.totalTickets)+1).padStart(4,"0"),
    at: new Date(),
  });
  toast("🏆 Ganador publicado (demo).");
  renderWinners();
}

function renderWinners(){
  const box=$("#winnersLog");
  box.innerHTML="";

  if(!state.winners.length){
    box.innerHTML=`<div class="muted" style="margin-top:10px">Aún no hay ganadores.</div>`;
    return;
  }

  state.winners.slice(0,12).forEach(w=>{
    const el=document.createElement("div");
    el.className="winner";
    el.innerHTML=`
      <div class="wtop">
        <div class="wname">${escapeHtml(w.name)}</div>
        <div class="chip">Ticket #${w.ticket}</div>
      </div>
      <div class="wmeta">${escapeHtml(w.drawTitle)} • ${fmtDateTime(w.at)}</div>
    `;
    box.appendChild(el);
  });
}

function openAdmin(){ showModal($("#adminModal")); refreshAdmin(); }

function init(){
  state.draws = seedDraws();

  $("#year").textContent = new Date().getFullYear();

  const featured = state.draws.find(d=>d.featured) || state.draws[0];
  $("#featuredTitle").textContent = featured.title;
  $("#featuredTicketPrice").textContent = fmtMoney(featured.price);
  $("#featuredAvailable").textContent = fmtInt(availableTickets(featured));
  startCountdown($("#heroCountdown"), featured.endsAt);

  $("#howBtn").addEventListener("click", ()=>document.getElementById("como-funciona").scrollIntoView({behavior:"smooth"}));
  $("#featuredBuyBtn").addEventListener("click", ()=>toast("✅ Compra simulada: ticket agregado (demo)."));

  $("#searchInput").addEventListener("input", renderGrid);
  $("#categorySelect").addEventListener("change", renderGrid);
  $("#sortSelect").addEventListener("change", renderGrid);

  $("#closeModalBtn").addEventListener("click", closeDrawModal);
  $("#drawModal").addEventListener("click", (e)=>{ if(e.target?.dataset?.close) closeDrawModal(); });

  $("#qtyMinus").addEventListener("click", ()=>setQty(state.qty-1));
  $("#qtyPlus").addEventListener("click", ()=>setQty(state.qty+1));
  $("#qtyInput").addEventListener("input", (e)=>setQty(parseInt(e.target.value||"1",10)));
  $("#buyBtn").addEventListener("click", buyTicketsDemo);

  $("#openAdminBtn").addEventListener("click", openAdmin);
  $("#closeAdminBtn").addEventListener("click", closeAdmin);
  $("#adminModal").addEventListener("click", (e)=>{ if(e.target?.dataset?.close) closeAdmin(); });

  $("#resetFormBtn").addEventListener("click", resetAdminForm);
  $("#adminForm").addEventListener("submit", onAdminSubmit);
  $("#publishWinnerBtn").addEventListener("click", publishWinnerDemo);

  document.addEventListener("keydown", (e)=>{ if(e.key==="Escape"){ closeDrawModal(); closeAdmin(); } });

  resetAdminForm();
  renderGrid();
  refreshAdmin();
}

init();
