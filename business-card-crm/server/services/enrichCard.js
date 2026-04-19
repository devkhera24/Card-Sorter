const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function enrichCardData(extractedData) {
  const { company, designation, website } = extractedData;

  if (!company) {
    return {
      category: 'Other',
      description: null,
      linkedin_url: null,
      founded_year: null,
      company_size: null,
      keywords: null,
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Based on your knowledge about the company "${company}", provide details.
${website ? `Their website is: ${website}` : ''}
${designation ? `The contact's role is: ${designation}` : ''}

Return ONLY a valid JSON object, no markdown, no backticks:
{
  "category": "one of: Technology, Healthcare, Finance, Legal, Marketing, Logistics, Education, Real Estate, Retail, Manufacturing, Consulting, Food & Beverage, Media, Non-Profit, Government, Other",
  "description": "3-4 sentence description of what the company does",
  "linkedin_url": null,
  "founded_year": null,
  "company_size": null,
  "keywords": "comma-separated list of 10-15 relevant keywords: industry terms, product names, service categories, synonyms a user might search"
}`
      }]
    });

    const text = response.choices[0].message.content.trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);

  } catch (err) {
    console.error('Enrichment failed:', err.message);
    return {
      category: 'Other',
      description: null,
      linkedin_url: null,
      founded_year: null,
      company_size: null,
      keywords: null,
    };
  }
}

module.exports = { enrichCardData };