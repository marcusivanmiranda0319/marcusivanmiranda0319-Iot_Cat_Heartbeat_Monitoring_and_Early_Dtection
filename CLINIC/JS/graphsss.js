// ========= graphss.js =========
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
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

const fmtDateTime = (iso) => {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${dd}/${mm}/${yy} : ${hours}:${minutes} ${ampm}`;
};

const fmtChartLabel = (iso) => {
  const d = new Date(iso);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthAbbr = monthNames[d.getMonth()];
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return [`${monthAbbr} :`, `${hours}:${minutes} ${ampm}`];
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

// Global Chart instance
let heartbeatChart;

const possibleDiseases = {
  'Cardiomyopathies': [{
    name: 'Hypertrophic Cardiomyopathy (HCM)',
    range: '>220 bpm'
  }, {
    name: 'Dilated Cardiomyopathy (DCM)',
    range: 'elevated heart rate'
  }, {
    name: 'Restrictive Cardiomyopathy (RCM)',
    range: 'often associated with tachycardia'
  }],
  'Arrhythmias (Abnormal Rhythms)': [{
    name: 'Bradycardia',
    range: '<140 bpm'
  }, {
    name: 'Third-Degree Atrioventricular (AV) Block',
    range: '40-65 bpm'
  }, {
    name: 'Tachycardia',
    range: '>220 bpm'
  }, {
    name: 'Supraventricular Tachycardia (SVT)',
    range: '150-380 bpm'
  }, {
    name: 'Ventricular Tachycardia (VT)',
    range: '>240 bpm'
  }, {
    name: 'Sinus Arrhythmia',
    range: '140-220 bpm'
  }],
  'Congenital Heart Defects': [{
    name: 'Ventricular Septal Defect (VSD)',
    range: 'high-end of the normal range or above'
  }, {
    name: 'Patent Ductus Arteriosus (PDA)',
    range: 'elevated'
  }]
};

function getMatchingDiseases(bpm, normalRange) {
  let matchingDiseases = [];
  const [normalMin, normalMax] = normalRange.split('-').map(s => parseInt(s.trim()));

  for (const group in possibleDiseases) {
    let groupMatches = [];
    for (const disease of possibleDiseases[group]) {
      let rangeMatch = false;
      const rangeText = disease.range;

      if (rangeText.includes('<')) {
        const value = parseInt(rangeText.replace(/<|bpm/g, '').trim());
        if (bpm < value) {
          rangeMatch = true;
        }
      } else if (rangeText.includes('>')) {
        const value = parseInt(rangeText.replace(/>|bpm/g, '').trim());
        if (bpm > value) {
          rangeMatch = true;
        }
      } else if (rangeText.includes('-')) {
        const [min, max] = rangeText.replace(/bpm/g, '').split('-').map(s => parseInt(s.trim()));
        if (bpm >= min && bpm <= max) {
          rangeMatch = true;
        }
      } else if (rangeText.includes('elevated') || rangeText.includes('tachycardia')) {
        // Assume these are higher than normal range for a general match
        if (!isNaN(normalMax) && bpm > normalMax) {
          rangeMatch = true;
        }
      } else if (rangeText.includes('normal')) {
        // Skip normal range diseases for abnormal readings
        continue;
      }
      if (rangeMatch) {
        groupMatches.push(`${disease.name}: ${disease.range}`);
      }
    }
    if (groupMatches.length > 0) {
      matchingDiseases.push(`\n${group}:`);
      matchingDiseases = matchingDiseases.concat(groupMatches);
    }
  }
  return matchingDiseases;
}

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

// Draw the initial chart
async function drawChart(cat_id) {
  const res = await API.records(cat_id);
  const catRes = await API.cat(cat_id);
  const normal_heartbeat = catRes.data.normal_heartbeat;
  const disease = catRes.data.disease;

  if (!res.success || res.data.length === 0) {
    showToast({
      title: 'No records found',
      message: 'No heartbeat data available for this cat.',
      type: 'info'
    });
    $('#bpmValue').textContent = '--';
    $('#bpmUpdated').textContent = '—';
    $('#heartbeatReading').textContent = 'No data available.';
    if (heartbeatChart) heartbeatChart.destroy();
    return;
  }
  const records = res.data;

  // Display the most recent heartbeat value and check status
  const mostRecentRecord = records[records.length - 1];
  $('#bpmValue').textContent = mostRecentRecord.heartbeat;
  const timeString = fmtDateTime(mostRecentRecord.recorded_at);

  const [minBPM, maxBPM] = normal_heartbeat.split('-').map(s => parseInt(s.trim()));
  const currentBPM = parseInt(mostRecentRecord.heartbeat);
  const heartbeatReadingEl = $('#heartbeatReading');

  heartbeatReadingEl.classList.remove('normal', 'abnormal', 'small');
  heartbeatReadingEl.innerHTML = '';

  if (!isNaN(minBPM) && !isNaN(maxBPM) && currentBPM >= minBPM && currentBPM <= maxBPM) {
    heartbeatReadingEl.textContent = 'Normal';
    heartbeatReadingEl.classList.add('normal');
  } else {
    heartbeatReadingEl.classList.add('abnormal');
    let abnormalText = '';
    if (currentBPM < minBPM) {
      abnormalText = `Abnormal Reading: Heartbeat pattern is lower than the normal range.`;
    } else {
      abnormalText = `Abnormal Reading: Heartbeat pattern is higher than the normal range.`;
    }
    heartbeatReadingEl.textContent = abnormalText;

    if (disease && disease.toLowerCase() === 'normal') {
      const matchingDiseases = getMatchingDiseases(currentBPM, normal_heartbeat);
      if (matchingDiseases.length > 0) {
        let diseasesList = matchingDiseases.map(d => `<li>${d}</li>`).join('');
        heartbeatReadingEl.innerHTML += `
          <div class="diseases-section">
            <h4 class="diseases-title">Possible Related Diseases:</h4>
            <ul class="diseases-list">${diseasesList}</ul>
          </div>
        `;
        heartbeatReadingEl.classList.add('small');
      }
    }
  }

  $('#bpmUpdated').textContent = `Last reading: ${timeString}`;

  const labels = records.map(r => fmtChartLabel(r.recorded_at));
  const data = records.map(r => parseInt(r.heartbeat));

  const ctx = $('#heartbeatChart').getContext('2d');
  if (heartbeatChart) heartbeatChart.destroy();

  heartbeatChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Heartbeat (BPM)',
        data: data,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#6366f1'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'BPM',
            color: '#94a3b8'
          },
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Time',
            color: '#94a3b8'
          },
          grid: {
            color: '#334155'
          },
          ticks: {
            color: '#94a3b8',
            font: {
              size: 8
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += `${context.parsed.y} BPM`;
              }
              return label;
            }
          }
        }
      }
    }
  });
}

// Update the chart with new data
async function updateChart(cat_id) {
  const res = await API.records(cat_id);
  const catRes = await API.cat(cat_id);
  const normal_heartbeat = catRes.data.normal_heartbeat;
  const disease = catRes.data.disease;

  if (res.success && res.data.length > 0) {
    const records = res.data;
    const mostRecentRecord = records[records.length - 1];
    $('#bpmValue').textContent = mostRecentRecord.heartbeat;
    const timeString = fmtDateTime(mostRecentRecord.recorded_at);

    const [minBPM, maxBPM] = normal_heartbeat.split('-').map(s => parseInt(s.trim()));
    const currentBPM = parseInt(mostRecentRecord.heartbeat);
    const heartbeatReadingEl = $('#heartbeatReading');

    heartbeatReadingEl.classList.remove('normal', 'abnormal', 'small');
    heartbeatReadingEl.innerHTML = '';

    if (!isNaN(minBPM) && !isNaN(maxBPM) && currentBPM >= minBPM && currentBPM <= maxBPM) {
      heartbeatReadingEl.textContent = 'Normal';
      heartbeatReadingEl.classList.add('normal');
    } else {
      heartbeatReadingEl.classList.add('abnormal');
      let abnormalText = '';
      if (currentBPM < minBPM) {
        abnormalText = `Abnormal Reading: Heartbeat pattern is lower than the normal range.`;
      } else {
        abnormalText = `Abnormal Reading: Heartbeat pattern is higher than the normal range.`;
      }
      heartbeatReadingEl.textContent = abnormalText;

      if (disease && disease.toLowerCase() === 'normal') {
        const matchingDiseases = getMatchingDiseases(currentBPM, normal_heartbeat);
        if (matchingDiseases.length > 0) {
          let diseasesList = matchingDiseases.map(d => `<li>${d}</li>`).join('');
          heartbeatReadingEl.innerHTML += `
            <div class="diseases-section">
              <h4 class="diseases-title">Possible Related Diseases:</h4>
              <ul class="diseases-list">${diseasesList}</ul>
            </div>
          `;
          heartbeatReadingEl.classList.add('small');
        }
      }
    }

    $('#bpmUpdated').textContent = `Last reading: ${timeString}`;

    const labels = records.map(r => fmtChartLabel(r.recorded_at));
    const data = records.map(r => parseInt(r.heartbeat));

    // Update the existing chart instance
    if (heartbeatChart) {
      heartbeatChart.data.labels = labels;
      heartbeatChart.data.datasets[0].data = data;
      heartbeatChart.update();
    }
  }
}

// Call the functions to start everything
(async function init() {
  const cat = await getDetails();
  if (cat) {
    drawChart(cat.id);
    setInterval(() => updateChart(cat.id), 30000);
  }
})();