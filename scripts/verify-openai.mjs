const key = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
if (!key) {
  console.error('OPENAI_API_KEY missing');
  process.exit(1);
}
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
  body: JSON.stringify({ model, input: 'Reply with exactly: SIMUMATH_OK', reasoning: { effort: 'none' }, max_output_tokens: 16 })
});
const data = await response.json();
if (!response.ok) {
  console.error(`OpenAI verification failed (${response.status}): ${data?.error?.message || 'unknown error'}`);
  process.exit(1);
}
const text = data.output_text || (data.output || []).flatMap((x) => x.content || []).filter((x) => x.type === 'output_text').map((x) => x.text).join('\n');
if (!text.includes('SIMUMATH_OK')) {
  console.error(`OpenAI verification returned unexpected output for ${model}`);
  process.exit(1);
}
console.log(`OpenAI verification OK · model=${model}`);
