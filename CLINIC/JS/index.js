// =====================
// index.js (UPDATED)
// =====================

// --- Shorthands ---
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// --- API endpoints ---
const API = {
  owners: {
    list  : (q='') => fetch(`../API/OWNER/display.php${q?`?q=${encodeURIComponent(q)}`:''}`).then(r=>r.json()),
    create: (fd)   => fetch(`../API/OWNER/create.php`, { method:'POST', body:fd }).then(r=>r.json()),
    update: (fd)   => fetch(`../API/OWNER/update.php`, { method:'POST', body:fd }).then(r=>r.json()),
    delete: (id)   => fetch(`../API/OWNER/delete.php`, { method:'POST', body:new URLSearchParams({id}) }).then(r=>r.json()),
  },
  notes: {
    list  : ()     => fetch(`../API/NOTE/display.php`).then(r=>r.json()),
    create: (text) => fetch(`../API/NOTE/create.php`, { method:'POST', body:new URLSearchParams({notes:text}) }).then(r=>r.json()),
    delete: (id)   => fetch(`../API/NOTE/delete.php`,  { method:'POST', body:new URLSearchParams({id}) }).then(r=>r.json()),
  }
};

// --- Utils ---
const fmtDate = (iso) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};
const initials = (name) => name.split(' ').filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join('');

// --- Toasts ---
const toastArea = $('#toastArea');
function showToast({ title='Success', message='', type='success', timeout=2600 } = {}){
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <div class="row">
      <div class="title">${title}</div>
      <button aria-label="Dismiss">✕</button>
    </div>
    ${message ? `<div class="msg">${message}</div>` : '' }
  `;
  const close = () => { t.style.animation='toast-out .18s ease forwards'; setTimeout(()=>t.remove(),180); };
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
  return new Promise(resolve => {
    $('#confirmTitle').textContent = title;
    confirmMsg.textContent = message;
    confirmOk.textContent = okText;
    $('#confirmCancel').textContent = cancelText;
    const close = (val) => {
      confirmModal.classList.remove('open');
      confirmOk.removeEventListener('click', onOk);
      confirmCancel.removeEventListener('click', onCancel);
      resolve(val);
    };
    const onOk = () => close(true);
    const onCancel = () => close(false);
    confirmOk.addEventListener('click', onOk);
    confirmCancel.addEventListener('click', onCancel);
    confirmModal.classList.add('open');
  });
}

// --- Elements ---
const ownersGrid  = $('#ownersGrid');
const ownersCount = $('#ownersCount');
// Cats counter: try #catsCount; otherwise fall back to the 2nd stat value
let catsCountEl = $('#catsCount');
if (!catsCountEl) catsCountEl = document.querySelector('.stats .stat:nth-child(2) .value');

const modal       = $('#ownerModal');
const modalTitle  = $('#modalTitle');
const ownerForm   = $('#ownerForm');
const noteBtn     = $('#noteBtn');
const notesDrawer = $('#notesDrawer');

let editingId = null;
let owners = [];

// --- Render an owner card ---
function ownerCard(o){
  const hasImg = !!o.image;
  const el = document.createElement('article');
  el.className = 'card';
  el.dataset.id = o.id;
  el.innerHTML = `
    <div>${hasImg
      ? `<img class="avatar" src="../${o.image}" alt="${o.name}">`
      : `<div class="initials">${initials(o.name)}</div>`}</div>
    <div style="flex:1">
      <h4>${o.name}</h4>
      <div class="row">📧 ${o.email}</div>
      <div class="badge">☎ ${o.phone}</div>
      <div class="badge">📍 ${o.address}</div>
      <div class="badge">🐱 Cats: ${o.cat_count ?? 0}</div>
      <div class="badge">📅 ${fmtDate(o.created_at)}</div>
    </div>
    <div class="kebab">
      <button class="icon-btn note-icon" title="Notes" data-note>📝</button>
      <button class="icon-btn" data-kebab aria-label="Menu">⋯</button>
      <div class="menu">
        <button data-edit>Edit</button>
        <button data-delete>Delete</button>
      </div>
    </div>
  `;
  return el;
}

// --- Load owners + update top counters ---
async function loadOwners(){
  const res = await API.owners.list();
  if(!res.success){
    showToast({ title:'Load failed', message:res.message || 'Could not fetch owners.', type:'error' });
    return;
  }
  owners = res.data;

  // Top counters
  ownersCount.textContent = res.count || owners.length;
  const totalCatsFromAPI = typeof res.cats_total !== 'undefined' ? parseInt(res.cats_total, 10) : null;
  const totalCatsFromSum = owners.reduce((acc, o) => acc + (parseInt(o.cat_count, 10) || 0), 0);
  if (catsCountEl) catsCountEl.textContent = (totalCatsFromAPI ?? totalCatsFromSum);

  // Cards
  ownersGrid.innerHTML = '';
  owners.forEach(o => ownersGrid.appendChild(ownerCard(o)));
}
loadOwners();

// --- Client-side search ---
$('#searchInput').addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  $$('.card', ownersGrid).forEach(c=>{
    const name  = c.querySelector('h4').textContent.toLowerCase();
    const email = c.querySelector('.row').textContent.toLowerCase();
    c.style.display = (name.includes(q) || email.includes(q)) ? '' : 'none';
  });
});

// --- Card actions (kebab, edit, delete, notes, navigate) ---
ownersGrid.addEventListener('click', async (e)=>{
  const card = e.target.closest('.card'); if(!card) return;
  const menu = card.querySelector('.menu');

  if (e.target.matches('[data-kebab]')) {
    $$('.menu', ownersGrid).forEach(m => { if(m!==menu) m.classList.remove('open'); });
    menu.classList.toggle('open');
    return;
  }

  if (e.target.matches('[data-edit]')) {
    menu.classList.remove('open');
    openModal('edit', card.dataset.id);
    return;
  }

  if (e.target.matches('[data-delete]')) {
    menu.classList.remove('open');
    const id = card.dataset.id;

    const ok = await askConfirm(
      'Delete this owner? This action cannot be undone.',
      { title:'Delete Owner', okText:'Yes, delete', cancelText:'Cancel' }
    );
    if (!ok) return;

    const res = await API.owners.delete(id);
    if(!res.success){
      showToast({ title:'Delete failed', message: res.message || 'Unable to delete owner.', type:'error' });
      return;
    }
    showToast({ title:'Owner deleted', type:'success' });
    await loadOwners(); // refresh counters + cards
    return;
  }

  if (e.target.matches('[data-note]')) {
    openNotes();
    return;
  }

  // Navigate to owner page
  if (!e.target.closest('.kebab') && !e.target.closest('[data-note]') && !e.target.closest('.menu')) {
    const id = card.dataset.id;
    window.location.href = `owner.html?id=${encodeURIComponent(id)}`;
  }
});

// --- Modal (Create/Update) ---
$('#addOwner').addEventListener('click', ()=> openModal('create'));

function openModal(mode, id=null){
  editingId = null;
  ownerForm.reset();
  $('#password').required = (mode === 'create');
  if (mode === 'create') {
    modalTitle.textContent = 'Add Owner';
  } else {
    modalTitle.textContent = 'Edit Owner';
    const o = owners.find(x => String(x.id) === String(id));
    if (o) {
      editingId = o.id;
      $('#ownerId').value = o.id;
      $('#name').value    = o.name;
      $('#phone').value   = o.phone;
      $('#email').value   = o.email;
      $('#address').value = o.address;
    }
  }
  modal.classList.add('open');
}
function closeModal(){ modal.classList.remove('open'); }
$('#closeModal').addEventListener('click', closeModal);
$('#cancelModal').addEventListener('click', closeModal);

ownerForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fd = new FormData(ownerForm);
  let res;
  if (editingId) {
    if (!fd.get('password')) fd.delete('password');
    res = await API.owners.update(fd);
  } else {
    res = await API.owners.create(fd);
  }
  if (!res.success) {
    showToast({ title:'Save failed', message: res.message || 'Unable to save owner.', type:'error' });
    return;
  }
  showToast({ title: editingId ? 'Owner updated' : 'Owner created', type:'success' });
  closeModal();
  await loadOwners(); // refresh counters + cards
});

// --- Notes Drawer (global) ---
function openNotes(){ notesDrawer.classList.add('open'); loadNotes(); }
function closeNotes(){ notesDrawer.classList.remove('open'); }
$('#closeNotes').addEventListener('click', closeNotes);
noteBtn.addEventListener('click', openNotes);

async function loadNotes(){
  const res = await API.notes.list();
  if(!res.success){
    showToast({title:'Failed to load notes', message:res.message||'', type:'error'});
    return;
  }
  const list = $('#notesList');
  list.innerHTML = '';
  res.data.forEach(n=>{
    const item = document.createElement('div');
    item.className = 'note-item';
    item.innerHTML = `
      <div>${n.notes.replace(/</g,'&lt;')}</div>
      <div class="note-meta">
        <span>🕒 ${fmtDate(n.created_at)}</span>
        <button class="note-delete" data-id="${n.id}">Delete</button>
      </div>
    `;
    list.appendChild(item);
  });
}

$('#noteForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const text = $('#noteText').value.trim();
  if (!text) return;
  const res = await API.notes.create(text);
  if(!res.success){
    showToast({ title:'Save note failed', message: res.message || 'Unable to save note.', type:'error' });
    return;
  }
  $('#noteText').value = '';
  showToast({ title:'Note saved', type:'success' });
  await loadNotes();
});

$('#notesList').addEventListener('click', async (e)=>{
  if (e.target.matches('.note-delete')) {
    const id = e.target.dataset.id;

    const ok = await askConfirm('Delete this note?', { title:'Delete Note', okText:'Yes, delete' });
    if (!ok) return;

    const res = await API.notes.delete(id);
    if(!res.success){
      showToast({ title:'Delete failed', message: res.message || 'Unable to delete note.', type:'error' });
      return;
    }
    showToast({ title:'Note deleted', type:'success' });
    await loadNotes();
  }
});

// --- Close kebab menus when clicking outside ---
document.addEventListener('click', (e)=>{
  if (!e.target.closest('.kebab')) {
    $$('.menu', ownersGrid).forEach(m=>m.classList.remove('open'));
  }
});
