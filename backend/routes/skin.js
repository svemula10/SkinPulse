const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

router.post('/analyze', async (req, res) => {
  try {
    const { image, mediaType } = req.body;
    if (!image || !mediaType) {
      return res.status(400).json({ error: 'Image data and media type are required.' });
    }

    // 1. STAGE 1: Image Validation with Prompt Caching
    const valMessage = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: [
        {
          type: 'text',
          text: "You are a specialized dermatological image validator. Your task is to inspect incoming images to determine if they contain a real human face suitable for professional skin health evaluation.",
          cache_control: { type: 'ephemeral' } // Caches the system instruction block
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

    // 2. STAGE 2: Comprehensive Skin Analysis & Routine Generation with Prompt Caching
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
          cache_control: { type: 'ephemeral' } // Caches the heavy system instructions prefix
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

    res.json(analysisData);

  } catch (err) {
    console.error('Claude API Error with Caching:', err);
    res.status(500).json({ error: 'Failed to process skin analysis.' });
  }
});

module.exports = router;