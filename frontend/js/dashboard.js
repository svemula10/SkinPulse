let allScans = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('http://localhost:5000/api/scans');
    allScans = await res.json();

    const listContainer = document.getElementById('scansList');
    if (!allScans.length) {
      listContainer.innerHTML = `<p style="color: var(--muted); text-align: center; padding: 2rem;">No past scans found yet. Try completing an analysis!</p>`;
      return;
    }

    // Render clickable session cards (like chat threads)
    listContainer.innerHTML = allScans.map((scan, index) => `
      <div onclick="viewScanReport(${index})" style="background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.2rem; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--sage)'" onmouseout="this.style.borderColor='var(--border)'">
        <div>
          <div style="font-size: 0.75rem; color: var(--muted); margin-bottom: 4px;">Scan Date: ${new Date(scan.timestamp).toLocaleString()}</div>
          <div style="font-weight: 500; font-size: 1rem; color: var(--text);">Skin Type: ${scan.skin_type}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 1.5rem;">
          <div style="text-align: right;">
            <span style="font-family: 'DM Serif Display', serif; font-size: 1.5rem; color: var(--sage);">${scan.overall_score}</span>
            <div style="font-size: 0.65rem; color: var(--muted); text-transform: uppercase;">Score</div>
          </div>
          <span style="font-size: 0.85rem; color: var(--sage); font-weight: 500;">View Report →</span>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    document.getElementById('scansList').innerHTML = `<p style="color: #c46b6b; text-align: center;">Failed to connect to backend server.</p>`;
  }
});

function viewScanReport(index) {
  const scan = allScans[index];
  const a = scan.analysis_data;

  document.getElementById('scansList').style.display = 'none';
  const reportContainer = document.getElementById('reportContainer');
  const reportContent = document.getElementById('reportContent');

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

  reportContent.innerHTML = `
    <div class="results-header">
      <h2>Archived Report<br><span>${new Date(scan.timestamp).toLocaleDateString()}</span></h2>
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
  `;

  reportContainer.style.display = 'block';
  reportContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeReport() {
  document.getElementById('reportContainer').style.display = 'none';
  document.getElementById('scansList').style.display = 'flex';
}