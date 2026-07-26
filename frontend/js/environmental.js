let allScans = [];
let map;
let selectedMarker = null;
let clickedCoordinates = null;

document.addEventListener('DOMContentLoaded', async () => {
  await loadProfilesIntoDropdown();
  initInteractiveMap();

  const fetchEnvBtn = document.getElementById('fetchEnvBtn');
  if (fetchEnvBtn) {
    fetchEnvBtn.addEventListener('click', handleEnvironmentalAnalysis);
  }

  const useGpsBtn = document.getElementById('useGpsBtn');
  if (useGpsBtn) {
    useGpsBtn.addEventListener('click', locateUserOnMap);
  }
});

function initInteractiveMap() {
  map = L.map('climateMap').setView([39.8283, -98.5795], 3);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    setMapLocation(lat, lng);
  });
}

function setMapLocation(lat, lng) {
  clickedCoordinates = `Lat: ${lat.toFixed(2)}, Lon: ${lng.toFixed(2)}`;

  if (selectedMarker) {
    selectedMarker.setLatLng([lat, lng]);
  } else {
    selectedMarker = L.marker([lat, lng]).addTo(map);
  }

  map.setView([lat, lng], 10);
  document.getElementById('selectedLocationLabel').innerHTML = `Active Coordinates: <strong>${clickedCoordinates}</strong>`;
}

function locateUserOnMap() {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser.');
    return;
  }

  document.getElementById('selectedLocationLabel').innerHTML = `Active Coordinates: <em>Locating GPS position...</em>`;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setMapLocation(lat, lng);
    },
    (err) => {
      console.error(err);
      alert('Unable to retrieve your location. Please check browser permissions.');
      document.getElementById('selectedLocationLabel').innerHTML = `Active Coordinates: None selected`;
    }
  );
}

async function loadProfilesIntoDropdown() {
  const select = document.getElementById('envScanSelect');
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
    console.error('Failed to load profiles for environmental advisor:', err);
  }
}

async function handleEnvironmentalAnalysis() {
  const select = document.getElementById('envScanSelect');
  const resultsDiv = document.getElementById('envResultsContent');
  const selectedIndex = select.value;

  if (selectedIndex === "") {
    alert('Please select a saved skin profile first.');
    return;
  }

  const scan = allScans[selectedIndex];
  resultsDiv.style.display = 'block';
  resultsDiv.innerHTML = `<p style="color: var(--muted); text-align: center; padding: 1rem;">Querying geospatial microclimate models and synthesizing customized skincare protocols...</p>`;

  const payloadLocation = clickedCoordinates ? clickedCoordinates : 'Default Geolocation';

  try {
    const res = await fetch('http://localhost:5000/api/environment/advice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skinType: scan.skin_type,
        issues: scan.analysis_data.issues || [],
        location: payloadLocation
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch advice.');

    const weather = data.weather || { uvIndex: 5, uvLevel: 'Moderate', humidity: 50, temp: 72 };

    resultsDiv.innerHTML = `
      <div style="background: var(--warm); border-radius: 12px; padding: 1.5rem; margin-top: 1rem;">
        <h3 style="margin-bottom: 0.2rem; color: var(--text); font-family: 'DM Serif Display', serif;">Microclimate Skin Adaptation Plan</h3>
        <p style="font-size: 0.85rem; color: var(--muted); margin-bottom: 1.25rem;">Target Profile: <strong>${escapeHtml(scan.name)}</strong> (${escapeHtml(scan.skin_type)}) | Region: <em>${escapeHtml(data.location)}</em></p>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 1.5rem;">
          <div style="background: var(--card); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border); text-align: center;">
            <div style="font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">UV Index</div>
            <div style="font-size: 1.2rem; font-weight: 600; color: var(--sage);">${weather.uvIndex} <span style="font-size:0.75rem; font-weight:normal;">(${weather.uvLevel})</span></div>
          </div>
          <div style="background: var(--card); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border); text-align: center;">
            <div style="font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Humidity</div>
            <div style="font-size: 1.2rem; font-weight: 600; color: var(--text);">${weather.humidity}%</div>
          </div>
          <div style="background: var(--card); padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border); text-align: center;">
            <div style="font-size: 0.65rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">Temperature</div>
            <div style="font-size: 1.2rem; font-weight: 600; color: var(--text);">${weather.temp}°F</div>
          </div>
        </div>

        <div style="background: var(--card); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border); font-size: 0.9rem; line-height: 1.6; color: var(--text); margin-bottom: 1rem;">
          ${data.advice}
        </div>
      </div>
    `;
  } catch (err) {
    console.error(err);
    resultsDiv.innerHTML = `<p style="color: #c46b6b; text-align: center;">Failed to generate environmental recommendations.</p>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}