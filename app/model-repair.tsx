"use client";

import { useEffect, useRef, useState } from "react";
import { repairPressure } from "@/lib/real-gas";

import { ANSWER_LIMIT, choices, investigations, LEVEL2_TITLE, LEVEL2_VERSION, validLevel2Draft } from "@/lib/level2";

function RevealHints({ hints, first }: { hints: string[]; first: number }) {
  const [visible, setVisible] = useState(0);
  return <div className="repair-hints">
    <div aria-live="polite">{hints.slice(0, visible).map((hint, i) => <p key={hint}><strong>Hint {first + i}.</strong> {hint}</p>)}</div>
    {visible < hints.length && <button type="button" onClick={() => setVisible(visible + 1)}>Reveal Hint</button>}
  </div>;
}

type Point = { x: number; y: number };

function drawAttractions(c: CanvasRenderingContext2D, particles: Point[], left: number, radius: number) {
  const arrowLength = 7, arrowGap = 2, head = 3;
  const minSeparation = 2 * (radius + arrowGap + arrowLength) + 3;
  const pairs: { i: number; j: number; distance: number }[] = [];
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const p = particles[i], q = particles[j];
      const distance = Math.hypot(q.x - p.x, q.y - p.y);
      if (distance >= minSeparation && distance <= 60) pairs.push({ i, j, distance });
    }
  }
  pairs.sort((a, b) => a.distance - b.distance);
  const linked = new Set<number>();
  c.strokeStyle = "#886c7e";
  c.lineWidth = 1.15;
  for (const { i, j, distance } of pairs) {
    if (linked.has(i) || linked.has(j)) continue;
    linked.add(i);
    linked.add(j);
    const p = particles[i], q = particles[j];
    const dx = (q.x - p.x) / distance, dy = (q.y - p.y) / distance;
    const start = radius + arrowGap, tip = start + arrowLength;
    c.beginPath();
    for (const [source, sign] of [[p, 1], [q, -1]] as const) {
      const ux = dx * sign, uy = dy * sign;
      const x = left + source.x + tip * ux, y = source.y + tip * uy;
      c.moveTo(left + source.x + start * ux, source.y + start * uy);
      c.lineTo(x, y);
      c.moveTo(x - head * ux - head * .65 * uy, y - head * uy + head * .65 * ux);
      c.lineTo(x, y);
      c.lineTo(x - head * ux + head * .65 * uy, y - head * uy - head * .65 * ux);
    }
    c.stroke();
  }
}

type ChamberSettings = { temperature: number; volume: number; paused: boolean; attractions: boolean; finite: boolean };

function Chamber({ temperature, volume, paused, attractions, finite }: ChamberSettings) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const settings = useRef({ temperature, volume, paused, attractions, finite });
  useEffect(() => { settings.current = { temperature, volume, paused, attractions, finite }; }, [temperature, volume, paused, attractions, finite]);
  useEffect(() => {
    const node = canvas.current!;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    const particles = Array.from({ length: 32 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 52 + Math.random() * 48;
      return { x: (i % 8 + .5) / 8, y: 24 + Math.floor(i / 8) * 39, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
    });
    let frame = 0, last = 0, width = 0;
    function draw(now: number) {
      const c = ctx!;
      const w = node.clientWidth, h = node.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      if (node.width !== Math.round(w * ratio) || node.height !== Math.round(h * ratio)) {
        node.width = Math.round(w * ratio);
        node.height = Math.round(h * ratio);
      }
      const state = settings.current;
      const dt = last ? Math.min(.025, (now - last) / 1000) : 0;
      last = now;
      const r = state.finite ? 5.5 : 2;
      const previousWidth = width;
      const target = Math.max(2 * r + 1, (w - 20) * Math.sqrt(state.volume / 8));
      width = width ? width + (target - width) * Math.min(1, dt * 15) : target;
      const left = (w - width) / 2, top = 10, bottom = h - 10;
      const right = Math.max(r, width - r);
      const speed = state.paused ? 0 : Math.sqrt(state.temperature / 300);
      c.setTransform(ratio, 0, 0, ratio, 0, 0);
      c.clearRect(0, 0, w, h);
      c.fillStyle = "#e6eee8";
      c.strokeStyle = "#6b8477";
      c.lineWidth = 2;
      c.fillRect(left, top, width, bottom - top);
      c.strokeRect(left, top, width, bottom - top);
      for (const p of particles) {
        if (!previousWidth) p.x *= width;
        else if (width !== previousWidth && previousWidth > 2 * r) {
          p.x = r + (p.x - r) * (width - 2 * r) / (previousWidth - 2 * r);
        }
        p.x += p.vx * speed * dt;
        p.y += p.vy * speed * dt;
        if (p.x <= r) { p.x = r; p.vx = Math.abs(p.vx); }
        if (p.x >= right) { p.x = right; p.vx = -Math.abs(p.vx); }
        if (p.y <= top + r) { p.y = top + r; p.vy = Math.abs(p.vy); }
        if (p.y >= bottom - r) { p.y = bottom - r; p.vy = -Math.abs(p.vy); }
      }
      for (let i = 0; state.finite && i < particles.length; i++) {
        const p = particles[i];
        for (const q of particles.slice(i + 1)) {
          const dx = q.x - p.x, dy = q.y - p.y;
          const distance = Math.hypot(dx, dy);
          if (!distance || distance >= 2 * r) continue;
          const nx = dx / distance, ny = dy / distance;
          const overlap = (2 * r - distance) / 2;
          p.x = Math.max(r, Math.min(right, p.x - nx * overlap));
          q.x = Math.max(r, Math.min(right, q.x + nx * overlap));
          p.y = Math.max(top + r, Math.min(bottom - r, p.y - ny * overlap));
          q.y = Math.max(top + r, Math.min(bottom - r, q.y + ny * overlap));
          const approach = (p.vx - q.vx) * nx + (p.vy - q.vy) * ny;
          if (approach > 0) {
            p.vx -= approach * nx; p.vy -= approach * ny;
            q.vx += approach * nx; q.vy += approach * ny;
          }
        }
      }
      if (state.attractions) drawAttractions(c, particles, left, r);
      c.fillStyle = "#486c61";
      for (const p of particles) {
        c.beginPath();
        c.arc(left + p.x, p.y, r, 0, Math.PI * 2);
        c.fill();
      }
      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvas} role="img" aria-label="Moving gas particles in a chamber" />;
}

type StudentIdentity = { classCode: string; teamId: number; studentCode: string };

function Investigation({ kind, active, draftKey, session, demo = false }: { kind: keyof typeof investigations; active: boolean; draftKey: string; session: StudentIdentity; demo?: boolean }) {
  const thermal = kind === "temperature";
  const steps = investigations[kind];
  const [value, setValue] = useState(thermal ? 600 : 0.125);
  const [attractions, setAttractions] = useState(steps[0].attractions);
  const [finite, setFinite] = useState(false);
  const [paused, setPaused] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const question = steps[stepIndex];
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const focusNextStep = useRef(false);
  useEffect(() => {
    if (!focusNextStep.current) return;
    focusNextStep.current = false;
    stepHeading.current?.focus({ preventScroll: true });
  }, [stepIndex]);
  const complete = validLevel2Draft(kind, answers) && answers.every((answer) => answer.trim());
  const key = draftKey + ":" + kind + ":v" + LEVEL2_VERSION;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const saveRevision = useRef(0);
  const [saveState, setSaveState] = useState("");
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  function saveAnswers(next: string[], delay = 500) {
    if (demo) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const revision = ++saveRevision.current;
    setSaveState("Saving…");
    saveTimer.current = setTimeout(() => {
      saveQueue.current = saveQueue.current.then(async () => {
        if (revision !== saveRevision.current) return;
        let saved = false;
        try {
          const response = await fetch("/api/level2", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...session, kind, version: LEVEL2_VERSION, answers: next }),
          });
          saved = response.ok;
        } catch {
          // The browser draft remains available for a retry.
        }
        if (revision === saveRevision.current) setSaveState(saved ? "Saved to class wall" : "Save failed");
      });
    }, delay);
  }

  function updateAnswer(value: string) {
    const next = steps.map((_, index) => index === stepIndex ? value : (answers[index] ?? ""));
    setAnswers(next);
    setFinished(false);
    sessionStorage.setItem(key, JSON.stringify(next));
    saveAnswers(next);
  }

  function goTo(index: number) {
    focusNextStep.current = true;
    setStepIndex(index);
    setFinished(false);
    setAttractions(steps[index].attractions);
    setFinite(steps[index].finite);
    setValue(thermal ? (index < 2 ? 600 : 300) : 0.125);
  }

  useEffect(() => {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      try {
        const draft: unknown = JSON.parse(saved);
        if (validLevel2Draft(kind, draft)) setAnswers(draft);
      } catch {
        // Ignore invalid browser drafts.
      }
    }
    setPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [key, kind]);
  const vesselVolume = thermal ? 1 : 1 / value;
  const { ideal, model, deviation } = repairPressure(thermal ? value : 400, vesselVolume, attractions, finite);
  const unit = thermal ? "K" : "mol/L";
  const shown = (n: number) => thermal ? String(n) : n.toFixed(3).replace(/(\.\d{2})0$/, "$1");
  const min = thermal ? 300 : 0.125, max = thermal ? 600 : 2;
  return <section hidden={!active} aria-labelledby={kind + "-title"}>
    <div className="repair-heading"><h3 id={kind + "-title"}>{thermal ? "Temperature" : "Density"} Investigation</h3><p>CO₂ · 1.00 mol · {thermal ? "1 L fixed" : "400 K fixed"}</p></div>
    <div className="repair-grid">
      <div className="repair-card">
        <label className="repair-slider"><span>{thermal ? "Temperature" : "Gas Density (mol/L)"} <output>{shown(value)} {unit}</output></span>
          <input type="range" min={min} max={max} step={thermal ? 1 : 0.025} value={value} onChange={(e) => setValue(Number(e.target.value))} />
          <span className="repair-range"><small>{shown(min)} {unit}</small><small>{shown(max)} {unit}</small></span>
        </label>
        <label className="repair-toggle"><input type="checkbox" checked={attractions} onChange={(e) => setAttractions(e.target.checked)} /> Include intermolecular attractions</label>
        <label className="repair-toggle"><input type="checkbox" checked={finite} onChange={(e) => setFinite(e.target.checked)} /> Include finite molecular volume</label>
      </div>
      <div className="repair-card repair-motion">
        {active && <Chamber temperature={thermal ? value : 400} volume={thermal ? 8 : vesselVolume} paused={paused} attractions={attractions} finite={finite} />}
        <div><span>{thermal ? "Fixed chamber" : "Fixed temperature"}</span><button type="button" onClick={() => setPaused(!paused)}>{paused ? "Play motion" : "Pause motion"}</button></div>
      </div>
    </div>
    <dl className="repair-readings">
      <div><dt>Ideal Pressure</dt><dd>{ideal.toFixed(2)} <small>bar</small></dd></div>
      <div><dt>Model Pressure</dt><dd>{model.toFixed(2)} <small>bar</small></dd></div>
      <div><dt>Deviation %</dt><dd>{deviation < 0 ? "−" : "+"}{Math.abs(deviation).toFixed(2)}%</dd></div>
    </dl>
    <p className="repair-note">Model predictions · Particle size illustrates the selected assumption.</p>
    <div className="repair-card repair-step" key={stepIndex}>
      <h4 tabIndex={-1} ref={stepHeading}>Step {stepIndex + 1} of {steps.length} · {question.title}</h4>
      <p>{question.instruction}</p>
      <div className="repair-questions repair-current-question">
        {question.choice ? <fieldset className="repair-options">
          <legend><strong>Q{stepIndex + 1} · {question.title}</strong><span className="repair-prompt">{question.prompt}</span></legend>
          {choices.map((choice) => <label key={choice}>
            <input type="radio" name={key + ":" + stepIndex} value={choice} checked={answers[stepIndex] === choice} onChange={() => updateAnswer(choice)} />
            {choice}
          </label>)}
        </fieldset> : <label>
          <strong>Q{stepIndex + 1} · {question.title}</strong><span className="repair-prompt">{question.prompt}</span>
          <textarea rows={3} maxLength={ANSWER_LIMIT} value={answers[stepIndex] ?? ""} placeholder="Write your answer…" onChange={(e) => updateAnswer(e.target.value)} />
        </label>}
        {question.hints && <RevealHints hints={question.hints} first={stepIndex === 2 ? 1 : 2} />}
      </div>
      <div className="repair-step-actions">
        {stepIndex > 0 && <button type="button" onClick={() => goTo(stepIndex - 1)}>Previous step</button>}
        {stepIndex < steps.length - 1
          ? <button type="button" onClick={() => goTo(stepIndex + 1)}>Next step</button>
          : <button type="button" onClick={() => { setFinished(true); if (complete) saveAnswers(answers, 0); }}>Finish investigation</button>}
        {finished && <span role="status">{
          !complete ? "Complete all four answers. Use Previous step to revisit earlier questions." :
          demo ? "Investigation complete." :
          saveState === "Saved to class wall" ? "Investigation complete · Answers saved and shared with the class data wall." :
          saveState === "Save failed" ? "Answers could not be shared. Select Finish investigation to try again." :
          "Sharing answers…"
        }</span>}
      </div>
    </div>
    <p className="repair-note">Answers stay in this browser tab and are shared with the teacher data wall. {saveState && <span className="repair-save-status">{saveState}</span>}</p>
  </section>;
}

export default function ModelRepair({ draftKey, session, demo = false }: { draftKey: string; session: StudentIdentity; demo?: boolean }) {
  const [kind, setKind] = useState<keyof typeof investigations>("temperature");
  return <div className="repair-station">
    <header><p>LEVEL 02</p><h2>{LEVEL2_TITLE}</h2></header>
    <nav aria-label="Choose an investigation">
      <button aria-pressed={kind === "temperature"} onClick={() => setKind("temperature")}>Temperature</button>
      <button aria-pressed={kind === "density"} onClick={() => setKind("density")}>Density</button>
    </nav>
    <Investigation kind="temperature" active={kind === "temperature"} draftKey={draftKey} session={session} demo={demo} />
    <Investigation kind="density" active={kind === "density"} draftKey={draftKey} session={session} demo={demo} />
  </div>;
}
