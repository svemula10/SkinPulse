const express = require('express');
const router = express.Router();
const { Groq } = require('groq-sdk');
const db = require('../database'); // Imports your SQLite database module

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 1. ANALYZE ROUTE (With Groq & Qwen Vision)
router.post('/analyze', async (req, res) => {
  try {
    const { image, mediaType, name } = req.body;
    if (!image || !mediaType) {
      return res.status(400).json({ error: 'Image data and media type are required.' });
    }

    const userName = name && name.trim() !== '' ? name.trim() : 'Anonymous';

    // STAGE 1: Image Validation
    const valMessage = await groq.chat.completions.create({
      model: 'qwen/qwen3.6-27b',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mediaType};base64,${image}`
              }
            },
            {
              type: 'text',
              text: "Analyze this image. Does it contain a human face? Answer with YES or NO."
            }
          ]
        }
      ],
      max_tokens: 50,
      temperature: 0.1
    });

    const valText = valMessage.choices?.[0]?.message?.content || '';
    
    if (!valText.toUpperCase().includes('YES')) {
      return res.status(400).json({ error: 'Please upload a real photo of a face.' });
    }

    // STAGE 2: Comprehensive Skin Analysis & Routine Generation
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

    const analysisMessage = await groq.chat.completions.create({
      model: 'qwen/qwen3.6-27b',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mediaType};base64,${image}`
              }
            },
            {
              type: 'text',
              text: analysisPrompt
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2048,
      temperature: 0.4
    });

    const rawContent = analysisMessage.choices?.[0]?.message?.content || '{}';
    const cleanedJSON = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysisData = JSON.parse(cleanedJSON);

    // Save scan to SQLite database automatically
    db.run(
      `INSERT INTO scans (name, skin_type, overall_score, analysis_data) VALUES (?, ?, ?, ?)`,
      [userName, analysisData.skinType, analysisData.overallScore, JSON.stringify(analysisData)],
      function(dbErr) {
        if (dbErr) console.error('Database save error:', dbErr);
      }
    );

    res.json(analysisData);

  } catch (err) {
    console.error('Groq Vision API Error:', err);
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