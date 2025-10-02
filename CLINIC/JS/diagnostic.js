// diagnostic.js — list all cats, read-only (no navigation)
const $  = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

const API = { cats: { listAll: ()=> fetch(`../API/CAT/display.php`).then(r=>r.json()) } };
const toastArea = $('#toastArea');
function showToast({ title='Notice', message='', type='info', timeout=2200 } = {}){
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<div class="row"><div class="title">${title}</div><button aria-label="Dismiss">✕</button></div>${message ? `<div class="msg">${message}</div>` : '' }`;
  const close = () => { t.style.animation='toast-out .18s ease forwards'; setTimeout(()=>t.remove(),180); };
  t.querySelector('button').addEventListener('click', close);
  toastArea.appendChild(t);
  if (timeout) setTimeout(close, timeout);
}
const fmtDate=(iso)=>{ const d=new Date(iso); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; };
const initials = (name) => name?.split(' ').filter(Boolean).slice(0,2).map(s=>s[0].toUpperCase()).join('') || '?';

const catsGrid = $('#catsGrid');
function catCard(c){
  const hasImg = !!c.image;
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <div>${hasImg
      ? `<img class="avatar" src="../${c.image}" alt="${c.name}">`
      : `<div class="initials">${initials(c.name)}</div>`}</div>
    <div style="flex:1">
      <h4>${c.name}</h4>
      <div class="row">🐾 ${c.breed || '—'}</div>
      <div class="badge">👤 ${c.owner_name || 'Unknown'}</div>
      <div class="badge">📅 ${fmtDate(c.created_at)}</div>
    </div>
  `;
  return el;
}
async function load(){
  const res = await API.cats.listAll();
  if(!res.success){ showToast({title:'Failed to load', message:res.message||'', type:'error'}); return; }
  catsGrid.innerHTML = '';
  res.data.forEach(c => catsGrid.appendChild(catCard(c)));
}
load();
