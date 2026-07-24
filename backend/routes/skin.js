const express = require('express');
const router = express.Router();
const { Groq } = require('groq-sdk');
const db = require('../database');

// POST /api/analyze
router.post('/analyze', async (req, res) => {
  const { image, mediaType } = req.body;
  if (!image || !mediaType) {
    return res.status(400).json({ error: 'Missing image or media type.' });
  }

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server API key not configured in .env file.' });
  }

  const groq = new Groq({ apiKey });

  try {
    const imageUrl = `data:${mediaType};base64,${image}`;

    // Step 1: Two-stage validation check via Groq using qwen/qwen3.6-27b
    const valCompletion = await groq.chat.completions.create({
      model: 'qwen/qwen3.6-27b',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Does this image show a real photograph of a real human face (not a cartoon, silhouette, illustration, drawing, or icon)? Reply only with YES or NO.' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      temperature: 0.1,
      max_completion_tokens: 50,
    });

    const answer = valCompletion.choices?.[0]?.message?.content?.trim().toUpperCase() || '';
    
    if (!answer.startsWith('YES')) {
      return res.status(422).json({ error: 'Please upload a real photo of a face. Illustrations and icons are not accepted.' });
    }

    // Step 2: Full skin diagnostic prompt enforcing rigid JSON output
    const prompt = `You are a professional dermatologist AI assistant. Carefully analyze this face photo and provide a detailed skin assessment.
IMPORTANT: Respond ONLY with a valid JSON object, no markdown, no backticks, no extra text.
Return exactly this structure:
{
  "overallScore": <number 1-100>,
  "skinType": "<Normal|Dry|Oily|Combination|Sensitive>",
  "imageQuality": "<good|fair|poor>",
  "scoreBreakdown": { "clarity": <1-100>, "evenness": <1-100>, "hydration": <1-100>, "texture": <1-100> },
  "issues": [{"name": "<issue name>", "severity": "<mild|moderate|severe>", "description": "<1 sentence>"}],
  "morningRoutine": [{"step": "<step name>", "instruction": "<what to do>", "productHint": "<ingredient or product type>"}],
  "eveningRoutine": [{"step": "<step name>", "instruction": "<what to do>", "productHint": "<ingredient or product type>"}],
  "weeklyTreatments": [{"step": "<treatment>", "instruction": "<what to do>", "productHint": "<ingredient or product type>"}],
  "lifestyleTips": ["<tip 1>", "<tip 2>", "<tip 3>", "<tip 4>"]
}`;

    const analysisCompletion = await groq.chat.completions.create({
      model: 'qwen/qwen3.6-27b',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }
      ],
      temperature: 0.6,
      max_completion_tokens: 2048,
      top_p: 0.95
    });

    const rawText = analysisCompletion.choices?.[0]?.message?.content || '';
    const cleanText = rawText.replace(/```json|```/g, '').trim();
    const match = cleanText.match(/\{[\s\S]*\}/);
    const analysisJson = match ? JSON.parse(match[0]) : null;

    if (!analysisJson) throw new Error('Failed to parse JSON structure from Groq response.');

    // Save session metrics into SQLite database
    db.run(
      `INSERT INTO scans (overall_score, skin_type, image_quality, analysis_data) VALUES (?, ?, ?, ?)`,
      [analysisJson.overallScore, analysisJson.skinType, analysisJson.imageQuality, JSON.stringify(analysisJson)],
      function(err) {
        if (err) console.error('Failed to save scan:', err.message);
      }
    );

    res.json(analysisJson);
  } catch (err) {
    console.error('Analysis error:', err);
    res.status(500).json({ error: 'Internal server error during skin analysis.' });
  }
});

// GET /api/scans - Fetch historical scans for the dashboard analytics
router.get('/scans', (req, res) => {
  db.all(`SELECT * FROM scans ORDER BY timestamp DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const parsedRows = rows.map(row => ({
      ...row,
      analysis_data: JSON.parse(row.analysis_data)
    }));
    res.json(parsedRows);
  });
});

module.exports = router;