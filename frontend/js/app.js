let capturedImage = null;
let stream = null;

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const camBtn = document.getElementById('camBtn');
const cameraContainer = document.getElementById('camera-container');
const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const canvas = document.getElementById('canvas');
const previewContainer = document.getElementById('preview-container');
const previewImg = document.getElementById('previewImg');
const resetBtn = document.getElementById('resetBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingState = document.getElementById('loadingState');
const resultsDiv = document.getElementById('results');

['dragover', 'drop'].forEach(e => uploadZone.addEventListener(e, ev => ev.preventDefault()));
uploadZone.addEventListener('dragover', () => uploadZone.classList.add('drag'));
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag'));
uploadZone.addEventListener('drop', ev => {
  uploadZone.classList.remove('drag');
  const file = ev.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadPreview(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) loadPreview(fileInput.files[0]);
});

function loadPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    capturedImage = e.target.result;
    previewImg.src = capturedImage;
    uploadZone.style.display = 'none';
    camBtn.style.display = 'none';
    document.querySelector('.or-divider').style.display = 'none';
    previewContainer.style.display = 'block';
    analyzeBtn.style.display = 'block';
    stopCamera();
  };
  reader.readAsDataURL(file);
}

camBtn.addEventListener('click', async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }, 
      audio: false 
    });
    video.srcObject = stream;
    cameraContainer.style.display = 'block';
    camBtn.style.display = 'none';
    document.querySelector('.or-divider').style.display = 'none';
  } catch {
    alert('Unable to access camera. Please upload a photo instead.');
  }
});

captureBtn.addEventListener('click', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  capturedImage = canvas.toDataURL('image/jpeg', 0.85);
  previewImg.src = capturedImage;
  cameraContainer.style.display = 'none';
  uploadZone.style.display = 'none';
  previewContainer.style.display = 'block';
  analyzeBtn.style.display = 'block';
  stopCamera();
});

function stopCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
}

resetBtn.addEventListener('click', () => {
  capturedImage = null;
  previewContainer.style.display = 'none';
  analyzeBtn.style.display = 'none';
  analyzeBtn.disabled = false;
  resultsDiv.style.display = 'none';
  resultsDiv.innerHTML = '';
  loadingState.style.display = 'none';
  uploadZone.style.display = 'block';
  camBtn.style.display = 'flex';
  document.querySelector('.or-divider').style.display = 'flex';
  fileInput.value = '';
  previewImg.src = '';
  cameraContainer.style.display = 'none';
  stopCamera();
});

analyzeBtn.addEventListener('click', analyzeImage);

async function analyzeImage() {
  if (!capturedImage) return;
  analyzeBtn.disabled = true;
  loadingState.style.display = 'block';
  resultsDiv.style.display = 'none';

  // Lock out header navigation links during analysis to prevent premature page switching
  const navLinks = document.querySelectorAll('header nav a');
  navLinks.forEach(link => {
    link.style.pointerEvents = 'none';
    link.style.opacity = '0.5';
  });

  const base64Data = capturedImage.split(',')[1];
  const mediaType = capturedImage.split(';')[0].split(':')[1];

  try {
    const response = await fetch('http://localhost:5000/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Data, mediaType: mediaType })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed.');

    renderResults(data);
  } catch (err) {
    loadingState.style.display = 'none';
    analyzeBtn.disabled = false;
    analyzeBtn.style.display = 'block';
    
    // Re-enable navigation if an error occurs
    navLinks.forEach(link => {
      link.style.pointerEvents = 'auto';
      link.style.opacity = '1';
    });

    alert(err.message || 'Analysis failed. Please try again with a clearer face photo.');
    console.error(err);
  }
}

function downloadPDFReport() {
  const element = document.getElementById('results');
  const opt = {
    margin: 0.5,
    filename: 'DermAI_Skin_Report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().from(element).set(opt).save();
}

function renderResults(a) {
  loadingState.style.display = 'none';
  analyzeBtn.style.display = 'none';

  const severityColor = s => s === 'severe' ? 'severe' : s === 'moderate' ? 'moderate' : 'mild';

  const issueCards = (a.issues || []).map(issue => `
    <div class="issue-card ${severityColor(issue.severity)}">
      <h4>${issue.name}</h4>
      <div class="severity">${issue.severity}</div>
    </div>
  `).join('');

  const buildSteps = (steps, offset = 0) => (steps || []).map((s, i) => `
    <div class="step">
      <div class="step-num">${i + 1 + offset}</div>
      <div class="step-body">
        <h4>${s.step}</h4>
        <p>${s.instruction}</p>
        ${s.productHint ? `<div class="product-hint">Look for: ${s.productHint}</div>` : ''}
      </div>
    </div>
  `).join('');

  const tips = (a.lifestyleTips || []).map(t => `<li>${t}</li>`).join('');

  resultsDiv.innerHTML = `
    <div class="results-header">
      <h2>Your skin<br><span>analysis</span></h2>
      <div class="skin-score">
        <span class="num">${a.overallScore}</span>
        <div class="lbl">Skin score</div>
      </div>
    </div>

    <p style="font-size:0.85rem; color:var(--muted); margin-bottom:1rem;">
      Skin type: <strong style="color:var(--text)">${a.skinType}</strong>
    </p>

    ${a.scoreBreakdown ? `
    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:1.5rem;">
      ${Object.entries(a.scoreBreakdown).map(([key, val]) => `
        <div style="background:var(--warm); border-radius:10px; padding:0.75rem;">
          <div style="font-size:0.7rem; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px;">${key}</div>
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="flex:1; height:4px; background:var(--sage-light); border-radius:2px;">
              <div style="width:${val}%; height:100%; background:var(--sage); border-radius:2px;"></div>
            </div>
            <span style="font-size:0.8rem; font-weight:500; color:var(--text); min-width:28px;">${val}</span>
          </div>
        </div>
      `).join('')}
    </div>` : ''}

    <div class="section-title"><div class="dot"></div>Identified concerns</div>
    <div class="issues-grid">${issueCards}</div>

    <div class="section-title"><div class="dot"></div>Your routine</div>

    <div class="routine-section">
      <div class="time-label">☀ Morning</div>
      ${buildSteps(a.morningRoutine)}
    </div>

    <div class="routine-section">
      <div class="time-label">🌙 Evening</div>
      ${buildSteps(a.eveningRoutine)}
    </div>

    ${(a.weeklyTreatments || []).length ? `
    <div class="routine-section">
      <div class="time-label">📅 Weekly treatments</div>
      ${buildSteps(a.weeklyTreatments)}
    </div>` : ''}

    ${tips ? `
    <div class="section-title"><div class="dot"></div>Lifestyle tips</div>
    <div class="tips-section"><ul>${tips}</ul></div>
    ` : ''}

    <button onclick="downloadPDFReport()" class="new-scan-btn" style="background:var(--sage); color:white; margin-bottom: 10px;">
      ↓ &nbsp;Download PDF Report
    </button>
    <button class="new-scan-btn" onclick="location.reload()">
      ↺ &nbsp;Analyse another photo
    </button>
  `;

  resultsDiv.style.display = 'block';
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
}