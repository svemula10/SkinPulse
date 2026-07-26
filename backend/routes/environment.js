const express = require('express');
const router = express.Router();

router.post('/advice', async (req, res) => {
  const { skinType, issues, location } = req.body;

  try {
    const activeLocation = location || 'Lat: 48.85, Lon: 2.35';
    
    const weatherData = await fetchLiveWeather(activeLocation);

    const issueList = (issues || []).map(i => i.name.toLowerCase());
    const hasAcne = issueList.some(i => i.includes('acne') || i.includes('breakout') || i.includes('blemish'));
    const hasDryness = issueList.some(i => i.includes('dry') || i.includes('dehydrat') || i.includes('flake'));
    const hasPigmentation = issueList.some(i => i.includes('pigment') || i.includes('spot') || i.includes('dark'));

    let tacticalAdvice = "";
    let routineOverride = "";

    if (weatherData.humidity > 60 && hasAcne) {
      tacticalAdvice = `High ambient humidity (${weatherData.humidity}%) combined with your profile's breakout tendencies increases sebum oxidation and trapping.`;
      routineOverride = `<strong>Routine Override:</strong> Incorporate a lightweight salicylic acid (BHA) wash and a gel-based, non-comedogenic hydrator.`;
    } else if (weatherData.humidity < 40 && hasDryness) {
      tacticalAdvice = `Low humidity (${weatherData.humidity}%) accelerates transepidermal water loss, putting your skin barrier under stress at ${weatherData.temp}°F.`;
      routineOverride = `<strong>Routine Override:</strong> Layer hyaluronic acid on damp skin followed immediately by a ceramide-rich occlusive cream.`;
    } else {
      tacticalAdvice = `Current atmospheric conditions (${weatherData.temp}°F, ${weatherData.humidity}% humidity, UV Index ${weatherData.uvIndex}) require balancing hydration with your baseline defense.`;
      routineOverride = `<strong>Routine Override:</strong> Maintain your core regimen with a broad-spectrum SPF ${weatherData.uvIndex > 5 ? '50+' : '30'} finish.`;
    }

    const advice = `
      <div style="margin-bottom: 8px;"><strong>Microclimate Impact:</strong> ${tacticalAdvice}</div>
      <div style="background: var(--sage-light); padding: 10px 14px; border-radius: 6px; border-left: 3px solid var(--sage);">${routineOverride}</div>
    `;

    res.json({ 
      success: true, 
      advice, 
      weather: weatherData,
      location: activeLocation 
    });
  } catch (err) {
    console.error('Environmental advisor error:', err);
    res.status(500).json({ error: 'Failed to fetch real-time weather data.' });
  }
});

async function fetchLiveWeather(loc) {
  let lat = 48.85, lon = 2.35; // Default fallback coordinates

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
    console.warn('External weather API fallback triggered:', apiErr);
    return { uvIndex: 5, uvLevel: 'Moderate', humidity: 64, temp: 71 };
  }
}

module.exports = router;