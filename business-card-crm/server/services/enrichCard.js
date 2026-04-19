const OpenAI = require('openai');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function enrichCardData(extractedData) {
  const { company, designation, website } = extractedData;

  if (!company) {
    return {
      category: 'Unknown',
      description: null,
      linkedin_url: null,
      founded_year: null,
      company_size: null,
    };
  }

  const prompt = `Search the web for information about the company "${company}".
${website ? `Their website is: ${website}` : ''}
${designation ? `The contact's role is: ${designation}` : ''}

Based on your search results, return ONLY a valid JSON object with no markdown, no backticks, no explanation:
{
  "category": "one of: Technology, Healthcare, Finance, Legal, Marketing, Logistics, Education, Real Estate, Retail, Manufacturing, Consulting, Food & Beverage, Media, Non-Profit, Government, Other",
  "description": "1-2 sentence description of what the company does",
  "linkedin_url": "LinkedIn company page URL if found, else null",
  "founded_year": "founding year as string if found, else null",
  "company_size": "employee range e.g. '50-200' or 'startup' if found, else null"
}`;

  try {
    const response = await client.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: prompt,
    });

    const textOutput = response.output
      .filter(block => block.type === 'message')
      .flatMap(block => block.content)
      .filter(c => c.type === 'output_text')
      .map(c => c.text)
      .join('');

    if (!textOutput) throw new Error('No text output from Responses API');

    const cleaned = textOutput.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);

  } catch (err) {
    console.warn('Responses API enrichment failed, falling back to chat completions:', err.message);

    const fallback = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Based on your knowledge about the company "${company}", provide the following details.
${website ? `Their website is: ${website}` : ''}

Return ONLY a valid JSON object with no markdown, no backticks, no explanation:
{
  "category": "one of: Technology, Healthcare, Finance, Legal, Marketing, Logistics, Education, Real Estate, Retail, Manufacturing, Consulting, Food & Beverage, Media, Non-Profit, Government, Other",
  "description": "1-2 sentence description of what the company does",
  "linkedin_url": null,
  "founded_year": null,
  "company_size": null
}`
        }
      ]
    });

    const fallbackText = fallback.choices[0].message.content.trim();
    const cleanedFallback = fallbackText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedFallback);
  }
}

module.exports = { enrichCardData };