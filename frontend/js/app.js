let capturedImage = null;
let stream = null;

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const camBtn = document.getElementById('camBtn');
const cameraContainer = document.getElementById('camera-container');
const video = document.getElementById('video');
const captureBtn = document.getElementById('captureBtn');
const cancelCamBtn = document.getElementById('cancelCamBtn');
const canvas = document.getElementById('canvas');
const previewContainer = document.getElementById('preview-container');
const previewImg = document.getElementById('previewImg');
const resetBtn = document.getElementById('resetBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadingState = document.getElementById('loadingState');
const resultsDiv = document.getElementById('results');

// Drag and drop setup
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
    if (cameraContainer) cameraContainer.style.display = 'none';
    previewContainer.style.display = 'block';
    analyzeBtn.style.display = 'block';
    stopCamera();
  };
  reader.readAsDataURL(file);
}

const disclaimerText = document.getElementById('disclaimerText');

camBtn.addEventListener('click', async () => {
  try {
    uploadZone.style.display = 'none';
    camBtn.style.display = 'none';
    document.querySelector('.or-divider').style.display = 'none';
    
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
  } catch (err) {
    alert('Unable to access camera. Please upload a photo instead.');
    resetCameraView();
  }
});

if (cancelCamBtn) {
  cancelCamBtn.addEventListener('click', () => {
    stopCamera();
    resetCameraView();
  });
}

function resetCameraView() {
  if (cameraContainer) cameraContainer.style.display = 'none';
  uploadZone.style.display = 'block';
  camBtn.style.display = 'flex';
  if (disclaimerText) disclaimerText.style.display = 'block';
  document.querySelector('.or-divider').style.display = 'flex';
}

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
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
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
  if (cameraContainer) cameraContainer.style.display = 'none';
  stopCamera();
});

analyzeBtn.addEventListener('click', analyzeImage);

async function analyzeImage() {
  if (!capturedImage) return;

  const userNameInput = document.getElementById('userName');
  const userName = userNameInput ? userNameInput.value.trim() : '';

  if (!userName) {
    alert('Please enter a client or user name before analyzing the skin profile.');
    if (userNameInput) userNameInput.focus();
    return;
  }

  analyzeBtn.disabled = true;
  loadingState.style.display = 'block';
  resultsDiv.style.display = 'none';

  if (resetBtn) {
    resetBtn.disabled = true;
    resetBtn.style.opacity = '0.5';
    resetBtn.style.cursor = 'not-allowed';
  }
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
      body: JSON.stringify({ image: base64Data, mediaType: mediaType, name: userName })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed.');

    renderResults(data, userName);
  } catch (err) {
    loadingState.style.display = 'none';
    analyzeBtn.disabled = false;
    analyzeBtn.style.display = 'block';

    let errorMsg = err.message || 'Analysis failed. Please try again with a clearer face photo.';
    alert(errorMsg);
    console.error(err);
  } finally {
    if (resetBtn) {
      resetBtn.disabled = false;
      resetBtn.style.opacity = '1';
      resetBtn.style.cursor = 'pointer';
    }
    navLinks.forEach(link => {
      link.style.pointerEvents = 'auto';
      link.style.opacity = '1';
    });
  }
}

// Unified Live PDF Download trigger matching the exact format of dashboard reports
window.downloadPDFReport = function() {
  const element = document.getElementById('results');
  if (!element || !element.innerHTML.trim()) {
    alert('Report content not found.');
    return;
  }

  // Hide both the action bar container and the download button during capture
  const actionBar = element.querySelector('div[style*="display: flex; justify-content: space-between"]');
  if (actionBar) actionBar.style.display = 'none';

  const originalBackground = element.style.background;
  const originalPadding = element.style.padding;
  const originalColor = element.style.color;

  element.style.background = '#ffffff';
  element.style.padding = '20px';
  element.style.color = '#1a1a1a';

  const opt = {
    margin:      [0.4, 0.4, 0.4, 0.4],
    filename:    'SkinPulse_Professional_Dermatology_Report.pdf',
    image:       { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      letterRendering: true,
      scrollY: 0 
    },
    jsPDF:       { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().from(element).set(opt).save().then(() => {
    if (actionBar) actionBar.style.display = 'flex';
    element.style.background = originalBackground;
    element.style.padding = originalPadding;
    element.style.color = originalColor;
  }).catch(err => {
    console.error('PDF generation error:', err);
    if (actionBar) actionBar.style.display = 'flex';
    element.style.background = originalBackground;
    element.style.padding = originalPadding;
    element.style.color = originalColor;
    alert('Failed to generate PDF report.');
  });
};

function renderResults(a, userName = 'Anonymous') {
  loadingState.style.display = 'none';
  resultsDiv.style.display = 'block';
  resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const severityColor = s => s === 'severe' ? 'severe' : s === 'moderate' ? 'moderate' : 'mild';

  const issueCards = (a.issues || []).map(issue => `
    <div class="issue-card ${severityColor(issue.severity)}">
      <h4>${issue.name}</h4>
      <div class="severity">${issue.severity}</div>
      <p style="font-size: 0.8rem; color: var(--muted); margin-top: 4px;">${issue.description || ''}</p>
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

  const clientInfoBlock = `
    <div style="background: var(--warm); border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">Client Name</div>
        <div style="font-size: 1rem; font-weight: 500; color: var(--text);">${escapeHtml(userName)}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">Scan Date</div>
        <div style="font-size: 0.9rem; font-weight: 500; color: var(--text);">${new Date().toLocaleDateString()}</div>
      </div>
    </div>
  `;

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // 1. RENDER NORMAL WEB PAGE VIEW
  resultsDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <button onclick="downloadPDFReport()" class="new-scan-btn" style="background: var(--sage); color: white; width: auto; padding: 0.5rem 1rem; font-size: 0.85rem; margin: 0; cursor: pointer; border: none; border-radius: var(--radius);">
        ↓ &nbsp;Download PDF Report
      </button>
    </div>

    ${clientInfoBlock}

    <div class="results-header">
      <h2>Your skin<br><span>analysis</span></h2>
      <div class="skin-score">
        <span class="num">${a.overallScore}</span>
        <div class="lbl">Skin score</div>
      </div>
    </div>

    <p style="font-size:0.85rem; color:var(--muted); margin-bottom:1.5rem;">
      Skin type: <strong style="color:var(--text)">${a.skinType}</strong> | Image Quality: <strong style="color:var(--text)">${a.imageQuality}</strong>
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
  `;

  // 2. POPULATE THE HIDDEN PDF TEMPLATE USING EXACT DASHBOARD STRUCTURE
  const pdfInner = document.getElementById('pdfReportInnerContent');

  if (pdfInner) {
    pdfInner.innerHTML = `
      ${clientInfoBlock}

      <div class="results-header">
        <h2>Skin Health Evaluation<br><span>${new Date().toLocaleDateString()}</span></h2>
        <div class="skin-score">
          <span class="num">${a.overallScore}</span>
          <div class="lbl">Skin score</div>
        </div>
      </div>

      <p style="font-size:0.85rem; color:#666; margin-bottom:1rem;">
        Skin type: <strong style="color:#111">${a.skinType}</strong> | Image Quality: <strong style="color:#111">${a.imageQuality}</strong>
      </p>

      ${a.scoreBreakdown ? `
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:1.5rem;">
        ${Object.entries(a.scoreBreakdown).map(([key, val]) => `
          <div style="background:#f5f0e8; border-radius:10px; padding:0.75rem;">
            <div style="font-size:0.7rem; color:#666; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px;">${key}</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="flex:1; height:4px; background:#e8f2ec; border-radius:2px;">
                <div style="width:${val}%; height:100%; background:#4a7c5f; border-radius:2px;"></div>
              </div>
              <span style="font-size:0.8rem; font-weight:500; color:#111; min-width:28px;">${val}</span>
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
    `;
  }
}