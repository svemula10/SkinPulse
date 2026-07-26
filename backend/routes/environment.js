const express = require('express');
const router = express.Router();

router.post('/advice', async (req, res) => {
  const { skinType, issues, location } = req.body;

  try {
    const activeLocation = location || 'Selected Coordinates';
    const weatherData = await fetchLiveWeather(activeLocation);

    const issueList = (issues || []).map(i => i.name.toLowerCase());
    const hasAcne = issueList.some(i => i.includes('acne') || i.includes('breakout') || i.includes('blemish'));
    const hasDryness = issueList.some(i => i.includes('dry') || i.includes('dehydrat') || i.includes('flake'));
    const hasPigmentation = issueList.some(i => i.includes('pigment') || i.includes('spot') || i.includes('dark') || i.includes('melasma'));

    // 1. General Climate Impact Content
    let generalEducation = `At <strong>${weatherData.temp}°F</strong> with a relative humidity of <strong>${weatherData.humidity}%</strong> and a UV index of <strong>${weatherData.uvIndex} (${weatherData.uvLevel})</strong>, your skin faces distinct atmospheric stressors. `;
    if (weatherData.humidity > 60) {
      generalEducation += `High humidity levels promote excessive sebum secretion and sweat buildup, which can mix with dead skin cells and clog pores. `;
    } else if (weatherData.humidity < 40) {
      generalEducation += `Low relative humidity accelerates Transepidermal Water Loss (TEWL), weakening the lipid matrix of the skin barrier and causing micro-cracks. `;
    } else {
      generalEducation += `Moderate humidity provides a stable baseline, though environmental free radicals still pose mild oxidative stress. `;
    }
    if (weatherData.uvIndex >= 6) {
      generalEducation += `Simultaneously, high UV radiation forces melanocytes to over-produce melanin as a defense mechanism, elevating the risk of sun damage and premature photoaging.`;
    }

    // 2. Profile-Specific Vulnerabilities Content
    let profileVulnerability = `As a user with <strong>${skinType}</strong> skin type and logged concerns (${issueList.join(', ') || 'general baseline'}), your specific barrier is uniquely exposed here. `;
    if (hasAcne && weatherData.humidity > 60) {
      profileVulnerability += `Because your profile exhibits breakout tendencies, trapped perspiration and oil in this humid microclimate drastically raise inflammatory lesion risks.`;
    } else if (hasDryness && weatherData.humidity < 40) {
      profileVulnerability += `Given your tendency toward dryness and dehydration, dry air will strip your skin's remaining surface moisture, leading to tightness, flaking, and irritation.`;
    } else if (hasPigmentation && weatherData.uvIndex >= 6) {
      profileVulnerability += `With existing pigmentation concerns, the current UV intensity will directly reactivate dormant melanin clusters, darkening post-inflammatory marks.`;
    } else {
      profileVulnerability += `Your baseline profile requires maintaining lipid balance to prevent environmental sensitivity flare-ups.`;
    }

    // 3. Actionable Routine Overrides Content
    let routineOverrides = "";
    if (weatherData.uvIndex >= 6) {
      routineOverrides += `<li><strong>UV Defense Protocol:</strong> Switch to a broad-spectrum mineral SPF 50+ containing zinc oxide and iron oxides to block visible and ultraviolet light. Reapply every 2 hours outdoors.</li>`;
    } else {
      routineOverrides += `<li><strong>Daily Shield:</strong> Maintain a broad-spectrum SPF 30+ finish to guard against incidental UV exposure.</li>`;
    }

    if (weatherData.humidity > 60 && hasAcne) {
      routineOverrides += `<li><strong>Cleansing Adjustment:</strong> Swap creamy cleansers for a gentle 2% salicylic acid (BHA) wash to clear pore linings without disrupting moisture balance.</li>`;
      routineOverrides += `<li><strong>Hydration Swap:</strong> Replace thick occlusive creams with an oil-free hyaluronic acid gel hydrator.</li>`;
    } else if (weatherData.humidity < 40 || hasDryness) {
      routineOverrides += `<li><strong>Barrier Layering:</strong> Apply a pure humectant serum onto damp skin, immediately followed by a ceramide-rich barrier repair cream to seal micro-fissures.</li>`;
    } else {
      routineOverrides += `<li><strong>Antioxidant Boost:</strong> Layer a Vitamin C serum in your morning regimen to neutralize atmospheric free radicals.</li>`;
    }

    res.json({ 
      success: true, 
      generalEducation,
      profileVulnerability,
      routineOverrides,
      weather: weatherData,
      location: activeLocation 
    });
  } catch (err) {
    console.error('Environmental advisor error:', err);
    res.status(500).json({ error: 'Failed to fetch real-time weather data.' });
  }
});

async function fetchLiveWeather(loc) {
  let lat = 48.85, lon = 2.35;
  if (typeof loc === 'string' && loc.includes('Lat:')) {
    const match = loc.match(/Lat:\s*([-\d.]+),\s*Lon:\s*([-\d.]+)/);
    if (match) {
      lat = parseFloat(match[1]);
      lon = parseFloat(match[2]);
    }
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m&hourly=uv_index&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();

    const tempCelsius = data.current?.temperature_2m ?? 21.5;
    const tempFahrenheit = Math.round((tempCelsius * 9/5) + 32); 
    const humidity = data.current?.relative_humidity_2m ?? 64;
    const currentHourIndex = new Date().getHours();
    const uvIndex = Math.round(data.hourly?.uv_index?.[currentHourIndex] ?? 5);

    return {
      uvIndex: uvIndex,
      uvLevel: uvIndex >= 8 ? 'Very High' : uvIndex >= 6 ? 'High' : 'Moderate',
      humidity: humidity,
      temp: tempFahrenheit
    };
  } catch (apiErr) {
    return { uvIndex: 5, uvLevel: 'Moderate', humidity: 64, temp: 71 };
  }
}

module.exports = router;