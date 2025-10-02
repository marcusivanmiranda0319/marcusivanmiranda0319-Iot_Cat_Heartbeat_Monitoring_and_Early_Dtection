// =====================
// owner.js (FULL)
// - Shows selected owner info
// - Lists cats as cards with kebab menu (Edit/Delete)
// - Add/Edit cat via modal
// - Clicking a cat card navigates to graph.html?id=CAT_ID
// =====================

// --- Helpers ---
const $  = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

const API = {
  owner: {
    show: (id)=> fetch(`../API/OWNER/display.php?id=${encodeURIComponent(id)}`).then(r=>r.json())
  },
  cats: {
    list  : (owner_id)=> fetch(`../API/CAT/display.php?owner_id=${encodeURIComponent(owner_id)}`).then(r=>r.json()),
    show  : (id)=> fetch(`../API/CAT/display.php?id=${encodeURIComponent(id)}`).then(r=>r.json()),
    create: (fd)      => fetch(`../API/CAT/create.php`, {method:'POST', body:fd}).then(r=>r.json()),
    update: (fd)      => fetch(`../API/CAT/update.php`, {method:'POST', body:fd}).then(r=>r.json()),
    delete: (id)      => fetch(`../API/CAT/delete.php`, {method:'POST', body:new URLSearchParams({id})}).then(r=>r.json())
  }
};

// --- Toasts (same style as index) ---
const toastArea = $('#toastArea');
function showToast({ title='Success', message='', type='success', timeout=2600 } = {}){
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <div class="row"><div class="title">${title}</div><button aria-label="Dismiss">✕</button></div>
    ${message ? `<div class="msg">${message}</div>` : '' }
  `;
  const close = () => { t.style.animation='toast-out .18s ease forwards'; setTimeout(()=>t.remove(),180) };
  t.querySelector('button').addEventListener('click', close);
  toastArea.appendChild(t);
  if (timeout) setTimeout(close, timeout);
}

// --- Confirm dialog ---
const confirmModal  = $('#confirmModal');
const confirmMsg    = $('#confirmMessage');
const confirmOk     = $('#confirmOk');
const confirmCancel = $('#confirmCancel');
function askConfirm(message, {title='Please Confirm', okText='Yes, Continue', cancelText='Cancel'} = {}) {
  return new Promise(resolve=>{
    $('#confirmTitle').textContent=title;
    confirmMsg.textContent=message;
    confirmOk.textContent=okText;
    $('#confirmCancel').textContent=cancelText;
    const close=(v)=>{ confirmModal.classList.remove('open'); confirmOk.removeEventListener('click',onOk); confirmCancel.removeEventListener('click',onCancel); resolve(v); };
    const onOk=()=>close(true), onCancel=()=>close(false);
    confirmOk.addEventListener('click', onOk); confirmCancel.addEventListener('click', onCancel);
    confirmModal.classList.add('open');
  });
}

// --- State & elements ---
const params = new URLSearchParams(location.search);
const OWNER_ID = params.get('id');

const ownerCard = $('#ownerCard');
const catsGrid  = $('#catsGrid');

const catModal = $('#catModal');
const catForm  = $('#catForm');
const catModalTitle = $('#catModalTitle');

let editingCatId = null;

// --- Utils ---
const fmtDate = (iso) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
const initials = (name) => name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join('');
const ageFromBirthdate = (yyyy_mm_dd) => {
  const b = new Date(yyyy_mm_dd);
  if (Number.isNaN(b.getTime())) return '-';
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
  return `${years}y`;
};

// --- Load owner info ---
async function loadOwner(){
  if (!OWNER_ID){ showToast({title:'Missing owner id', type:'error'}); return; }
  const res = await API.owner.show(OWNER_ID);
  if (!res.success){ showToast({title:'Load owner failed', message:res.message||'', type:'error'}); return; }
  const o = res.data;
  ownerCard.innerHTML = `
    ${o.image ? `<img class="avatar" src="../${o.image}" alt="${o.name}"/>` : `<div class="initials">${initials(o.name)}</div>`}
    <div style="flex:1">
      <h2>${o.name}</h2>
      <div>
        <span class="badge">📧 ${o.email}</span>
        <span class="badge">☎ ${o.phone}</span>
        <span class="badge">📍 ${o.address}</span>
        <span class="badge">📅 ${fmtDate(o.created_at)}</span>
      </div>
    </div>
  `;
}

// --- Render a cat card (same look/behavior as index) ---
function catCard(c){
  const hasImg = !!c.image;
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.id = c.id;
  el.innerHTML = `
    <div>${hasImg
      ? `<img class="avatar" src="../${c.image}" alt="${c.name}">`
      : `<div class="initials">${initials(c.name)}</div>`}</div>
    <div style="flex:1">
      <h4>${c.name}</h4>
      <div class="row">🐾 ${c.breed} ${c.disease ? `${c.disease.replace(/</g,'&lt;')}` : ''}</div>
      
      <div class="badge">🎂 ${fmtDate(c.birthdate)}</div>
      <div class="badge">⏳ ${ageFromBirthdate(c.birthdate)}</div>
      <div class="badge">🔌 ${c.device_name || '—'}</div>
      <div class="badge">❤️ ${c.normal_heartbeat || '—'} bpm</div>
      <div class="badge">📅 ${fmtDate(c.created_at)}</div>
      
    </div>
    <div class="kebab">
      <button class="icon-btn" data-kebab aria-label="Menu">⋯</button>
      <div class="menu">
        <button data-edit>Edit</button>
        <button data-delete>Delete</button>
      </div>
    </div>
  `;
  return el;
}

// --- Load cats as cards ---
async function loadCats(){
  const res = await API.cats.list(OWNER_ID);
  if (!res.success){ showToast({title:'Load cats failed', message:res.message||'', type:'error'}); return; }
  catsGrid.innerHTML = '';
  res.data.forEach(c => catsGrid.appendChild(catCard(c)));
}

// --- Grid actions (kebab, edit, delete, navigate) ---
catsGrid.addEventListener('click', async (e)=>{
  const card = e.target.closest('.card'); if(!card) return;
  const menu = card.querySelector('.menu');

  // Toggle kebab
  if (e.target.matches('[data-kebab]')) {
    $$('.menu', catsGrid).forEach(m => { if(m!==menu) m.classList.remove('open'); });
    menu.classList.toggle('open');
    return;
  }

  // Edit cat
  if (e.target.matches('[data-edit]')) {
    menu.classList.remove('open');
    const id = card.dataset.id;
    const res = await API.cats.show(id);
    if (!res.success){ showToast({title:'Load cat failed', message:res.message||'', type:'error'}); return; }
    openCatModal(res.data);
    return;
  }

  // Delete cat
  if (e.target.matches('[data-delete]')) {
    menu.classList.remove('open');
    const id = card.dataset.id;
    const ok = await askConfirm('Delete this cat?', {title:'Delete Cat', okText:'Yes, delete'});
    if (!ok) return;
    const res = await API.cats.delete(id);
    if (!res.success){ showToast({title:'Delete failed', message:res.message||'', type:'error'}); return; }
    showToast({title:'Cat deleted', type:'success'});
    await loadCats();
    return;
  }

  // Navigate to Graph page when clicking the card body (not on menus)
  if (!e.target.closest('.kebab') && !e.target.closest('.menu')) {
    const id = card.dataset.id;
    window.location.href = `graph.html?id=${encodeURIComponent(id)}`;
  }
});

// --- Cat Modal open/close ---
$('#addCat').addEventListener('click', ()=> openCatModal());
$('#closeCatModal').addEventListener('click', closeCatModal);
$('#cancelCatModal').addEventListener('click', closeCatModal);

function openCatModal(cat=null){
  editingCatId = null;
  catForm.reset();
  if (cat){
    editingCatId = cat.id;
    $('#catId').value       = cat.id;
    $('#c_name').value      = cat.name;
    $('#c_breed').value     = cat.breed;
    $('#c_birthdate').value = cat.birthdate;
    $('#c_device').value    = cat.device_name || '';
    $('#c_disease').value   = cat.disease || '';
    $('#c_normal_heartbeat').value = cat.normal_heartbeat || '';
    catModalTitle.textContent = 'Edit Cat';
  } else {
    catModalTitle.textContent = 'Add Cat';
  }
  catModal.classList.add('open');
}
function closeCatModal(){ catModal.classList.remove('open'); }

// --- Save cat (create/update) ---
catForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(catForm);
  if (editingCatId){
    const res = await API.cats.update(fd);
    if(!res.success){ showToast({title:'Save failed', message:res.message||'', type:'error'}); return; }
    showToast({title:'Cat updated', type:'success'});
  } else {
    fd.append('owner_id', OWNER_ID);
    const res = await API.cats.create(fd);
    if(!res.success){ showToast({title:'Save failed', message:res.message||'', type:'error'}); return; }
    showToast({title:'Cat added', type:'success'});
  }
  closeCatModal();
  await loadCats();
});

// --- Close kebab menus when clicking outside ---
document.addEventListener('click', (e)=>{
  if (!e.target.closest('.kebab')) $$('.menu', catsGrid).forEach(m=>m.classList.remove('open'));
});

// --- Init ---
(async function init(){
  await loadOwner();
  await loadCats();
})();