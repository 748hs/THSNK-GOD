export const config = { runtime: 'edge' };

export default async function handler(req) {
  const formData = await req.formData();
  const file = formData.get('pdf');

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: "Extract all text from this PDF. If it's scanned, use OCR. Return only the text content." },
          { inline_data: { mime_type: "application/pdf", data: base64 } }
        ]
      }]
    })
  });

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  return new Response(JSON.stringify({ text }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
