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
    if (disclaimerText) disclaimerText.style.display = 'none'; // Hide disclaimer when camera opens
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
    console.error(err);
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
  if (disclaimerText) disclaimerText.style.display = 'block'; // Restore disclaimer when camera closes
  document.querySelector('.or-divider').style.display = 'flex';
}

function resetCameraView() {
  if (cameraContainer) cameraContainer.style.display = 'none';
  uploadZone.style.display = 'block';
  camBtn.style.display = 'flex';
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
  analyzeBtn.disabled = true;
  loadingState.style.display = 'block';
  resultsDiv.style.display = 'none';

  // Lock out reset button & header navigation tabs during loading
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
      body: JSON.stringify({ image: base64Data, mediaType: mediaType })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed.');

    renderResults(data);
  } catch (err) {
    loadingState.style.display = 'none';
    analyzeBtn.disabled = false;
    analyzeBtn.style.display = 'block';

    // Parse rate limit error message with countdown if available
    let errorMsg = err.message || 'Analysis failed. Please try again with a clearer face photo.';
    alert(errorMsg);
    console.error(err);
  } finally {
    // Unlock reset button and header navigation links once analysis completes or fails
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

// Global PDF Download trigger using the hidden report template
window.downloadPDFReport = function() {
  const element = document.getElementById('pdfReportTemplate');
  if (!element) {
    alert('Report template not found.');
    return;
  }

  element.style.display = 'block';

  const opt = {
    margin:       [0.5, 0.5, 0.5, 0.5],
    filename:     'SkinPulse_Clinical_Report.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { 
      scale: 2, 
      useCORS: true, 
      letterRendering: true,
      scrollY: 0,
      windowWidth: 800
    },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().from(element).set(opt).save().then(() => {
    element.style.display = 'none';
  }).catch(err => {
    console.error('PDF generation error:', err);
    element.style.display = 'none';
    alert('Failed to generate PDF report.');
  });
};

function renderResults(a) {
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

  // 1. RENDER NORMAL WEB PAGE VIEW (With "Your skin" stacked above "analysis")
  resultsDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <button onclick="downloadPDFReport()" class="new-scan-btn" style="background: var(--sage); color: white; width: auto; padding: 0.5rem 1rem; font-size: 0.85rem; margin: 0; cursor: pointer; border: none; border-radius: var(--radius);">
        ↓ &nbsp;Download PDF Report
      </button>
    </div>

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

  // 2. POPULATE THE HIDDEN CLINICAL REPORT TEMPLATE FOR PDF EXPORTS
  const pdfInner = document.getElementById('pdfReportInnerContent');
  const pdfDate = document.getElementById('pdfDate');
  if (pdfDate) pdfDate.textContent = `Generated: ${new Date().toLocaleDateString()}`;

  if (pdfInner) {
    pdfInner.innerHTML = `
      <div class="results-header" style="margin-bottom: 2rem; page-break-inside: avoid;">
        <div>
          <h2 style="font-family: 'DM Serif Display', serif; font-size: 1.4rem; margin: 0;">Skin Health Evaluation</h2>
          <p style="font-size:0.85rem; color:#555; margin: 4px 0 0 0;">
            Skin Type: <strong style="color:#111">${a.skinType}</strong> | Quality: <strong style="color:#111">${a.imageQuality}</strong>
          </p>
        </div>
        <div class="skin-score">
          <span class="num">${a.overallScore}</span>
          <div class="lbl">Skin score</div>
        </div>
      </div>

      ${a.scoreBreakdown ? `
      <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin-bottom:2rem; page-break-inside: avoid;">
        ${Object.entries(a.scoreBreakdown).map(([key, val]) => `
          <div style="background:#f5f0e8; border-radius:10px; padding:0.75rem;">
            <div style="font-size:0.7rem; color:#666; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px;">${key}: ${val}/100</div>
            <div style="width:100%; height:6px; background:#e8f2ec; border-radius:3px;">
              <div style="width:${val}%; height:100%; background:#4a7c5f; border-radius:3px;"></div>
            </div>
          </div>
        `).join('')}
      </div>` : ''}

      <div style="page-break-inside: avoid;">
        <h3 style="font-family: 'DM Serif Display', serif; font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 1.5rem;">Identified Concerns</h3>
        <div class="issues-grid" style="margin-bottom: 1.5rem;">${issueCards}</div>
      </div>

      <div style="page-break-inside: avoid;">
        <h3 style="font-family: 'DM Serif Display', serif; font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Morning Routine</h3>
        <div style="margin-bottom: 1.5rem;">${buildSteps(a.morningRoutine)}</div>
      </div>

      <div style="page-break-inside: avoid;">
        <h3 style="font-family: 'DM Serif Display', serif; font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Evening Routine</h3>
        <div style="margin-bottom: 1.5rem;">${buildSteps(a.eveningRoutine)}</div>
      </div>

      ${(a.weeklyTreatments || []).length ? `
        <div style="page-break-inside: avoid;">
          <h3 style="font-family: 'DM Serif Display', serif; font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Weekly Treatments</h3>
          <div style="margin-bottom: 1.5rem;">${buildSteps(a.weeklyTreatments)}</div>
        </div>
      ` : ''}

      ${tips ? `
        <div style="page-break-inside: avoid;">
          <h3 style="font-family: 'DM Serif Display', serif; font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 4px;">Lifestyle Tips</h3>
          <ul style="padding-left: 20px; font-size: 0.85rem; color: #333;">${tips}</ul>
        </div>
      ` : ''}
    `;
  }
}