import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { ODE_ENGINEERING_PRESETS } from "../lib/ode";
import { paramNumber, readHashState, updateHashState } from "../lib/urlState";
import { runMathTask } from "../lib/workerClient";
import { odePythonCode, odeSympyCode, odeMatlabCode } from "../lib/codegen";
import {
  buildLatexReport,
  downloadText,
  exportSvgElement,
  exportSvgAsPng,
  printReport,
} from "../lib/download";
const COLORS = ["#e65b5b", "#3ecf8e", "#f2a93b"];
function Field({ label, value, min, max, step, onChange }) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
        <span className="value">{Number(value).toFixed(2)}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}
function shapeResult(type, r, expression) {
  if (type === "custom")
    return {
      stable: r.isStable,
      data: r.t.map((t, i) => ({ t, y: r.y[i] })),
      lines: [["y", `y'=${expression}`]],
      title: "Özel ODE",
    };
  if (type === "first")
    return {
      stable: r.isStable,
      data: r.t.map((t, i) => ({ t, y: r.y[i] })),
      lines: [["y", "1. mertebe"]],
      title: "1. Mertebe",
    };
  if (type === "second")
    return {
      stable: r.isStable,
      data: r.t.map((t, i) => ({
        t,
        position: r.position[i],
        velocity: r.velocity[i],
      })),
      lines: [
        ["position", "Konum"],
        ["velocity", "Hız"],
      ],
      title: "Harmonik Osilatör",
    };
  if (type === "rlc")
    return {
      stable: r.isStable,
      data: r.t.map((t, i) => ({
        t,
        charge: r.charge[i],
        current: r.current[i],
      })),
      lines: [
        ["charge", "Yük q"],
        ["current", "Akım i"],
      ],
      title: "RLC Devresi",
    };
  if (type === "pendulum")
    return {
      stable: r.isStable,
      data: r.t.map((t, i) => ({
        t,
        angle: r.angle[i],
        angularVelocity: r.angularVelocity[i],
      })),
      lines: [
        ["angle", "Açı θ"],
        ["angularVelocity", "Açısal hız ω"],
      ],
      title: "Doğrusal Olmayan Sarkaç",
    };
  return {
    stable: r.isStable,
    data: r.snapshots.map((s, i) => ({ t: s.time, center: r.center[i] })),
    lines: [["center", "Merkez sıcaklığı"]],
    title: "1B Isı Yayılımı",
  };
}
export default function ODETab() {
  const initial = useMemo(() => readHashState().params, []),
    chartRef = useRef(null),
    requestRef = useRef(0);
  const [type, setType] = useState(() => initial.get("type") || "first"),
    [expression, setExpression] = useState(
      () => initial.get("expr") || "sin(t)-0.3*y",
    ),
    [m, setM] = useState(() => paramNumber(initial, "m", 1)),
    [c, setC] = useState(() => paramNumber(initial, "c", 0.5)),
    [k, setK] = useState(() => paramNumber(initial, "k", 2)),
    [y0, setY0] = useState(() => paramNumber(initial, "y0", 5)),
    [v0, setV0] = useState(() => paramNumber(initial, "v0", 0)),
    [tMax, setTMax] = useState(() => paramNumber(initial, "t", 30)),
    [computed, setComputed] = useState({
      stable: false,
      data: [],
      lines: [],
      title: "Hesaplanıyor…",
    }),
    [busy, setBusy] = useState(true),
    [perf, setPerf] = useState({ worker: true, wasm: "checking" });
  useEffect(() => {
    runMathTask("perf:status")
      .then(setPerf)
      .catch(() => setPerf({ worker: true, wasm: "fallback" }));
  }, []);
  useEffect(
    () =>
      updateHashState("ode", {
        type,
        expr: type === "custom" ? expression : undefined,
        m,
        c,
        k,
        y0,
        v0,
        t: tMax,
      }),
    [type, expression, m, c, k, y0, v0, tMax],
  );
  useEffect(() => {
    const id = ++requestRef.current;
    setBusy(true);
    const common = {
      m,
      c,
      k,
      y0,
      v0,
      tMax,
      nPoints: type === "heat" ? undefined : 900,
    };
    let task = `ode:${type}`,
      payload = common;
    if (type === "custom") payload = { expression, y0, tMax, nPoints: 900 };
    else if (type === "rlc") payload = { tMax };
    else if (type === "pendulum") payload = { tMax };
    else if (type === "heat") payload = { tMax: Math.min(tMax, 8) };
    runMathTask(task, payload)
      .then((r) => {
        if (id === requestRef.current)
          setComputed(shapeResult(type, r, expression));
      })
      .catch((error) => {
        if (id === requestRef.current)
          setComputed({
            stable: false,
            error: error.message,
            data: [],
            lines: [],
            title: "Hata",
          });
      })
      .finally(() => {
        if (id === requestRef.current) setBusy(false);
      });
  }, [type, expression, m, c, k, y0, v0, tMax]);
  const applyPreset = (p) => {
    setType(p.model);
    const q = p.params || {};
    if (q.m != null) setM(q.m);
    if (q.c != null) setC(q.c);
    if (q.k != null) setK(q.k);
    if (q.y0 != null) setY0(q.y0);
    if (q.v0 != null) setV0(q.v0);
    if (q.tMax != null) setTMax(q.tMax);
  };
  const phaseKeys =
    type === "second"
      ? ["position", "velocity"]
      : type === "pendulum"
        ? ["angle", "angularVelocity"]
        : type === "rlc"
          ? ["charge", "current"]
          : null;
  const phaseData = phaseKeys
    ? computed.data.map((r, i) => ({
        x: r[phaseKeys[0]],
        y: r[phaseKeys[1]],
        order: i,
      }))
    : [];
  const damping = type === "second" ? c / (2 * Math.sqrt(m * k)) : null;
  const config = { type, expression, m, c, k, y0, v0, tMax },
    codegenAllowed = ["first", "second", "custom"].includes(type);
  const report = {
    title: "SimuMath ODE Laboratuvar Raporu",
    summary: `${computed.title} modeli`,
    parameters: { type, m, c, k, y0, v0, tMax },
    results: {
      stable: computed.stable ? "evet" : "hayır",
      samples: computed.data.length,
      engine: `Web Worker + ${perf.wasm === "wasm" ? "WASM" : "JS fallback"}`,
    },
    notes: [
      "Hesaplama ana UI iş parçacığından ayrılmış worker üzerinde yürütüldü.",
    ],
  };
  const svg = () => chartRef.current?.querySelector("svg");
  return (
    <div className="tab-panel">
      <div className="control-panel">
        <h2>Engineering Presets & Gallery</h2>
        <p className="description">
          Parametreleri sürüklerken eğrinin ve faz portresinin nasıl değiştiğini
          aynı anda izle.
        </p>
        <div className="result-banner">
          Motor: Web Worker · WASM:{" "}
          {perf.wasm === "wasm" ? "aktif" : "JS fallback"}{" "}
          {busy ? "· hesaplanıyor…" : ""}
        </div>
        <div className="btn-row">
          {ODE_ENGINEERING_PRESETS.map((p) => (
            <button
              key={p.key}
              className="btn btn-secondary"
              onClick={() => applyPreset(p)}
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="field">
          <label>Sistem Tipi</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="first">1. Mertebe</option>
            <option value="second">Harmonik Osilatör</option>
            <option value="custom">Özel ODE</option>
            <option value="rlc">RLC</option>
            <option value="pendulum">Sarkaç</option>
            <option value="heat">Isı Yayılımı</option>
          </select>
        </div>
        {type === "custom" && (
          <div className="field">
            <label>f(y,t)</label>
            <input
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
            />
          </div>
        )}
        {type === "second" && (
          <>
            <Field
              label="m · Kütle"
              value={m}
              min={0.1}
              max={10}
              step={0.1}
              onChange={setM}
            />
            <Field
              label="c · Sönüm"
              value={c}
              min={0}
              max={10}
              step={0.1}
              onChange={setC}
            />
            <Field
              label="k · Yay sabiti"
              value={k}
              min={0.1}
              max={20}
              step={0.1}
              onChange={setK}
            />
            {damping != null && (
              <div className="intuition-note">
                <strong>ζ = {damping.toFixed(2)}</strong>
                <span>
                  {damping < 0.98
                    ? "Az sönümlü · salınım beklenir"
                    : damping <= 1.02
                      ? "Kritik sönüm · en hızlı salınımsız dönüş"
                      : "Aşırı sönümlü · yavaş salınımsız dönüş"}
                </span>
              </div>
            )}
          </>
        )}
        <Field
          label="Süre"
          value={tMax}
          min={1}
          max={60}
          step={1}
          onChange={setTMax}
        />
        <div className="btn-row" style={{ flexWrap: "wrap" }}>
          {codegenAllowed && (
            <>
              <button className="btn btn-secondary" onClick={() => downloadText("simumath-ode.py", odePythonCode(config))}>Python</button>
              <button className="btn btn-secondary" onClick={() => downloadText("simumath-ode-sympy.py", odeSympyCode(config))}>SymPy</button>
              <button className="btn btn-secondary" onClick={() => downloadText("simumath-ode.m", odeMatlabCode(config))}>MATLAB</button>
            </>
          )}
          <button className="btn btn-secondary" onClick={() => downloadText("simumath-ode-report.tex", buildLatexReport(report), "application/x-tex;charset=utf-8")}>LaTeX</button>
          <button className="btn btn-secondary" onClick={() => printReport(report)}>PDF</button>
          <button className="btn btn-secondary" onClick={() => exportSvgElement(svg(), "simumath-ode.svg")}>SVG</button>
          <button className="btn btn-secondary" onClick={() => exportSvgAsPng(svg(), "simumath-ode-3x.png", 3)}>PNG 3×</button>
        </div>
      </div>
      <div className="viz-panel">
        <div className="viz-title">
          3.2 Intuition Builder · {computed.title}
        </div>
        {busy ? (
          <div className="viz-body">
            <p>Worker hesaplıyor…</p>
          </div>
        ) : computed.stable ? (
          <div className={phaseKeys ? "intuition-split" : "viz-body"}>
            <section className="intuition-pane">
              <div className="viz-title">Zaman Tepkisi</div>
              <div ref={chartRef} style={{ width: "100%", height: 390 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={computed.data}>
                    <CartesianGrid stroke="#263758" strokeDasharray="3 3" />
                    <XAxis dataKey="t" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {computed.lines.map(([key, name], i) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={name}
                        stroke={COLORS[i % COLORS.length]}
                        dot={false}
                        strokeWidth={2.2}
                        animationDuration={250}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
            {phaseKeys && (
              <section className="intuition-pane">
                <div className="viz-title">
                  Faz Portresi · {phaseKeys[0]} × {phaseKeys[1]}
                </div>
                <div style={{ width: "100%", height: 390 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart>
                      <CartesianGrid stroke="#263758" strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="x" name={phaseKeys[0]} />
                      <YAxis type="number" dataKey="y" name={phaseKeys[1]} />
                      <ZAxis range={[12, 12]} />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter
                        data={phaseData}
                        fill="#3ecf8e"
                        line
                        shape="circle"
                        isAnimationActive
                        animationDuration={250}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="viz-body">
            <p>
              {computed.error
                ? `Hesaplama hatası: ${computed.error}`
                : "Model sayısal olarak kararsız veya çözülemedi."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
