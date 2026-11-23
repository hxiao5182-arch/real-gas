"use client";

import { useEffect, useRef, useState } from "react";
import { repairPressure } from "@/lib/real-gas";

type Question = { title: string; prompt: string; hints?: string[]; firstHint?: number };
type Step = { title: string; instruction: string; attractions: boolean; finite: boolean; question?: Question };

const investigations: Record<"temperature" | "density", Step[]> = {
  temperature: [
    { title: "Set the Model", instruction: 'Turn ON "Include intermolecular attractions" and turn OFF "Include finite molecular volume".', attractions: true, finite: false },
    { title: "Change Temperature", instruction: "Move the temperature slider from low to high and observe the percentage deviation.", attractions: true, finite: false, question: {
      title: "Observation", prompt: "When only intermolecular attractions are included, how does increasing temperature affect the percentage deviation from ideal pressure?",
    } },
    { title: "Observe Particle Motion", instruction: "Watch how particle motion changes as temperature increases.", attractions: true, finite: false, question: {
      title: "Particle Motion", prompt: "According to KMT, what changes in the motion of gas particles as temperature increases?", hints: ["Think about the relationship between temperature, average kinetic energy, and particle speed."], firstHint: 1,
    } },
    { title: "Explain", instruction: "Connect your particle-motion observations to the pressure deviation in Q1.", attractions: true, finite: false, question: {
      title: "Explanation", prompt: "How can the change in particle motion explain the pressure deviation observed in Question 1?", hints: [
        "How can intermolecular attractions change the speed and direction of a moving particle?",
        "At the same attractive force, faster particles have less time to be slowed down, so the change in velocity is smaller.",
      ], firstHint: 2,
    } },
  ],
  density: [
    { title: "Change Density", instruction: "Turn OFF both corrections, then increase the gas density and observe particle spacing.", attractions: false, finite: false, question: {
      title: "Observation", prompt: "As gas density increases, what happens to the average distance between particles?", hints: ["Think about the same number of particles occupying less space."], firstHint: 1,
    } },
    { title: "Test Attractions", instruction: 'Turn ON "Include intermolecular attractions" only, then increase the density again.', attractions: true, finite: false, question: {
      title: "Intermolecular Attractions", prompt: "Why do intermolecular attractions become more important at higher gas densities?", hints: ["How does the attractive force between nearby particles change as their separation decreases?"], firstHint: 2,
    } },
    { title: "Test Molecular Volume", instruction: 'Turn OFF attractions and turn ON "Include finite molecular volume", then increase the density again.', attractions: false, finite: true, question: {
      title: "Molecular Volume", prompt: "Why can the volume occupied by gas particles no longer be ignored at higher gas densities?", hints: ["When particles are closer together, does their own volume become a larger or smaller fraction of the container?"], firstHint: 3,
    } },
  ],
};

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
  const [value, setValue] = useState(thermal ? 300 : 0.125);
  const [attractions, setAttractions] = useState(thermal);
  const [finite, setFinite] = useState(false);
  const [paused, setPaused] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const steps = investigations[kind];
  const step = steps[stepIndex];
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const focusNextStep = useRef(false);
  useEffect(() => {
    if (!focusNextStep.current) return;
    focusNextStep.current = false;
    stepHeading.current?.focus({ preventScroll: true });
  }, [stepIndex]);
  const question = step.question;
  const answerIndex = thermal ? stepIndex - 1 : stepIndex;
  const key = draftKey + ":" + kind;
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState("");
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);
  function saveAnswers(next: string[]) {
    if (demo) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveState("Saving…");
    saveTimer.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/level2", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            classCode: session.classCode,
            teamId: session.teamId,
            studentCode: session.studentCode,
            kind,
            answers: next,
          }),
        });
        setSaveState(response.ok ? "Saved to class wall" : "Save failed");
      } catch {
        setSaveState("Save failed");
      }
    }, 500);
  }
  function goTo(index: number) {
    focusNextStep.current = true;
    setStepIndex(index);
    setFinished(false);
    setAttractions(steps[index].attractions);
    setFinite(steps[index].finite);
    if ((!thermal && index > 0) || (thermal && index === 1)) setValue(thermal ? 300 : 0.125);
  }
  useEffect(() => {
    const saved = sessionStorage.getItem(key);
    if (saved) setAnswers(JSON.parse(saved));
    setPaused(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, [key]);
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
      <h4 tabIndex={-1} ref={stepHeading}>Step {stepIndex + 1} of {steps.length} · {step.title}</h4>
      <p>{step.instruction}</p>
      {question && <div className="repair-questions repair-current-question">
        <label><strong>Q{answerIndex + 1} · {question.title}</strong><span className="repair-prompt">{question.prompt}</span>
          <textarea rows={3} value={answers[answerIndex] ?? ""} placeholder="Write your answer…" onChange={(e) => {
            const next = Array.from({ length: 3 }, (_, i) => i === answerIndex ? e.target.value : (answers[i] ?? ""));
            setAnswers(next);
            sessionStorage.setItem(key, JSON.stringify(next));
            saveAnswers(next);
          }} />
        </label>
        {question.hints && question.firstHint !== undefined && <RevealHints hints={question.hints} first={question.firstHint} />}
      </div>}
      <div className="repair-step-actions">
        {stepIndex > 0 && <button type="button" onClick={() => goTo(stepIndex - 1)}>Previous step</button>}
        {stepIndex < steps.length - 1
          ? <button type="button" onClick={() => goTo(stepIndex + 1)}>Next step</button>
          : <button type="button" onClick={() => { setFinished(true); saveAnswers(answers); }}>Finish investigation</button>}
        {finished && <span role="status">{answers.filter((answer) => answer.trim()).length === 3 ? "Investigation complete · Answers saved and shared with the class data wall." : "Complete all three answers. Use Previous step to revisit earlier questions."}</span>}
      </div>
    </div>
    <p className="repair-note">Answers stay in this browser tab and are shared with the teacher data wall. {saveState && <span className="repair-save-status">{saveState}</span>}</p>
  </section>;
}

export default function ModelRepair({ draftKey, session, demo = false }: { draftKey: string; session: StudentIdentity; demo?: boolean }) {
  const [kind, setKind] = useState<keyof typeof investigations>("temperature");
  return <div className="repair-station">
    <header><p>LEVEL 02</p><h2>Model Repair Station</h2></header>
    <nav aria-label="Choose an investigation">
      <button aria-pressed={kind === "temperature"} onClick={() => setKind("temperature")}>Temperature</button>
      <button aria-pressed={kind === "density"} onClick={() => setKind("density")}>Density</button>
    </nav>
    <Investigation kind="temperature" active={kind === "temperature"} draftKey={draftKey} session={session} demo={demo} />
    <Investigation kind="density" active={kind === "density"} draftKey={draftKey} session={session} demo={demo} />
  </div>;
}
