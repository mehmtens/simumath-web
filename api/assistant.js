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
        params_json: { type: 'string', description: 'A JSON object string containing only URL-state parameters supported by the chosen SimuMath module.' },
        reason: { type: 'string' }
      },
      required: ['module', 'params_json', 'reason']
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
When the user asks to create or change a simulation, call open_simulation. Put module parameters in params_json as a valid JSON object string.
Useful ODE params: type(first|second|custom|rlc|pendulum|heat), expr, m, c, k, y0, v0, t.
Matrix params: a,b,c,d,vx,vy. Fourier params: wave(square|sawtooth), n.
If the user asks why something fails or behaves unexpectedly, prefer explain_math_issue and teach the reason.
Never claim a calculation was executed if you only inferred it. Keep explanations pedagogical and compact.`;

function hashForAction(action) {
  const params = new URLSearchParams();
  Object.entries(action.params || {}).forEach(([key, value]) => params.set(key, String(value)));
  return `#${action.module}${params.size ? `?${params}` : ''}`;
}

function parseParams(raw) {
  const parsed = JSON.parse(raw || '{}');
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Invalid params_json');
  return parsed;
}

async function createResponse(body) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) {
    const message = data?.error?.message || `OpenAI API ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function outputText(response) {
  if (response.output_text) return response.output_text;
  return (response.output || []).flatMap((item) => item.content || []).filter((part) => part.type === 'output_text').map((part) => part.text).join('\n').trim();
}

export default async function handler(req, res) {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'OPENAI_API_KEY yapılandırılmamış.' });
  const model = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  if (req.method === 'GET' && req.query?.smoke === '1') {
    try {
      const response = await createResponse({ model, input: 'Reply with exactly: SIMUMATH_OK', reasoning: { effort: 'none' }, max_output_tokens: 16 });
      return res.status(200).json({ ok: outputText(response).includes('SIMUMATH_OK'), model, text: outputText(response) });
    } catch (error) {
      return res.status(500).json({ ok: false, model, error: String(error?.message || error) });
    }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { message, history = [], currentState = '' } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message gerekli.' });
    const input = [
      ...history.slice(-8).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') })),
      { role: 'user', content: `Mevcut SimuMath durumu: ${currentState || 'bilinmiyor'}\n\nKullanıcı: ${message}` }
    ];
    let response = await createResponse({ model, instructions, input, tools, tool_choice: 'auto', reasoning: { effort: 'low' } });
    let action = null;
    let issue = null;
    const outputs = [];
    for (const item of response.output || []) {
      if (item.type !== 'function_call') continue;
      const args = JSON.parse(item.arguments || '{}');
      if (item.name === 'open_simulation') {
        action = { module: args.module, params: parseParams(args.params_json), reason: args.reason };
        outputs.push({ type: 'function_call_output', call_id: item.call_id, output: JSON.stringify({ ok: true, hash: hashForAction(action), message: 'Simülasyon eylemi hazırlandı.' }) });
      }
      if (item.name === 'explain_math_issue') {
        issue = args;
        outputs.push({ type: 'function_call_output', call_id: item.call_id, output: JSON.stringify({ ok: true, accepted: true }) });
      }
    }
    if (outputs.length) {
      response = await createResponse({ model, instructions, previous_response_id: response.id, input: outputs, tools, reasoning: { effort: 'low' } });
    }
    return res.status(200).json({ text: outputText(response) || issue?.explanation || 'Hazır.', action: action ? { ...action, hash: hashForAction(action) } : null, issue, responseId: response.id, model });
  } catch (error) {
    console.error('SimuMath Copilot:', error?.message || error);
    return res.status(500).json({ error: 'Copilot isteği işlenemedi.', detail: process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined });
  }
}
