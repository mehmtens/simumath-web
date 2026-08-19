let worker;
let nextId = 1;
const pending = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/mathWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const entry = pending.get(data.id);
      if (!entry) return;
      pending.delete(data.id);
      if (data.ok) entry.resolve(data.result);
      else entry.reject(new Error(data.error));
    };
    worker.onerror = (error) => {
      for (const { reject } of pending.values()) reject(error);
      pending.clear();
    };
  }
  return worker;
}

export function runMathTask(task, payload = {}) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, task, payload });
  });
}

export function terminateMathWorker() {
  worker?.terminate();
  worker = undefined;
  pending.clear();
}
