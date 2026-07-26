const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const db = require('../database'); // Imports your SQLite database module

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// 1. ANALYZE ROUTE (With Claude API Prompt Caching)
router.post('/analyze', async (req, res) => {
  try {
    const { image, mediaType } = req.body;
    if (!image || !mediaType) {
      return res.status(400).json({ error: 'Image data and media type are required.' });
    }

    // STAGE 1: Image Validation with Prompt Caching
    const valMessage = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: [
        {
          type: 'text',
          text: "You are a specialized dermatological image validator. Your task is to inspect incoming images to determine if they contain a real human face suitable for professional skin health evaluation.",
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: image,
              },
            },
            {
              type: 'text',
              text: "Does this image contain a real human face or a portrait photo suitable for a skin analysis? Answer ONLY with 'YES' or 'NO', followed by a very brief explanation.",
            }
          ],
        }
      ],
    });

    const valText = valMessage.content?.[0]?.text || '';
    if (!valText.toUpperCase().includes('YES')) {
      return res.status(400).json({ error: 'Please upload a real photo of a face.' });
    }

    // STAGE 2: Comprehensive Skin Analysis & Routine Generation with Prompt Caching
    const analysisPrompt = `You are an expert dermatologist and skincare consultant. Analyze this face photo and return a JSON object (and ONLY valid JSON, no markdown code blocks, no preamble) matching this exact schema:
{
  "overallScore": 85,
  "skinType": "Combination",
  "imageQuality": "Good",
  "scoreBreakdown": {
    "clarity": 80,
    "evenness": 85,
    "hydration": 90,
    "texture": 85
  },
  "issues": [
    {
      "name": "Mild Dryness",
      "severity": "mild",
      "description": "Slight flaking observed around the cheek area."
    }
  ],
  "morningRoutine": [
    {
      "step": "Gentle Cleanser",
      "instruction": "Wash face with lukewarm water and a hydrating cleanser.",
      "productHint": "Ceramide-based cleanser"
    }
  ],
  "eveningRoutine": [
    {
      "step": "Double Cleanse",
      "instruction": "Remove impurities with a gentle cleanser.",
      "productHint": "Non-comedogenic wash"
    }
  ],
  "weeklyTreatments": [
    {
      "step": "Hydrating Mask",
      "instruction": "Apply a soothing sheet mask once a week.",
      "productHint": "Aloe or Hyaluronic Acid mask"
    }
  ],
  "lifestyleTips": [
    "Drink at least 8 glasses of water daily.",
    "Ensure 7-8 hours of quality sleep."
  ]
}`;

    const analysisMessage = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: "You are an advanced clinical AI dermatology engine. Your job is to strictly evaluate skin conditions, score clarity, evenness, hydration, texture, and return rigorous JSON diagnostics.",
          cache_control: { type: 'ephemeral' }
        }
      ],
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: image,
              },
            },
            {
              type: 'text',
              text: analysisPrompt,
            }
          ],
        }
      ],
    });

    const rawContent = analysisMessage.content?.[0]?.text || '';
    const cleanedJSON = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysisData = JSON.parse(cleanedJSON);

    // Save scan to SQLite database automatically upon successful analysis
    db.run(
      `INSERT INTO scans (skin_type, overall_score, analysis_data) VALUES (?, ?, ?)`,
      [analysisData.skinType, analysisData.overallScore, JSON.stringify(analysisData)],
      function(dbErr) {
        if (dbErr) console.error('Database save error:', dbErr);
      }
    );

    res.json(analysisData);

  } catch (err) {
    console.error('Claude API Error with Caching:', err);
    res.status(500).json({ error: 'Failed to process skin analysis.' });
  }
});

// 2. GET ALL SAVED SCANS ROUTE
router.get('/scans', (req, res) => {
  db.all(`SELECT * FROM scans ORDER BY timestamp DESC`, [], (err, rows) => {
    if (err) {
      console.error('Database fetch error:', err);
      return res.status(500).json({ error: 'Failed to retrieve scan history.' });
    }
    // Parse the JSON stored in SQLite back into an object for the frontend
    const formattedRows = rows.map(row => ({
      ...row,
      analysis_data: JSON.parse(row.analysis_data)
    }));
    res.json(formattedRows);
  });
});

// 3. DELETE A SPECIFIC SCAN ROUTE
router.delete('/scans/:id', (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM scans WHERE id = ?`, [id], function(err) {
    if (err) {
      console.error('Database delete error:', err);
      return res.status(500).json({ error: 'Failed to delete scan.' });
    }
    res.json({ success: true, deletedId: id });
  });
});

// 4. CLEAR ALL SCAN HISTORY ROUTE
router.delete('/scans', (req, res) => {
  db.run(`DELETE FROM scans`, [], function(err) {
    if (err) {
      console.error('Database clear error:', err);
      return res.status(500).json({ error: 'Failed to clear history.' });
    }
    res.json({ success: true });
  });
});

module.exports = router;