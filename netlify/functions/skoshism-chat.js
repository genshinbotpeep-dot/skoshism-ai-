exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders(), body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: { message: 'Netlify 환경변수 OPENAI_API_KEY가 설정되지 않았어.' } }) };
  try {
    const payload = JSON.parse(event.body || '{}');
    const model = typeof payload.model === 'string' && /^[a-zA-Z0-9._-]+$/.test(payload.model) ? payload.model : 'gpt-4.1-mini';
    const messages = Array.isArray(payload.messages) ? payload.messages.slice(-3) : [];
    if (!messages.length || messages.some(m => !['system','user','assistant'].includes(m.role) || typeof m.content !== 'string')) {
      return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: { message: 'Invalid messages' } }) };
    }
    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, temperature: 1.05, max_tokens: 220, presence_penalty: 0.8, frequency_penalty: 0.65 })
    });
    const body = await upstream.text();
    return { statusCode: upstream.status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' }, body };
  } catch (e) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: { message: e.message || 'Server error' } }) };
  }
};
function corsHeaders() { return { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }; }
