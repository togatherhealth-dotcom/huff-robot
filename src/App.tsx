import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Huff from "./Huff";
import { SCRIPT, lineFor, type Condition, type Expression, type Gaze, type Option, type Step } from "./script";
import { defaultVoice, loadVoices, speak, stopSpeaking } from "./speech";
import {
  clearSessions, download, loadSessions, loadSettings, newId, nextCondition, saveSession, saveSettings, toCSV, type Session,
} from "./data";

type Phase = "setup" | "consent" | "intro" | "chat" | "done" | "declined";
type Msg = { who: "huff" | "you"; text: string };
type RatingStep = Extract<Step, { kind: "rating" }>;

const DEMO = new URLSearchParams(location.search).has("demo") || import.meta.env.VITE_DEMO === "true";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const indexOf = (id: string) => SCRIPT.findIndex((s) => s.id === id);

export default function App() {
  const [phase, setPhase] = useState<Phase>(DEMO ? "intro" : "setup");
  const [condition, setCondition] = useState<Condition>(DEMO ? "apology" : nextCondition());
  const [pid, setPid] = useState(DEMO ? "demo" : newId());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState(loadSettings());
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    loadVoices().then((v) => {
      setVoices(v);
      setSettings((s) => (s.voice && v.some((x) => x.name === s.voice) ? s : { ...s, voice: defaultVoice(v)?.name ?? null }));
    });
  }, []);
  useEffect(() => saveSettings(settings), [settings]);

  const startNew = () => {
    setCondition(nextCondition());
    setPid(newId());
    setPhase("setup");
  };

  return (
    <div className="app">
      {phase === "setup" && (
        <Setup
          pid={pid} setPid={setPid} condition={condition} setCondition={setCondition}
          voices={voices} settings={settings} setSettings={setSettings}
          onStart={() => setPhase("consent")}
        />
      )}
      {phase === "consent" && <Consent onAgree={() => setPhase("intro")} onDecline={() => setPhase("declined")} />}
      {phase === "declined" && (
        <Centered>
          <h1>Thank you</h1>
          <p>No problem at all. Nothing has been recorded.</p>
          <ResearcherLink onClick={startNew} />
        </Centered>
      )}
      {phase === "intro" && (
        <Intro
          demo={DEMO} condition={condition} setCondition={setCondition}
          onStart={() => { setRunKey((k) => k + 1); setPhase("chat"); }}
        />
      )}
      {phase === "chat" && (
        <Chat
          key={runKey} pid={pid} condition={condition} voice={settings.voice} muted={settings.muted}
          onDone={() => setPhase("done")}
        />
      )}
      {phase === "done" && (
        <Centered>
          <h1>Thank you</h1>
          {DEMO ? (
            <>
              <p>
                You heard the <strong>{condition}</strong> version of Huff&apos;s response to its mistake. In the study, half the
                participants hear each version.
              </p>
              <button className="primary" onClick={() => { setCondition(condition === "apology" ? "explanation" : "apology"); setPhase("intro"); }}>
                Try the {condition === "apology" ? "explanation" : "apology"} version
              </button>
            </>
          ) : (
            <>
              <p>The conversation is over. Please let the researcher know you have finished.</p>
              <ResearcherLink onClick={startNew} />
            </>
          )}
        </Centered>
      )}
    </div>
  );
}

/* ---------------- Facilitator setup ---------------- */

function Setup(props: {
  pid: string; setPid: (v: string) => void; condition: Condition; setCondition: (c: Condition) => void;
  voices: SpeechSynthesisVoice[]; settings: { voice: string | null; muted: boolean };
  setSettings: (s: { voice: string | null; muted: boolean }) => void; onStart: () => void;
}) {
  const { pid, setPid, condition, setCondition, voices, settings, setSettings, onStart } = props;
  const [sessions, setSessions] = useState<Session[]>(loadSessions());
  const [confirmClear, setConfirmClear] = useState(false);
  const real = sessions.filter((s) => !s.demo);
  const finished = real.filter((s) => s.finished);
  const count = (c: Condition) => finished.filter((s) => s.condition === c).length;

  return (
    <div className="setup">
      <header>
        <h1>Huff</h1>
        <p className="muted">Researcher setup. Fill this in before turning the laptop to the participant.</p>
      </header>

      <div className="setup-grid">
        <label className="field">
          Participant code
          <input value={pid} onChange={(e) => setPid(e.target.value)} />
        </label>

        <label className="field">
          Condition
          <select value={condition} onChange={(e) => setCondition(e.target.value as Condition)}>
            <option value="apology">Apology</option>
            <option value="explanation">Explanation</option>
          </select>
          <span className="hint">Suggested automatically so the two groups alternate.</span>
        </label>

        <label className="field">
          Huff&apos;s voice
          <select value={settings.voice ?? ""} onChange={(e) => setSettings({ ...settings, voice: e.target.value })}>
            {voices.length === 0 && <option value="">No voices found</option>}
            {voices.map((v) => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
          <span className="hint">Keep the same voice for every session.</span>
        </label>

        <div className="row">
          <button onClick={() => speak("Hi, I'm Huff. This is how I sound.", settings.voice, false)}>Test voice</button>
          <label className="check">
            <input type="checkbox" checked={settings.muted} onChange={(e) => setSettings({ ...settings, muted: e.target.checked })} />
            Mute (for rehearsing only)
          </label>
        </div>
      </div>

      <div className="stats">
        <p>
          Completed sessions: <strong>{finished.length}</strong> (apology {count("apology")}, explanation {count("explanation")})
        </p>
        <div className="row">
          <button onClick={() => download(`huff-sessions_${new Date().toISOString().slice(0, 10)}.csv`, toCSV(real))}>
            Export data as CSV
          </button>
          {confirmClear ? (
            <>
              <button className="danger" onClick={() => { clearSessions(); setSessions([]); setConfirmClear(false); }}>
                Yes, delete all session data
              </button>
              <button onClick={() => setConfirmClear(false)}>Keep it</button>
            </>
          ) : (
            <button onClick={() => setConfirmClear(true)}>Delete all session data</button>
          )}
        </div>
      </div>

      <button className="primary big" onClick={onStart}>Start session {pid}</button>
    </div>
  );
}

/* ---------------- Participant screens ---------------- */

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="centered">{children}</main>;
}

function ResearcherLink({ onClick }: { onClick: () => void }) {
  return <button className="researcher" onClick={onClick}>Researcher: next session</button>;
}

function Consent({ onAgree, onDecline }: { onAgree: () => void; onDecline: () => void }) {
  return (
    <Centered>
      <h1>Before we start</h1>
      <p>This is a short study about how people talk with a robot assistant.</p>
      <p>
        You will have a brief conversation with Huff, which takes about five minutes, answer a few questions, and then talk
        briefly with the researcher.
      </p>
      <p>
        Taking part is voluntary, and you can stop at any time without giving a reason. No names or identifying details are
        recorded. Your answers are stored under an anonymous code and may be reported only as combined results.
      </p>
      <p>You need to be 18 or older to take part.</p>
      <div className="row">
        <button className="primary" onClick={onAgree}>I agree and want to take part</button>
        <button onClick={onDecline}>I don&apos;t want to take part</button>
      </div>
    </Centered>
  );
}

function Intro(props: { demo: boolean; condition: Condition; setCondition: (c: Condition) => void; onStart: () => void }) {
  return (
    <Centered>
      <Huff expr="happy" gaze="user" speaking={false} waving={false} />
      <h1>Meet Huff</h1>
      <div className="scenario">
        <p><strong>Imagine this:</strong> it is Saturday, just after one o&apos;clock, and you are spending the day in Salzburg.</p>
        <p>Huff, a robot assistant, will help you plan your afternoon.</p>
      </div>
      <p>Huff speaks out loud, so please turn your sound on. Reply by clicking one of the answers shown.</p>
      <p>Two cards next to Huff show the bus timetable and the cable car information. You can check them at any time.</p>
      {props.demo && (
        <div className="row demo-pick">
          <span>Version:</span>
          {(["apology", "explanation"] as Condition[]).map((c) => (
            <button key={c} className={props.condition === c ? "selected" : ""} onClick={() => props.setCondition(c)}>
              {c === "apology" ? "Apology" : "Explanation"}
            </button>
          ))}
        </div>
      )}
      <button className="primary big" onClick={props.onStart}>Start the conversation</button>
    </Centered>
  );
}

/* ---------------- The conversation ---------------- */

function Chat({ pid, condition, voice, muted, onDone }: { pid: string; condition: Condition; voice: string | null; muted: boolean; onDone: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [expr, setExpr] = useState<Expression>("neutral");
  const [gaze, setGaze] = useState<Gaze>("user");
  const [speaking, setSpeaking] = useState(false);
  const [waving, setWaving] = useState(false);
  const [typing, setTyping] = useState(false);
  const [options, setOptions] = useState<Option[] | null>(null);
  const [rating, setRating] = useState<RatingStep | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const choose = useRef<(o: Option) => void>(() => {});
  const rate = useRef<(v: number) => void>(() => {});

  const add = useCallback((m: Msg) => setMsgs((prev) => [...prev, m]), []);


  useEffect(() => {
    let cancelled = false;
    const session: Session = {
      id: pid, condition, started: new Date().toISOString(), voice: voice ?? "none", choices: [], step_ms: [], demo: DEMO,
    };
    const t0 = performance.now();
    let mark = t0;
    const lap = () => {
      const now = performance.now();
      session.step_ms.push(Math.round(now - mark));
      mark = now;
    };

    (async () => {
      await sleep(600);
      let i = 0;
      while (i < SCRIPT.length && !cancelled) {
        const s = SCRIPT[i];
        if (s.kind === "say") {
          setExpr(s.expr);
          setGaze(s.gaze ?? "user");
          setHighlight(s.gaze === "card" ? (/bus|14:/.test(lineFor(s, condition)) ? "bus" : "cable") : null);
          setTyping(true);
          await sleep(450);
          if (cancelled) return;
          setTyping(false);
          const line = lineFor(s, condition);
          add({ who: "huff", text: line });
          if (s.wave) setWaving(true);
          await speak(line, voice, muted, () => setSpeaking(true));
          setSpeaking(false);
          if (s.gaze === "card") setGaze("user");
          await sleep(300);
          setWaving(false);
          i++;
        } else if (s.kind === "options") {
          const picked = await new Promise<Option>((resolve) => {
            choose.current = resolve;
            setOptions(s.options);
          });
          if (cancelled) return;
          setOptions(null);
          add({ who: "you", text: picked.label });
          session.choices.push(picked.label);
          Object.assign(session, picked.log ?? {});
          lap();
          saveSession(session);
          await sleep(700);
          i = picked.goto ? indexOf(picked.goto) : i + 1;
        } else if (s.kind === "rating") {
          const v = await new Promise<number>((resolve) => {
            rate.current = resolve;
            setRating(s);
          });
          if (cancelled) return;
          setRating(null);
          (session as unknown as Record<string, unknown>)[s.key] = v;
          lap();
          saveSession(session);
          await sleep(300);
          i++;
        } else if (s.kind === "pause") {
          setExpr(s.expr);
          setGaze(s.gaze ?? "user");
          setHighlight(null);
          await sleep(s.ms);
          i++;
        } else if (s.kind === "goto") {
          i = indexOf(s.target);
        } else if (s.kind === "end") {
          session.finished = new Date().toISOString();
          session.total_ms = Math.round(performance.now() - t0);
          saveSession(session);
          await sleep(500);
          if (!cancelled) onDone();
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const last = msgs[msgs.length - 1];
  const huffLine = [...msgs].reverse().find((m) => m.who === "huff");

  // Both information cards always have exactly the same width and height.
  const busRef = useRef<HTMLElement>(null);
  const cableRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const a = busRef.current, b = cableRef.current;
    if (!a || !b) return;
    const match = () => {
      a.style.minHeight = b.style.minHeight = "";
      a.style.width = b.style.width = "";
      const h = Math.max(a.offsetHeight, b.offsetHeight);
      const w = Math.min(a.offsetWidth, b.offsetWidth);
      a.style.minHeight = b.style.minHeight = `${h}px`;
      a.style.width = b.style.width = `${w}px`;
    };
    match();
    window.addEventListener("resize", match);
    document.fonts?.ready.then(match);
    return () => window.removeEventListener("resize", match);
  }, [rating]);

  if (rating) {
    return (
      <div className="questionnaire">
        <Rating step={rating} onSubmit={(v) => rate.current(v)} />
      </div>
    );
  }

  const busCard = (
    <article ref={busRef} className={`card ${highlight === "bus" ? "lit" : ""}`}>
      <h2>Bus timetable, line 25</h2>
      <p className="muted">Salzburg Hauptbahnhof to Untersberg</p>
      <div className="tt">
        <div className="tt-row">
          <span className="day">Monday to Friday</span>
          <span className="times"><span>13:10</span><span>14:10</span><span>15:10</span></span>
        </div>
        <div className="tt-row">
          <span className="day">Saturday</span>
          <span className="times"><span>13:40</span><span>14:40</span><span>15:40</span></span>
        </div>
      </div>
    </article>
  );
  const cableCard = (
    <article ref={cableRef} className={`card ${highlight === "cable" ? "lit" : ""}`}>
      <h2>Untersberg cable car</h2>
      <p>Saturday: every 30 minutes</p>
      <p>Last ride up 16:30</p>
      <p>Last ride down 17:00</p>
      <p>Return ticket: 30 euros</p>
    </article>
  );

  return (
    <div className="stage">
      <p className="context">Saturday, 13:05, Salzburg</p>
      <aside className="side left">{busCard}</aside>
      <section className="scene" aria-live="polite">
        <div className="huff-box">
          <Huff expr={expr} gaze="user" speaking={speaking} waving={waving} />
        </div>
        <div className="caption">
          {last?.who === "you" ? (
            <>
              <span className="who">You</span>
              <p className="said you">{last.text}</p>
            </>
          ) : huffLine && !typing ? (
            <>
              <span className="who">Huff</span>
              <p className="said">{huffLine.text}</p>
            </>
          ) : null}
        </div>
        <div className="options">
          {options?.map((o) => (
            <button key={o.label} onClick={() => choose.current(o)}>{o.label}</button>
          ))}
        </div>
      </section>
      <aside className="side right">{cableCard}</aside>
    </div>
  );
}

function Rating({ step, onSubmit }: { step: RatingStep; onSubmit: (v: number) => void }) {
  const [value, setValue] = useState<number | null>(null);
  const [error, setError] = useState(false);
  return (
    <div className="rating">
      <p className="q">{step.question}</p>
      <div className="scale" role="radiogroup" aria-label={step.question}>
        <span className="end">Not at all</span>
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <button
            key={n} role="radio" aria-checked={value === n}
            className={value === n ? "selected" : ""}
            onClick={() => { setValue(n); setError(false); }}
          >
            {n}
          </button>
        ))}
        <span className="end">Completely</span>
      </div>
      {error && <p className="error">Choose a number first.</p>}
      <button className="primary" onClick={() => (value === null ? setError(true) : onSubmit(value))}>Continue</button>
    </div>
  );
}
