// ========= historical_records.js =========
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const API = {
  cat: (id) => fetch(`../API/CAT/display.php?id=${encodeURIComponent(id)}`).then(r => r.json()),
  owner: (id) => fetch(`../API/OWNER/display.php?id=${encodeURIComponent(id)}`).then(r => r.json()),
  records: (cat_id) => fetch(`../API/RECORD/display.php?cat_id=${encodeURIComponent(cat_id)}`).then(r => r.json()),
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

// utils
const fmtDate = (iso) => {
  const d = new Date(iso);
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return d.toLocaleDateString('en-US', options);
};

const fmtDateTime = (iso) => {
  const d = new Date(iso);
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const timeOptions = { hour: 'numeric', minute: 'numeric', hour12: true };
  const dateStr = d.toLocaleDateString('en-US', dateOptions);
  const timeStr = d.toLocaleTimeString('en-US', timeOptions);
  return `${dateStr} : ${timeStr}`;
};

const initials = (name) => name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
const ageFromBirthdate = (yyyy_mm_dd) => {
  const b = new Date(yyyy_mm_dd);
  if (Number.isNaN(b.getTime())) return '-';
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years--;
  return `${years}y`;
};
const params = new URLSearchParams(location.search);
const CAT_ID = params.get('id');

// Get and render cat and owner details
async function getDetails() {
  if (!CAT_ID) {
    showToast({
      title: 'Missing cat id',
      type: 'error'
    });
    return;
  }

  const catRes = await API.cat(CAT_ID);
  if (!catRes.success) {
    showToast({
      title: 'Failed to load cat',
      message: catRes.message || '',
      type: 'error'
    });
    return;
  }
  const c = catRes.data;

  let ownerName = '—',
    ownerEmail = '—';
  if (c.owner_id) {
    const ownerRes = await API.owner(c.owner_id);
    if (ownerRes.success && ownerRes.data) {
      ownerName = ownerRes.data.name;
      ownerEmail = ownerRes.data.email;
    }
  }
  const infoPane = $('#infoPanel');
  let diseaseNote = '';
  if (c.disease) {
    if (c.disease.toLowerCase() === 'normal') {
      diseaseNote = `<div class="info-note"><b>Disease:</b> No Existing Disease</div>`;
    } else {
      diseaseNote = `<div class="info-note"><b>Disease:</b> ${c.disease}</div>`;
    }
  }

  infoPane.innerHTML = `
    <div class="cat-head">
      ${c.image ? `<img class="avatar" src="../${c.image}" alt="${c.name}">`
                : `<div class="initials">${initials(c.name)}</div>`}
      <div>
        <div class="info-name">${c.name}</div>
        <div class="badges">
          <span class="badge">🐾 ${c.breed}</span>
          <span class="badge">🎂 ${fmtDate(c.birthdate)} • ${ageFromBirthdate(c.birthdate)}</span>
          <span class="badge">🔌 ${c.device_name || '—'}</span>
          <span class="badge">❤️ ${c.normal_heartbeat || '—'} bpm</span>
          <span class="badge">📅 ${fmtDate(c.created_at)}</span>
        </div>
      </div>
    </div>
    <div class="info-row"><b>Owner:</b> ${ownerName}</div>
    <div class="info-row"><b>Contact:</b> ${ownerEmail}</div>
    ${diseaseNote}
  `;
  return c;
}

// Create and style a single record item
function createRecordCard(record, normal_heartbeat) {
    const [minBPM, maxBPM] = normal_heartbeat.split('-').map(s => parseInt(s.trim()));
    const status = (record.heartbeat >= minBPM && record.heartbeat <= maxBPM) ? 'Normal' : 'Abnormal';
    
    const item = document.createElement('div');
    item.className = 'record-item';
    item.innerHTML = `
        <div class="time">${fmtDateTime(record.recorded_at)}</div>
        <div class="bpm">${record.heartbeat} BPM</div>
        <div class="status ${status.toLowerCase()}">${status}</div>
    `;
    return item;
}

// Get and render heartbeat records
async function getRecords(cat_id) {
  const res = await API.records(cat_id);
  const catRes = await API.cat(cat_id);
  const normal_heartbeat = catRes.data.normal_heartbeat;
  const recordsList = $('#recordsList');
  recordsList.innerHTML = ''; // Clear previous records

  if (!res.success || res.data.length === 0) {
    recordsList.innerHTML = '<div style="text-align: center; color: #9ca3af; padding: 20px;">No records found.</div>';
    showToast({
      title: 'No records found',
      message: 'No heartbeat data available for this cat.',
      type: 'info'
    });
    return;
  }

  const records = res.data.sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at)); // Sort by date descending

  records.forEach(record => {
    recordsList.appendChild(createRecordCard(record, normal_heartbeat));
  });
}

// Call the functions to start everything
(async function init() {
  const cat = await getDetails();
  if (cat) {
    getRecords(cat.id);
  }
})();