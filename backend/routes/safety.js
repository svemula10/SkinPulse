const express = require('express');
const router = express.Router();

const conflictMatrix = {
  "retinol": ["salicylic acid", "glycolic acid", "lactic acid", "benzoyl peroxide", "vitamin c", "physical scrub"],
  "salicylic acid": ["retinol", "glycolic acid", "lactic acid", "benzoyl peroxide", "physical scrub"],
  "glycolic acid": ["retinol", "salicylic acid", "lactic acid", "benzoyl peroxide", "vitamin c", "physical scrub"],
  "lactic acid": ["retinol", "salicylic acid", "glycolic acid", "benzoyl peroxide", "vitamin c", "physical scrub"],
  "benzoyl peroxide": ["retinol", "salicylic acid", "glycolic acid", "lactic acid", "vitamin c"],
  "vitamin c": ["retinol", "glycolic acid", "lactic acid", "benzoyl peroxide"],
  "physical scrub": ["retinol", "salicylic acid", "glycolic acid", "lactic acid"]
};

router.post('/check', express.json(), async (req, res) => {
  const { ingredients, skinType, issues } = req.body;

  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'Please provide active ingredients.' });
  }

  try {
    const normalized = ingredients.map(i => i.trim().toLowerCase());
    const conflictsFound = [];

    for (let i = 0; i < normalized.length; i++) {
      const current = normalized[i];
      const restricted = conflictMatrix[current] || [];
      for (let j = i + 1; j < normalized.length; j++) {
        const target = normalized[j];
        if (restricted.includes(target)) {
          conflictsFound.push({
            pair: [current, target],
            mechanism: getPharmacologicalMechanism(current, target)
          });
        }
      }
    }

    const issueNames = (issues || []).map(i => (i.name || '').toLowerCase());
    const hasSensitivity = issueNames.some(i => i.includes('sensitiv') || i.includes('red') || i.includes('irritat'));

    let mitigationStrategy = "";
    if (conflictsFound.length > 0) {
      mitigationStrategy = `
        <div style="margin-bottom: 10px;"><strong>Clinical Risk Assessment:</strong> Your profile is classified as <strong>${skinType}</strong>. Layering these active compounds simultaneously compromises intercellular lipid bonding, risking chemical inflammation and prolonged erythema.</div>
        <div><strong>Safe Separation Schedule:</strong><br>
        • <strong>Morning (AM) Routine:</strong> Utilize antioxidant defenses (e.g., Vitamin C or Niacinamide) paired with hydration.<br>
        • <strong>Evening (PM) Routine:</strong> Restrict potent cellular turnover agents (Retinoids or Exfoliant Acids) to alternate nights, never compounding them in a single application window.</div>
      `;
    } else {
      mitigationStrategy = `<div><strong>Status:</strong> Your active ingredient stack demonstrates biochemical harmony with no detected structural conflicts. Continue supporting your <strong>${skinType}</strong> barrier with consistent daily hydration.</div>`;
    }

    res.json({
      success: true,
      conflicts: conflictsFound,
      mitigationStrategy,
      skinType: skinType || 'Standard'
    });
  } catch (err) {
    res.status(500).json({ error: 'Safety check failed.' });
  }
});

function getPharmacologicalMechanism(item1, item2) {
  if ((item1 === 'retinol' && item2.includes('acid')) || (item2 === 'retinol' && item1.includes('acid'))) {
    return 'Simultaneous application over-stimulates epidermal shedding, degrading the natural moisturizing factor (NMF) and compromising barrier defense.';
  }
  if ((item1 === 'retinol' && item2 === 'benzoyl peroxide') || (item2 === 'retinol' && item1 === 'benzoyl peroxide')) {
    return 'Benzoyl Peroxide acts as a strong oxidizing agent, chemically breaking down and neutralizing delicate retinoid molecules.';
  }
  if (item1 === 'physical scrub' || item2 === 'physical scrub') {
    return 'Combining mechanical abrasion with chemical keratolytic agents strips the stratum corneum prematurely, causing micro-abrasions.';
  }
  return `Concurrent usage of ${item1} and ${item2} creates an excessively high chemical load, heightening skin reactivity and transepidermal water loss.`;
}

module.exports = router;