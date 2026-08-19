import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools = [
  {
    type: 'function',
    name: 'open_simulation',
    description: 'Open or update a SimuMath simulation. Use this whenever the user asks to create, configure, change, or demonstrate a simulation.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        module: { type: 'string', enum: ['ode', 'matrix', 'fourier', 'network', 'dfa'] },
        params: { type: 'object', additionalProperties: { type: ['string', 'number', 'boolean'] } },
        reason: { type: 'string' }
      },
      required: ['module', 'params', 'reason']
    }
  },
  {
    type: 'function',
    name: 'explain_math_issue',
    description: 'Explain a mathematical, numerical, stability, convergence, matrix, Fourier, graph, or automata issue using the current SimuMath state.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        topic: { type: 'string' },
        explanation: { type: 'string' },
        suggestion: { type: 'string' }
      },
      required: ['topic', 'explanation', 'suggestion']
    }
  }
];

const instructions = `You are SimuMath Copilot, a concise Turkish-first engineering mathematics tutor embedded inside SimuMath.
You can reason about ODEs, matrices, Fourier series, Dijkstra graphs, DFA/NFA and numerical methods.
When the user asks to create or change a simulation, call open_simulation with only parameters supported by the relevant lab URL state.
Useful ODE params: type(first|second|custom|rlc|pendulum|heat), expr, m, c, k, y0, v0, t.
Matrix params: a,b,c,d,vx,vy. Fourier params: wave(square|sawtooth), n.
If the user asks why something fails or behaves unexpectedly, prefer explain_math_issue and teach the reason.
Never claim a calculation was executed if you only inferred it. Keep explanations pedagogical and compact.`;

function hashForAction(action) {
  const params = new URLSearchParams();
  Object.entries(action.params || {}).forEach(([key, value]) => params.set(key, String(value)));
  return `#${action.module}${params.size ? `?${params}` : ''}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY yapılandırılmamış.' });
  try {
    const { message, history = [], currentState = '' } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message gerekli.' });
    const input = [
      ...history.slice(-8).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') })),
      { role: 'user', content: `Mevcut SimuMath durumu: ${currentState || 'bilinmiyor'}\n\nKullanıcı: ${message}` }
    ];
    let response = await client.responses.create({ model: process.env.OPENAI_MODEL || 'gpt-5.6', instructions, input, tools, tool_choice: 'auto' });
    let action = null;
    let issue = null;
    const outputs = [];
    for (const item of response.output || []) {
      if (item.type !== 'function_call') continue;
      const args = JSON.parse(item.arguments || '{}');
      if (item.name === 'open_simulation') {
        action = { module: args.module, params: args.params, reason: args.reason };
        outputs.push({ type: 'function_call_output', call_id: item.call_id, output: JSON.stringify({ ok: true, hash: hashForAction(action), message: 'Simülasyon eylemi hazırlandı.' }) });
      }
      if (item.name === 'explain_math_issue') {
        issue = args;
        outputs.push({ type: 'function_call_output', call_id: item.call_id, output: JSON.stringify({ ok: true, accepted: true }) });
      }
    }
    if (outputs.length) {
      response = await client.responses.create({ model: process.env.OPENAI_MODEL || 'gpt-5.6', instructions, previous_response_id: response.id, input: outputs, tools });
    }
    return res.status(200).json({ text: response.output_text || issue?.explanation || 'Hazır.', action: action ? { ...action, hash: hashForAction(action) } : null, issue, responseId: response.id });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Copilot isteği işlenemedi.' });
  }
}
