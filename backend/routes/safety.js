const express = require('express');
const router = express.Router();

// Expanded Relational Chemical Conflict Matrix
const conflictMatrix = {
  "retinol": ["salicylic acid", "glycolic acid", "lactic acid", "benzoyl peroxide", "vitamin c", "physical scrub"],
  "salicylic acid": ["retinol", "glycolic acid", "lactic acid", "benzoyl peroxide", "physical scrub"],
  "glycolic acid": ["retinol", "salicylic acid", "lactic acid", "benzoyl peroxide", "vitamin c", "physical scrub"],
  "lactic acid": ["retinol", "salicylic acid", "glycolic acid", "benzoyl peroxide", "vitamin c", "physical scrub"],
  "benzoyl peroxide": ["retinol", "salicylic acid", "glycolic acid", "lactic acid", "vitamin c"],
  "vitamin c": ["retinol", "glycolic acid", "lactic acid", "benzoyl peroxide"],
  "physical scrub": ["retinol", "salicylic acid", "glycolic acid", "lactic acid"],
  "niacinamide": [] // Niacinamide is generally safe, but can flush when paired with pure L-Ascorbic Acid (Vitamin C) at very low pH
};

router.post('/check', express.json(), async (req, res) => {
  const { ingredients, skinType, issues } = req.body;

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'Please provide a list of active ingredients.' });
  }

  try {
    const normalizedIngredients = ingredients.map(i => i.trim().toLowerCase());
    const conflictsFound = [];

    // 1. Detect direct chemical clashes between active ingredients
    for (let i = 0; i < normalizedIngredients.length; i++) {
      const current = normalizedIngredients[i];
      const restrictedList = conflictMatrix[current] || [];

      for (let j = i + 1; j < normalizedIngredients.length; j++) {
        const target = normalizedIngredients[j];
        if (restrictedList.includes(target)) {
          conflictsFound.push({
            pair: [current, target],
            reason: getConflictExplanation(current, target)
          });
        }
      }
    }

    // 2. Cross-reference against historical scan issues (e.g., barrier dehydration or acne)
    const issueNames = (issues || []).map(i => (i.name || '').toLowerCase());
    const hasDehydration = issueNames.some(i => i.includes('dry') || i.includes('dehydrat') || i.includes('barrier'));
    const hasSensitivity = issueNames.some(i => i.includes('sensitiv') || i.includes('red') || i.includes('irritat'));

    let clinicalRecommendation = "";
    if (conflictsFound.length > 0) {
      clinicalRecommendation = `Because your profile exhibits a <strong>${skinType}</strong> skin type with logged concerns (${issueNames.join(', ') || 'none specified'}), combining these active ingredients will severely compromise your stratum corneum lipid barrier. `;
      if (hasDehydration) clinicalRecommendation += `Given your history of dehydration, this will trigger extreme moisture evaporation. `;
      clinicalRecommendation += `<strong>Action Plan:</strong> Separate conflicting actives into alternating morning and evening routines, or use them on alternate days.`;
    } else {
      clinicalRecommendation = `Your selected ingredient combination is chemically compatible. However, maintaining your baseline <strong>${skinType}</strong> hydration balance remains essential.`;
    }

    res.json({
      success: true,
      conflicts: conflictsFound,
      recommendation: clinicalRecommendation,
      skinType: skinType || 'Standard'
    });
  } catch (err) {
    console.error('Safety engine error:', err);
    res.status(500).json({ error: 'Failed to process safety check.' });
  }
});

function getConflictExplanation(item1, item2) {
  if ((item1 === 'retinol' && item2.includes('acid')) || (item2 === 'retinol' && item1.includes('acid'))) {
    return 'Combining Retinol with Exfoliating Acids (AHAs/BHAs) causes extreme over-exfoliation and strips natural skin lipids.';
  }
  if ((item1 === 'retinol' && item2 === 'benzoyl peroxide') || (item2 === 'retinol' && item1 === 'benzoyl peroxide')) {
    return 'Benzoyl Peroxide oxidizes and neutralizes Retinol molecules, rendering them ineffective while causing localized irritation.';
  }
  if (item1 === 'physical scrub' || item2 === 'physical scrub') {
    return 'Pairing abrasive physical scrubs with chemical exfoliants (AHAs/BHAs/Retinol) causes micro-tears and chemical burns on the skin barrier.';
  }
  return `Combining ${item1} and ${item2} creates an excessively harsh chemical load, elevating inflammation risk.`;
}

module.exports = router;