// alert.js — list all cats, navigate to graph on click
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const API = {
  cats: {
    listAll: () => fetch(`../API/CAT/display.php`).then(r => r.json())
  },
  records: {
    list: (cat_id) => fetch(`../API/RECORD/display.php?cat_id=${encodeURIComponent(cat_id)}`).then(r => r.json())
  }
};

const toastArea = $('#toastArea');

function showToast({
  title = 'Notice',
  message = '',
  type = 'info',
  timeout = 2200
} = {}) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `
    <div class="row"><div class="title">${title}</div><button aria-label="Dismiss">✕</button></div>
    ${message ? `<div class="msg">${message}</div>` : ''}
  `;
  const close = () => {
    t.style.animation = 'toast-out .18s ease forwards';
    setTimeout(() => t.remove(), 180);
  };
  t.querySelector('button').addEventListener('click', close);
  toastArea.appendChild(t);
  if (timeout) setTimeout(close, timeout);
}

const fmtDate = (iso) => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const initials = (name) => name?.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('') || '?';

const catsGrid = $('#catsGrid');
const navAlertIcon = $('#navAlertIcon');

function catCard(c, isAbnormal = false) {
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
      <div class="row">🐾 ${c.breed || '—'}</div>
      <div class="badge">👤 ${c.owner_name || 'Unknown'}</div>
      <div class="badge">📅 ${fmtDate(c.created_at)}</div>
      <div class="badge ${isAbnormal ? 'heartbeat-alert' : ''}">
        ❤️
        ${isAbnormal ? '<span class="abnormal-icon">⚠️</span>' : ''}
      </div>
    </div>
  `;
  return el;
}

async function load() {
  const allCatsRes = await API.cats.listAll();
  if (!allCatsRes.success) {
    showToast({
      title: 'Failed to load',
      message: allCatsRes.message || '',
      type: 'error'
    });
    return;
  }
  catsGrid.innerHTML = '';
  let hasAbnormal = false;
  for (const cat of allCatsRes.data) {
    let isAbnormal = false;
    if (cat.normal_heartbeat) {
      const catRecordsRes = await API.records.list(cat.id);
      if (catRecordsRes.success && catRecordsRes.data.length > 0) {
        const mostRecentRecord = catRecordsRes.data[catRecordsRes.data.length - 1];
        const [minBPM, maxBPM] = cat.normal_heartbeat.split('-').map(s => parseInt(s.trim()));
        const currentBPM = parseInt(mostRecentRecord.heartbeat);
        if ((!isNaN(minBPM) && currentBPM < minBPM) || (!isNaN(maxBPM) && currentBPM > maxBPM)) {
          isAbnormal = true;
          hasAbnormal = true;
        }
      }
    }
    catsGrid.appendChild(catCard(cat, isAbnormal));
  }
  if (hasAbnormal) {
    navAlertIcon.style.display = 'inline-block';
  } else {
    navAlertIcon.style.display = 'none';
  }
}
load();

// Navigate to graph on card click
catsGrid.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const id = card.dataset.id;
  window.location.href = `graph.html?id=${encodeURIComponent(id)}`;
});