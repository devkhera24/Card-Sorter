const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function extractCardData(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');

  const ext = path.extname(imagePath).toLowerCase();
  const mediaTypeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  const mediaType = mediaTypeMap[ext] || 'image/jpeg';

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mediaType};base64,${base64Image}`,
              detail: 'high'
            }
          },
          {
            type: 'text',
            text: `You are a business card reader. Extract ALL information from this business card image.
Return ONLY a valid JSON object with no markdown, no backticks, no explanation. Use this exact structure:
{
  "name": "full name or null",
  "email": "email address or null",
  "phone": "phone number or null",
  "company": "company name or null",
  "designation": "job title or null",
  "website": "website URL or null",
  "address": "full address or null",
  "social_handles": "any social media handles as a comma-separated string or null",
  "raw_card_text": "all text found on the card verbatim"
}
If a field is not present on the card, use null.`
          }
        ]
      }
    ]
  });

  const rawText = response.choices[0].message.content.trim();

  try {
    const cleaned = rawText.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse GPT-4o extraction response:', rawText);
    throw new Error('GPT-4o returned invalid JSON during extraction');
  }
}

module.exports = { extractCardData };