"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgentResponse, AgentState, Question } from "@/types/agent";
import { marked } from "marked";

type Persisted = AgentState;

const STORAGE_KEY = "garden-agent-state-v1";

function loadState(): Persisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state: Persisted) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function Progress({ askedCount, totalApprox }: { askedCount: number; totalApprox: number }) {
  const pct = Math.min(100, Math.round((askedCount / totalApprox) * 100));
  return (
    <div className="progress" aria-label="progress">
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function Chips({ options, selected, onToggle }: { options: { id: string; label: string; hint?: string }[]; selected: string[]; onToggle: (id: string) => void; }) {
  return (
    <div className="chips">
      {options.map(opt => (
        <button key={opt.id} className={`chip ${selected.includes(opt.id) ? "selected" : ""}`} onClick={() => onToggle(opt.id)}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function QuestionCard({ q, value, setValue }: { q: Question; value: any; setValue: (v: any) => void; }) {
  return (
    <div className="panel card">
      <div className="card-header">
        <div>
          <div className="card-title">{q.title}</div>
          {q.description ? <div className="card-desc">{q.description}</div> : null}
        </div>
      </div>

      {q.type === "multi" && q.options ? (
        <Chips
          options={q.options}
          selected={Array.isArray(value) ? value : []}
          onToggle={(id) => {
            const arr = Array.isArray(value) ? value : [];
            setValue(arr.includes(id) ? arr.filter((x: string) => x !== id) : [...arr, id]);
          }}
        />
      ) : null}

      {q.type === "single" && q.options ? (
        <div className="chips">
          {q.options.map(opt => (
            <button key={opt.id} className={`chip ${value === opt.id ? "selected" : ""}`} onClick={() => setValue(opt.id)}>
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}

      {q.type === "scale" ? (
        <div className="vstack">
          <input className="input" type="range" min={q.min ?? 1} max={q.max ?? 5} step={q.step ?? 1} value={Number(value ?? ((q.min ?? 1) + (q.max ?? 5)) / 2)} onChange={(e) => setValue(Number(e.target.value))} />
          <div className="hstack" style={{ justifyContent: "space-between", color: "var(--muted)", fontSize: 13 }}>
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      ) : null}

      {q.type === "text" ? (
        <textarea className="textarea" placeholder="Type your thoughts..." value={String(value ?? "")} onChange={(e) => setValue(e.target.value)} />
      ) : null}
    </div>
  );
}

export default function Page() {
  const [state, setState] = useState<AgentState>(() => loadState() || { answers: {}, asked: [], completed: false });
  const [question, setQuestion] = useState<Question | null>(null);
  const [reason, setReason] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string>("");
  const approxTotal = 10;

  useEffect(() => { saveState(state); }, [state]);

  const askNext = useCallback(async (s: AgentState) => {
    setBusy(true);
    try {
      const resp = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: s, ask: "next" }) });
      const data: AgentResponse = await resp.json();
      setQuestion(data.nextQuestion ?? null);
      setReason(data.reason || "");
      setState(prev => ({ ...prev, completed: data.state.completed }));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    // Initialize first question
    if (!question && !state.completed) {
      askNext(state);
    }
  }, [question, state.completed, askNext, state]);

  const currentValue = useMemo(() => (question ? state.answers[question.id] : undefined), [state.answers, question]);

  const setCurrentValue = (v: any) => {
    if (!question) return;
    setState(s => ({ ...s, answers: { ...s.answers, [question.id]: v } }));
  };

  const next = async () => {
    if (!question) return;
    const asked = state.asked.includes(question.id) ? state.asked : [...state.asked, question.id];
    const newState = { ...state, asked };
    setState(newState);
    await askNext(newState);
  };

  const back = () => {
    if (!state.asked.length) return;
    const prevId = state.asked[state.asked.length - 1];
    // naive: allow revisiting by removing last asked id and re-asking
    const asked = state.asked.slice(0, -1);
    setState(s => ({ ...s, asked }));
    setQuestion({ id: prevId, title: "Review previous answer", type: typeof state.answers[prevId] === "number" ? "scale" : Array.isArray(state.answers[prevId]) ? "multi" : "text" });
  };

  const reset = () => {
    const fresh: AgentState = { answers: {}, asked: [], completed: false };
    setSummary("");
    setState(fresh);
    setQuestion(null);
  };

  const exportPlan = async () => {
    setBusy(true);
    try {
      const resp = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state, ask: "summary" }) });
      const data: AgentResponse = await resp.json();
      const md = data.summaryMarkdown || "";
      setSummary(md);
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "garden-concept.md";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  const progressAsked = state.asked.length + (question ? 1 : 0);

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <div className="panel" style={{ padding: 16 }}>
        <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Your Garden Brief</div>
            <div className="card-desc">An adaptive agent helps refine your ideal garden style, plants, usage, and feel.</div>
          </div>
          <div className="hstack">
            <button className="button" onClick={reset} disabled={busy}>Reset</button>
            <button className="button primary" onClick={exportPlan} disabled={busy || !state.asked.length}>Export Plan</button>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Progress askedCount={progressAsked} totalApprox={approxTotal} />
        </div>
      </div>

      {question && !state.completed ? (
        <QuestionCard q={question} value={currentValue} setValue={setCurrentValue} />
      ) : null}

      <div className="hstack" style={{ justifyContent: "space-between" }}>
        <button className="button" onClick={back} disabled={busy || state.asked.length === 0}>Back</button>
        <div className="hstack" style={{ gap: 8 }}>
          <span className="kbd">{reason || ""}</span>
          <button className="button primary" onClick={next} disabled={busy || !question}>Next</button>
        </div>
      </div>

      {state.completed && !summary ? (
        <div className="panel card">
          <div className="card-title" style={{ marginBottom: 8 }}>You?re all set</div>
          <div className="card-desc">Export a tailored plan now, or adjust answers to refine further.</div>
        </div>
      ) : null}

      {summary ? (
        <div className="panel card summary">
          <div className="card-title" style={{ marginBottom: 8 }}>Concept Summary</div>
          <div dangerouslySetInnerHTML={{ __html: marked.parse(summary) as string }} />
        </div>
      ) : null}
    </div>
  );
}
