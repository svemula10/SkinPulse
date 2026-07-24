document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('http://localhost:5000/api/scans');
    const scans = await res.json();

    const listContainer = document.getElementById('scansList');
    if (!scans.length) {
      listContainer.innerHTML = `<p style="color: var(--muted); text-align: center; padding: 2rem;">No past scans found yet. Try completing an analysis!</p>`;
      return;
    }

    // Render list items
    listContainer.innerHTML = scans.map(scan => `
      <div style="background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1rem 1.25rem; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 0.75rem; color: var(--muted); margin-bottom: 2px;">${new Date(scan.timestamp).toLocaleString()}</div>
          <div style="font-weight: 500; font-size: 0.95rem;">Skin Type: ${scan.skin_type}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div style="text-align: right;">
            <span style="font-family: 'DM Serif Display', serif; font-size: 1.4rem; color: var(--sage);">${scan.overall_score}</span>
            <div style="font-size: 0.65rem; color: var(--muted); text-transform: uppercase;">Score</div>
          </div>
        </div>
      </div>
    `).join('');

    // Render Chart.js graph
    const sortedScans = [...scans].reverse();
    const labels = sortedScans.map(s => new Date(s.timestamp).toLocaleDateString());
    const scores = sortedScans.map(s => s.overall_score);

    const ctx = document.getElementById('progressChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Overall Skin Score',
          data: scores,
          borderColor: '#4a7c5f',
          backgroundColor: 'rgba(74, 124, 95, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          y: { min: 0, max: 100 }
        }
      }
    });

  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    document.getElementById('scansList').innerHTML = `<p style="color: #c46b6b; text-align: center;">Failed to connect to backend server.</p>`;
  }
});