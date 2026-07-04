const axios = require('axios');

// Rule-based fallback: simple scoring based on budget and location match
const ruleBasedScore = (tenantProfile, listing) => {
  let score = 0;
  let explanation = '';

  const locationMatch = tenantProfile.preferredLocation.toLowerCase().trim() === listing.location.toLowerCase().trim();
  const budgetMatch = listing.rent >= tenantProfile.budgetMin && listing.rent <= tenantProfile.budgetMax;

  if (locationMatch && budgetMatch) {
    score = 90;
    explanation = 'Location matches exactly and rent is within budget.';
  } else if (locationMatch && !budgetMatch) {
    score = 50;
    explanation = 'Location matches, but rent is outside the preferred budget range.';
  } else if (!locationMatch && budgetMatch) {
    score = 40;
    explanation = 'Rent is within budget, but location does not match preference.';
  } else {
    score = 15;
    explanation = 'Neither location nor budget matches tenant preferences.';
  }

  return { score, explanation, source: 'rule-based' };
};

// LLM-based scoring using Gemini
const llmScore = async (tenantProfile, listing) => {
  const prompt = `Given this room listing: location=${listing.location}, rent=${listing.rent}, roomType=${listing.roomType}, furnishingStatus=${listing.furnishingStatus}, availableFrom=${listing.availableFrom}.
And this tenant profile: preferredLocation=${tenantProfile.preferredLocation}, budgetMin=${tenantProfile.budgetMin}, budgetMax=${tenantProfile.budgetMax}, moveInDate=${tenantProfile.moveInDate}.
Compute a compatibility score from 0 to 100 based on budget and location match.
Return ONLY valid JSON with no markdown formatting, in this exact shape: {"score": number, "explanation": "string"}`;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
    },
    { timeout: 8000 }
  );

  const rawText = response.data.candidates[0].content.parts[0].text;
  const cleanText = rawText.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleanText);

  return { score: parsed.score, explanation: parsed.explanation, source: 'llm' };
};

// Main function: try LLM, fall back to rule-based on any failure
const computeCompatibility = async (tenantProfile, listing) => {
  try {
    return await llmScore(tenantProfile, listing);
  } catch (err) {
    console.error('Gemini API failed, using rule-based fallback:', err.message);
    return ruleBasedScore(tenantProfile, listing);
  }
};

module.exports = { computeCompatibility };