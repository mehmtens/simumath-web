import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/assistant.js';

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

test('Groq tool continuation replays output without previous_response_id', async (t) => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  const requests = [];
  process.env.GROQ_API_KEY = 'test-key';
  globalThis.fetch = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    const data = requests.length === 1
      ? { id: 'response-1', output: [{ type: 'function_call', name: 'open_simulation', call_id: 'call-1', arguments: '{"module":"ode","params_json":"{\\"type\\":\\"first\\"}","reason":"Test"}' }] }
      : { id: 'response-2', output_text: 'Hazır.', output: [] };
    return { ok: true, json: async () => data };
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
  });

  const res = response();
  await handler({ method: 'POST', body: { message: 'Bir ODE aç' } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(requests.length, 2);
  assert.equal('previous_response_id' in requests[1], false);
  assert.deepEqual(requests[1].input.map((item) => item.type), ['function_call', 'function_call_output']);
  assert.equal(res.body.action.hash, '#ode?type=first');
});
