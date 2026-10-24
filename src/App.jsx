import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Award, Check, ChevronDown, Clock3, Command, Download, Keyboard, Moon, RotateCcw, Sun, Target, Trophy, Zap } from "lucide-react";
import { jsPDF } from "jspdf";

const PASSAGES = {
  easy: [
    "Small steps every day can lead to big changes. Stay patient, keep practicing, and enjoy the progress you make along the way.",
    "A good habit begins with a simple choice. Give yourself time to learn, make mistakes, and try again with a calm mind.",
    "The morning sun filled the quiet room with light. I opened my notebook, made a plan, and started working on one task."
  ],
  medium: [
    "Consistency is often more important than intensity. A focused practice session, repeated regularly, can improve both confidence and performance over time.",
    "Technology makes it easier to share ideas, learn new skills, and work together. The best tools are useful, reliable, and simple to understand.",
    "Clear communication depends on careful thought and thoughtful listening. Take a moment to organize your ideas before sharing them with others."
  ],
  hard: [
    "Reliable software is built through iteration: developers test assumptions, investigate unexpected behavior, and refine solutions without losing sight of the user's needs.",
    "Curiosity encourages us to question familiar routines, compare alternative explanations, and discover patterns that might otherwise remain unnoticed.",
    "Precision matters when deadlines are tight; however, rushing without a plan often creates avoidable errors that require even more time to correct."
  ]
};

const formatTime = (n) => `${Math.floor(n / 60).toString().padStart(2, "0")}:${Math.max(0, n % 60).toString().padStart(2, "0")}`;
const average = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("keyflow-theme") || "dark");
  const [duration, setDuration] = useState(60);
  const [difficulty, setDifficulty] = useState("medium");
  const [passageIndex, setPassageIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [remaining, setRemaining] = useState(60);
  const [name, setName] = useState("");
  const [lastResult, setLastResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [notice, setNotice] = useState("");
  const inputRef = useRef(null);
  const passage = PASSAGES[difficulty][passageIndex % PASSAGES[difficulty].length];

  useEffect(() => { localStorage.setItem("keyflow-theme", theme); }, [theme]);
  useEffect(() => { setRemaining(duration); }, [duration]);

  const correctChars = useMemo(() => {
    let correct = 0;
    for (let i = 0; i < typed.length; i++) if (typed[i] === passage[i]) correct++;
    return correct;
  }, [typed, passage]);
  const errors = typed.length - correctChars;
  const elapsed = duration - remaining;
  const wpm = elapsed > 0 ? (correctChars / 5) / (elapsed / 60) : 0;
  const accuracy = typed.length ? (correctChars / typed.length) * 100 : 100;
  const progress = Math.min(100, (typed.length / passage.length) * 100);

  const saveResult = useCallback(async (finalTyped = typed, finalRemaining = remaining) => {
    const spent = Math.max(1, duration - finalRemaining);
    let correct = 0;
    for (let i = 0; i < finalTyped.length; i++) if (finalTyped[i] === passage[i]) correct++;
    const result = {
      name: name.trim() || "Guest",
      wpm: Math.round(((correct / 5) / (spent / 60)) * 10) / 10,
      accuracy: finalTyped.length ? Math.round((correct / finalTyped.length) * 1000) / 10 : 100,
      errors: finalTyped.length - correct,
      duration: spent,
      difficulty,
      createdAt: new Date().toISOString()
    };
    setLastResult(result);
    setFinished(true);
    setStarted(false);
    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result)
      });
      if (response.ok) {
        const data = await response.json();
        result.id = data.result.id;
        setLastResult({ ...result });
        setHistory((old) => [data.result, ...old.filter((r) => r.id !== data.result.id)].slice(0, 10));
      } else {
        setNotice("Result shown locally. The API did not save it.");
      }
    } catch {
      setNotice("Result shown locally. Start the API server to save test history.");
    }
  }, [typed, remaining, duration, passage, name, difficulty]);

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(timer);
          // finish in the effect below after the state update
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, finished]);

  useEffect(() => {
    if (started && remaining === 0 && !finished) saveResult(typed, 0);
  }, [remaining, started, finished, saveResult, typed]);

  const reset = useCallback((newPassage = false) => {
    setTyped("");
    setStarted(false);
    setFinished(false);
    setRemaining(duration);
    setLastResult(null);
    setNotice("");
    if (newPassage) setPassageIndex((i) => i + 1);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [duration]);

  const onType = (event) => {
    if (finished) return;
    const value = event.target.value.slice(0, passage.length);
    if (!started && value.length) setStarted(true);
    setTyped(value);
    if (value.length >= passage.length) {
      // State is captured directly so finishing uses the last typed character.
      setStarted(false);
      setFinished(true);
      const correct = [...value].reduce((n, char, i) => n + (char === passage[i] ? 1 : 0), 0);
      const spent = Math.max(1, duration - remaining);
      const result = {
        name: name.trim() || "Guest",
        wpm: Math.round(((correct / 5) / (spent / 60)) * 10) / 10,
        accuracy: value.length ? Math.round((correct / value.length) * 1000) / 10 : 100,
        errors: value.length - correct,
        duration: spent,
        difficulty,
        createdAt: new Date().toISOString()
      };
      setLastResult(result);
      fetch("/api/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.result) { result.id = data.result.id; setLastResult({ ...result }); setHistory((old) => [data.result, ...old].slice(0, 10)); } })
        .catch(() => setNotice("Result shown locally. Start the API server to save test history."));
    }
  };

  const startAgain = (next = false) => reset(next);

  const downloadCertificate = () => {
    if (!lastResult) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const W = 297, H = 210;
    doc.setFillColor(17, 22, 34); doc.rect(0, 0, W, H, "F");
    doc.setDrawColor(115, 226, 176); doc.setLineWidth(1.2); doc.rect(8, 8, W - 16, H - 16);
    doc.setDrawColor(65, 80, 101); doc.setLineWidth(0.35); doc.rect(13, 13, W - 26, H - 26);
    doc.setTextColor(115, 226, 176); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("KEYFLOW • TYPING PERFORMANCE", W / 2, 32, { align: "center" });
    doc.setTextColor(248, 250, 252); doc.setFontSize(30); doc.text("CERTIFICATE OF ACHIEVEMENT", W / 2, 57, { align: "center" });
    doc.setTextColor(177, 188, 205); doc.setFont("helvetica", "normal"); doc.setFontSize(13);
    doc.text("This certificate is presented to", W / 2, 77, { align: "center" });
    doc.setTextColor(115, 226, 176); doc.setFont("helvetica", "bold"); doc.setFontSize(27);
    doc.text((lastResult.name || "Guest").slice(0, 40), W / 2, 94, { align: "center" });
    doc.setTextColor(220, 226, 237); doc.setFont("helvetica", "normal"); doc.setFontSize(12);
    doc.text("for completing a KeyFlow typing speed test with the following result", W / 2, 108, { align: "center" });
    const metrics = [
      [`${lastResult.wpm}`, "WORDS PER MINUTE"],
      [`${lastResult.accuracy}%`, "ACCURACY"],
      [`${lastResult.errors}`, "ERRORS"]
    ];
    metrics.forEach((m, i) => {
      const x = 75 + i * 74;
      doc.setTextColor(248, 250, 252); doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text(m[0], x, 135, { align: "center" });
      doc.setTextColor(151, 166, 187); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(m[1], x, 143, { align: "center" });
    });
    doc.setTextColor(177, 188, 205); doc.setFontSize(10);
    doc.text(`Difficulty: ${lastResult.difficulty}  •  Test duration: ${lastResult.duration}s`, W / 2, 161, { align: "center" });
    doc.text(`Issued: ${new Date(lastResult.createdAt || Date.now()).toLocaleDateString()}`, W / 2, 171, { align: "center" });
    doc.setTextColor(115, 226, 176); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
    doc.text(`Certificate ID: ${lastResult.id || "LOCAL-" + Date.now().toString(36).toUpperCase()}`, W / 2, 184, { align: "center" });
    doc.save("keyflow-typing-certificate.pdf");
  };

  const loadHistory = async () => {
    try {
      const response = await fetch("/api/results");
      if (response.ok) {
        const data = await response.json();
        setHistory(data.results || []);
      }
    } catch { /* API is optional while using a static preview. */ }
  };
  useEffect(() => { loadHistory(); }, []);

  return (
    <div className={`app ${theme}`}>
      <header className="topbar">
        <a className="brand" href="#" aria-label="KeyFlow home">
          <span className="brand-mark"><Keyboard size={22} /></span>
          <span>keyflow<span className="brand-dot">.</span><small>TYPE WITH PURPOSE</small></span>
        </a>
        <nav className="navlinks"><a href="#test">Typing test</a><a href="#how">How it works</a><a href="#history">Recent results</a></nav>
        <button className="icon-button theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><span className="live-dot" /> YOUR NEXT PERSONAL BEST STARTS HERE</div>
          <h1>Find your <span>flow.</span></h1>
          <p className="hero-copy">A little practice. A lot of progress. Test your typing speed, sharpen your accuracy, and celebrate every milestone.</p>
          <div className="hero-pills"><span><Zap size={14} /> Live WPM</span><span><Target size={14} /> Accuracy tracking</span><span><Award size={14} /> PDF certificate</span></div>
        </section>

        <section id="test" className="test-panel">
          <div className="panel-top">
            <div><div className="section-kicker">THE TYPING LAB</div><h2>Ready when you are.</h2></div>
            <div className={`status-chip ${started ? "is-live" : ""}`}><span />{finished ? "Test complete" : started ? "Test in progress" : "Waiting to start"}</div>
          </div>

          <div className="settings-row">
            <div className="setting-group"><span className="setting-label">DURATION</span><div className="segmented">
              {[15, 30, 60, 120].map((s) => <button key={s} disabled={started} className={duration === s ? "selected" : ""} onClick={() => { setDuration(s); setRemaining(s); }}>{s}s</button>)}
            </div></div>
            <div className="setting-group"><span className="setting-label">DIFFICULTY</span><div className="segmented">
              {["easy", "medium", "hard"].map((d) => <button key={d} disabled={started} className={difficulty === d ? "selected" : ""} onClick={() => { setDifficulty(d); setPassageIndex(0); reset(); }}>{d}</button>)}
            </div></div>
            <label className="name-field"><span className="setting-label">CERTIFICATE NAME</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Your name (optional)" /></label>
          </div>

          <div className="metrics">
            <div className="metric metric-primary"><span className="metric-icon"><Zap size={17}/></span><div><span className="metric-label">WORDS / MIN</span><strong>{Math.round(wpm)}</strong></div><small>WPM</small></div>
            <div className="metric"><span className="metric-icon"><Target size={17}/></span><div><span className="metric-label">ACCURACY</span><strong>{typed.length ? accuracy.toFixed(1) : "100"}<i>%</i></strong></div></div>
            <div className="metric"><span className="metric-icon"><Command size={17}/></span><div><span className="metric-label">ERRORS</span><strong>{errors}</strong></div></div>
            <div className="metric"><span className="metric-icon"><Clock3 size={17}/></span><div><span className="metric-label">TIME LEFT</span><strong>{formatTime(remaining)}</strong></div></div>
          </div>

          <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
          <div className={`typing-box ${finished ? "complete" : ""}`} onClick={() => inputRef.current?.focus()}>
            <div className="typing-text" aria-hidden="true">
              {[...passage].map((char, i) => {
                let cls = "";
                if (i < typed.length) cls = typed[i] === char ? "correct" : "incorrect";
                else if (i === typed.length && !finished) cls = "cursor";
                return <span key={`${passageIndex}-${i}`} className={cls}>{char}</span>;
              })}
            </div>
            <textarea
              ref={inputRef}
              className="typing-input"
              value={typed}
              onChange={onType}
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              disabled={finished}
              aria-label="Type the passage shown above"
              spellCheck="false"
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              placeholder="Click here and start typing..."
            />
            {!started && !finished && <div className="typing-hint"><Keyboard size={15}/> Click the text area and start typing <kbd>Tab</kbd> + <kbd>Enter</kbd> to restart</div>}
          </div>

          <div className="test-actions">
            <div className="helper-copy"><span className="keycap">↵</span> Type the passage as accurately as you can.</div>
            <div className="button-row">
              <button className="button button-secondary" onClick={() => startAgain(true)}><RotateCcw size={16}/> New passage</button>
              {!finished ? <button className="button button-primary" onClick={() => typed.length ? saveResult() : inputRef.current?.focus()}>{typed.length ? "Finish test" : "Start typing"} <span>→</span></button> : <button className="button button-primary" onClick={() => startAgain(true)}>Try again <RotateCcw size={15}/></button>}
            </div>
          </div>
          {notice && <div className="notice">{notice}</div>}
        </section>

        {finished && lastResult && <section className="results-panel">
          <div className="result-heading"><div><div className="section-kicker">YOUR PERFORMANCE</div><h2>Nice work, {lastResult.name || "typist"}.</h2><p>Every session is progress. Here's how this one went.</p></div><div className="result-award"><Award size={27}/></div></div>
          <div className="result-grid">
            <div className="result-card"><span>WPM</span><strong>{lastResult.wpm}</strong><small>Words per minute</small></div>
            <div className="result-card"><span>ACCURACY</span><strong>{lastResult.accuracy}%</strong><small>Correct characters</small></div>
            <div className="result-card"><span>ERRORS</span><strong>{lastResult.errors}</strong><small>Incorrect characters</small></div>
            <div className="result-card"><span>DURATION</span><strong>{lastResult.duration}s</strong><small>Time spent typing</small></div>
          </div>
          <div className="certificate-cta"><div className="certificate-icon"><Award size={23}/></div><div className="certificate-copy"><strong>Your effort deserves a certificate.</strong><span>Generate a printable PDF with your name and typing stats.</span></div><button className="button button-primary" onClick={downloadCertificate}><Download size={16}/> Download PDF</button></div>
        </section>}

        <section id="how" className="how-section">
          <div className="section-kicker">SIMPLE BY DESIGN</div><h2>Three steps. One sharper you.</h2>
          <div className="steps-grid">
            <article className="step-card"><div className="step-number">01</div><div className="step-icon"><Keyboard size={21}/></div><h3>Type naturally</h3><p>Choose your duration and difficulty, then type the passage at your own pace.</p></article>
            <article className="step-card"><div className="step-number">02</div><div className="step-icon"><Trophy size={21}/></div><h3>See your stats</h3><p>Get your words per minute, accuracy, and errors as you type and at the finish.</p></article>
            <article className="step-card"><div className="step-number">03</div><div className="step-icon"><Award size={21}/></div><h3>Celebrate progress</h3><p>Download a personalized PDF certificate and come back to beat your best.</p></article>
          </div>
        </section>

        <section id="history" className="history-section">
          <div className="history-heading"><div><div className="section-kicker">RECENT SESSIONS</div><h2>Your practice trail.</h2></div><button className="text-button" onClick={loadHistory}>Refresh <RotateCcw size={14}/></button></div>
          {history.length ? <div className="history-list">{history.slice(0, 5).map((r) => <div className="history-row" key={r.id}><div className="history-badge"><Check size={16}/></div><div className="history-main"><strong>{r.name || "Guest"}</strong><span>{new Date(r.createdAt).toLocaleString()} · {r.difficulty}</span></div><div className="history-stat"><strong>{r.wpm}</strong><span>WPM</span></div><div className="history-stat"><strong>{r.accuracy}%</strong><span>Accuracy</span></div></div>)}</div> : <div className="empty-history"><div className="empty-icon"><Clock3 size={21}/></div><strong>Your story starts with one test.</strong><span>Finish a session and your recent results will appear here.</span></div>}
        </section>
      </main>

      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><Keyboard size={18}/></span><span>keyflow<span className="brand-dot">.</span></span></a><span>Made for progress, one keystroke at a time.</span><span className="footer-right">No account needed · Your pace, your progress</span></footer>
    </div>
  );
}
