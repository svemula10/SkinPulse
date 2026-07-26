let allScans = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadProfilesIntoDropdown();

  const checkBtn = document.getElementById('checkSafetyBtn');
  if (checkBtn) {
    checkBtn.addEventListener('click', handleSafetyCheck);
  }
});

async function loadProfilesIntoDropdown() {
  const select = document.getElementById('safetyScanSelect');
  if (!select) return;

  try {
    const res = await fetch('http://localhost:5000/api/scans');
    const data = await res.json();
    allScans = Array.isArray(data) ? data : [];
    
    select.innerHTML = '<option value="">-- Load a past scan profile --</option>';
    allScans.forEach((scan, index) => {
      const name = scan.name || 'Anonymous';
      const date = new Date(scan.timestamp.endsWith('Z') ? scan.timestamp : scan.timestamp + 'Z').toLocaleDateString();
      select.innerHTML += `<option value="${index}">${escapeHtml(name)} (${escapeHtml(scan.skin_type)} - ${date})</option>`;
    });
  } catch (err) {
    console.error('Failed to load profiles for safety check:', err);
  }
}

async function handleSafetyCheck() {
  const select = document.getElementById('safetyScanSelect');
  const resultsDiv = [c = document.getElementById('safetyResultsContent')][0];
  const selectedIndex = select.value;

  if (selectedIndex === "") {
    alert('Please select a saved skin profile first.');
    select.focus();
    return;
  }

  const checkedBoxes = document.querySelectorAll('input[name="activeIng"]:checked');
  const ingredients = Array.from(checkedBoxes).map(cb => cb.value);

  if (ingredients.length === 0) {
    alert('Please select at least one active ingredient to check.');
    return;
  }

  const scan = allScans[selectedIndex];
  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = `<p style="color: var(--muted); text-align: center; padding: 1rem;">Cross-referencing chemical matrix and historical scan issues...</p>`;

  try {
    const res = await fetch('http://localhost:5000/api/safety/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients,
        skinType: scan.skin_type,
        issues: scan.analysis_data?.issues || [] // Passes historical scan issues directly
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to check compatibility.');

    let conflictsHtml = '';
    if (data.conflicts.length > 0) {
      conflictsHtml = data.conflicts.map(c => `
        <div style="background: #fdf2f2; border: 1px solid #f5c6c6; border-left: 4px solid #d9534f; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
          <div style="font-weight: 600; color: #a94442; text-transform: capitalize; margin-bottom: 4px;">⚠️ Clash Detected: ${c.pair[0]} + ${c.pair[1]}</div>
          <div style="font-size: 0.85rem; color: var(--text);">${c.reason}</div>
        </div>
      `).join('');
    } else {
      conflictsHtml = `
        <div style="background: #f2f9f4; border: 1px solid #c3e6cb; border-left: 4px solid var(--sage); padding: 12px; border-radius: 6px; margin-bottom: 10px;">
          <div style="font-weight: 600; color: #28a745; margin-bottom: 4px;">✅ Clean Routine Verified</div>
          <div style="font-size: 0.85rem; color: var(--text);">No dangerous chemical clashes detected among your selected active ingredients.</div>
        </div>
      `;
    }

    resultsDiv.innerHTML = `
      <div style="background: var(--warm); border-radius: 12px; padding: 1.5rem; margin-top: 1rem;">
        <h3 style="margin-bottom: 0.2rem; color: var(--text); font-family: 'DM Serif Display', serif;">Routine Safety Report</h3>
        <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1.25rem;">Evaluated for <strong>${escapeHtml(scan.name)}</strong> (${escapeHtml(scan.skin_type)})</p>
        
        <div style="margin-bottom: 1rem;">
          ${conflictsHtml}
        </div>

        <div style="background: var(--card); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.9rem; line-height: 1.6; color: var(--text);">
          <strong>Clinical Safety Recommendation:</strong><br>${data.recommendation}
        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = `<p style="color: #c46b6b; text-align: center;">Failed to execute routine safety check.</p>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}