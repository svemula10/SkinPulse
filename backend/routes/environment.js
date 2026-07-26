const express = require('express');
const router = express.Router();

router.post('/advice', async (req, res) => {
  const { skinType, issues, location, targetCity } = req.body;

  try {
    const activeLocation = targetCity ? targetCity : (location || 'Selected Coordinates');
    
    // Generate telemetry (if latitude/longitude or city is passed, calculate specific attributes)
    const weatherData = getTelemetryForLocation(activeLocation);

    // Dynamic, highly customized prompt mapping skin type & issues to local climate
    const issueNames = (issues || []).map(i => i.name).join(', ') || 'General sensitivity';
    
    // In your actual app, pass this prompt to your Anthropic/Groq client:
    const advice = `
      <strong>Climate Risk Analysis for ${activeLocation}</strong><br>
      • <strong>UV Exposure (${weatherData.uvIndex} - ${weatherData.uvLevel}):</strong> Given your tendency toward <em>${skinType}</em> skin and concerns with <strong>${issueNames}</strong>, high UV radiation accelerates collagen breakdown and hyperpigmentation flare-ups.<br>
      • <strong>Atmospheric Humidity (${weatherData.humidity}%):</strong> ${weatherData.humidity < 40 ? 'Low ambient moisture pulls water from the stratum corneum, risking severe barrier dehydration and flaking.' : 'Elevated moisture increases sebum oxidation, raising breakout probability for your profile.'}<br><br>
      <strong>Customized Daily Protection Protocol:</strong><br>
      1. <em>Morning Adjustment:</em> Apply a broad-spectrum mineral SPF ${weatherData.uvIndex > 6 ? '50+' : '30'} with iron oxides to shield against high-energy visible light.<br>
      2. <em>Barrier Shielding:</em> Integrate a targeted humectant-to-occlusive layering sequence to counteract the local ${weatherData.temp}°F climate stress.
    `;

    res.json({ 
      success: true, 
      advice, 
      weather: weatherData,
      location: activeLocation 
    });
  } catch (err) {
    console.error('Environmental advisor error:', err);
    res.status(500).json({ error: 'Failed to generate environmental advice.' });
  }
});

function getTelemetryForLocation(loc) {
  if (typeof loc === 'string' && loc.includes('Lat:')) {
    // Generate dynamic telemetry based on coordinate hash for interactive map clicks
    const hash = loc.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      uvIndex: (hash % 8) + 2, // Generates a realistic UV index between 2 and 9
      uvLevel: (hash % 8) + 2 > 6 ? 'High' : 'Moderate',
      humidity: (hash % 60) + 25, // Generates humidity between 25% and 85%
      temp: (hash % 40) + 50      // Generates temp between 50°F and 90°F
    };
  }
  if (loc.includes('Miami')) return { uvIndex: 9, uvLevel: 'Very High', humidity: 78, temp: 88 };
  if (loc.includes('Denver')) return { uvIndex: 8, uvLevel: 'Very High', humidity: 24, temp: 72 };
  if (loc.includes('London')) return { uvIndex: 3, uvLevel: 'Moderate', humidity: 82, temp: 58 };
  return { uvIndex: 6, uvLevel: 'High', humidity: 50, temp: 72 };
}

module.exports = router;