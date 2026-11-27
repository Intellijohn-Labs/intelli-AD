"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { COMPANY } from "@/lib/company";
import { answer, CHIPS, openingGreeting, teaserFor, timeGreeting, waLink, type RoboLang } from "@/lib/robo-kb";
import { cn } from "@/lib/utils";

type Mood = "idle" | "happy" | "thinking";
type Pose = "home" | "banana" | "tea" | "hang" | "run";
interface Msg { id: number; from: "bot" | "me"; text: string; human?: boolean }

/** Robo-Monkey: a cute cybernetic monkey (metal ears, glowing LED eyes and antenna, articulated tail). `pose` drives the idle show: snacking, hanging, running. Transparent, no frame. */
function RoboMonkey({ mood, pose = "home", size = 56 }: { mood: Mood; pose?: Pose; size?: number }) {
  const happy = mood === "happy" || pose === "banana" || pose === "tea";
  return (
    <svg viewBox="0 0 80 100" width={size} height={size * 1.25} role="img" aria-label="Robo, the AI Ad Manager helper" className={cn("mk overflow-visible", `robo-pose-${pose}`, mood === "happy" && pose === "home" && "robo-happy")}>
      <ellipse cx="40" cy="97" rx="15" ry="2.4" fill="rgba(0,0,0,0.28)" className="robo-shadow" />
      {/* articulated tail: fur core with metal joints and a glowing tip */}
      <g className="mk-tail"><path d="M52 80 C 72 84, 78 64, 66 57 C 60 54, 55 58, 59 63" fill="none" stroke="#7A4B2A" strokeWidth="5" strokeLinecap="round" /><path d="M52 80 C 72 84, 78 64, 66 57 C 60 54, 55 58, 59 63" fill="none" stroke="#8C95A8" strokeWidth="5.4" strokeLinecap="butt" strokeDasharray="1.6 7" /><circle cx="59" cy="63" r="3" fill="#5CF2FF" style={{ filter: "drop-shadow(0 0 3px #5CF2FF)" }} /></g>
      <g className="mk-legL"><rect x="28" y="76" width="8" height="15" rx="4" fill="#7A4B2A" /><ellipse cx="32" cy="92" rx="7" ry="3.6" fill="#8C95A8" /></g>
      <g className="mk-legR"><rect x="44" y="76" width="8" height="15" rx="4" fill="#7A4B2A" /><ellipse cx="48" cy="92" rx="7" ry="3.6" fill="#8C95A8" /></g>
      <rect x="24" y="52" width="32" height="28" rx="11" fill="#7A4B2A" />
      <ellipse cx="40" cy="68" rx="11" ry="9" fill="#F3D9B1" /><circle cx="40" cy="67" r="2.6" fill="#5CF2FF" style={{ filter: "drop-shadow(0 0 3px #5CF2FF)" }} />
      <g className="mk-armL"><rect x="14" y="54" width="8" height="20" rx="4" fill="#7A4B2A" /><circle cx="18" cy="75" r="4.2" fill="#8C95A8" /></g>
      {/* ears */}
      <circle cx="11" cy="36" r="7.5" fill="#CFD6E4" stroke="#8C95A8" strokeWidth="1.4" /><circle cx="11" cy="36" r="3.6" fill="#5CF2FF" opacity="0.85" />
      <circle cx="69" cy="36" r="7.5" fill="#CFD6E4" stroke="#8C95A8" strokeWidth="1.4" /><circle cx="69" cy="36" r="3.6" fill="#5CF2FF" opacity="0.85" />
      <g className="mk-antenna"><line x1="40" y1="14" x2="40" y2="6" stroke="#8C95A8" strokeWidth="2" strokeLinecap="round" /><circle cx="40" cy="4.5" r="3.3" fill="#FFD84D" className="robo-antenna" style={{ filter: "drop-shadow(0 0 4px #FFD84D)" }} /></g>
      <rect x="14" y="14" width="52" height="40" rx="19" fill="#8A5A34" />
      <rect x="20" y="24" width="40" height="28" rx="13" fill="#F3D9B1" />
      <circle cx="31" cy="35" r="6.6" fill="#12161F" /><circle cx="49" cy="35" r="6.6" fill="#12161F" />
      {happy ? (
        <g fill="none" stroke="#5CF2FF" strokeWidth="2.6" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 3px #5CF2FF)" }}><path d="M27 36 q4 -6 8 0" /><path d="M45 36 q4 -6 8 0" /></g>
      ) : (
        <g fill="#5CF2FF" style={{ filter: "drop-shadow(0 0 3px #5CF2FF)" }}>
          <rect x={mood === "thinking" ? 30 : 28} y="31" width="6" height="8.5" rx="3" className="robo-eye" />
          <rect x={mood === "thinking" ? 48 : 46} y="31" width="6" height="8.5" rx="3" className="robo-eye r" />
        </g>
      )}
      <circle cx="38" cy="43" r="1.1" fill="#7A4B2A" /><circle cx="42" cy="43" r="1.1" fill="#7A4B2A" />
      <path className="mk-mouth" d={mood === "thinking" ? "M36 47 h8" : "M35 46 q5 5 10 0"} fill="none" stroke="#7A4B2A" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="23" cy="42" r="2.4" fill="#F472B6" opacity="0.55" /><circle cx="57" cy="42" r="2.4" fill="#F472B6" opacity="0.55" />
      {/* snacks */}
      <g className="mk-banana"><path d="M41 47 C 47 38, 57 38, 62 43 C 56 41, 48 43, 41 47 Z" fill="#FFD84D" stroke="#C99A00" strokeWidth="1" strokeLinejoin="round" /><path d="M41 47 l-4 6 M41 47 l-1 7 M41 47 l3 6" stroke="#FFE680" strokeWidth="2.4" strokeLinecap="round" /></g>
      <g className="mk-cup"><rect x="43" y="42" width="13" height="11" rx="3" fill="#fff" stroke="#8C95A8" strokeWidth="1.2" /><rect x="44.5" y="43.5" width="10" height="3.2" rx="1.4" fill="#B5651D" /><path d="M56 45 q4 0 4 3.5 t-4 3" fill="none" stroke="#8C95A8" strokeWidth="1.3" /><g fill="none" stroke="#C9D2E3" strokeWidth="1.3" strokeLinecap="round"><path className="mk-steam" d="M46 40 q-2 -3 0 -6" /><path className="mk-steam s2" d="M50 40 q-2 -3 0 -6" /><path className="mk-steam s3" d="M54 40 q-2 -3 0 -6" /></g></g>
      <g className="mk-armR"><rect x="58" y="54" width="8" height="20" rx="4" fill="#7A4B2A" /><circle cx="62" cy="75" r="4.2" fill="#8C95A8" /></g>
    </svg>
  );
}

/** Floating Robo helper on every customer page: stacked above the WhatsApp button (never over it), with an instant offline knowledge base. */
export function AiRoboAssistant() {
  const path = usePathname();
  const onBook = path.startsWith("/book"); // mirrors the WhatsApp widget, which moves on /book
  const hidden = path === "/admin" || path.startsWith("/admin/") || /^\/(invitation|wedding)-cards\/invite\//.test(path);
  const [open, setOpen] = useState(false), [hover, setHover] = useState(false), [thinking, setThinking] = useState(false);
  const [teaser, setTeaser] = useState(false), [teaserText, setTeaserText] = useState("Stuck? Ask Robo! 🤖"), [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const seq = useRef(1), listRef = useRef<HTMLDivElement>(null), inputRef = useRef<HTMLInputElement>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lang = useRef<RoboLang>("en");

  useEffect(() => { // dismissible teaser bubble, shown once per visit after a short pause
    let gone = false; try { gone = sessionStorage.getItem("robo-teaser") === "1"; } catch { /* private mode */ }
    if (gone) return;
    setTeaserText(teaserFor(new Date().getHours())); // by the visitor's local time
    const t = setTimeout(() => setTeaser(true), 2500), h = setTimeout(() => setTeaser(false), 14000);
    return () => { clearTimeout(t); clearTimeout(h); };
  }, []);
  const dismissTeaser = () => { setTeaser(false); try { sessionStorage.setItem("robo-teaser", "1"); } catch { /* ignore */ } };

  useEffect(() => { if (open && msgs.length === 0) setMsgs([{ id: seq.current++, from: "bot", text: openingGreeting(new Date().getHours(), lang.current) }]); if (open) { dismissTeaser(); setTimeout(() => inputRef.current?.focus(), 60); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, thinking]);
  useEffect(() => { if (!open) return; const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; document.addEventListener("keydown", esc); return () => document.removeEventListener("keydown", esc); }, [open]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // ── Idle show: every ~18-25 s Robo snacks at home, hangs from the header edge, or scurries across the footer. Pure GPU transforms (Web Animations on a fixed,
  //    pointer-events-none wrapper; only the monkey itself takes clicks), never during chat or in a hidden tab, and not at all with reduced motion. ──
  const wrapRef = useRef<HTMLDivElement>(null), svgRef = useRef<HTMLSpanElement>(null);
  const [pose, setPose] = useState<Pose>("home"), [roaming, setRoaming] = useState(false), [bubble, setBubble] = useState<string | null>(null);
  const ctl = useRef({ token: 0, anim: null as Animation | null, calm: true, open: false, next: 0 });
  useEffect(() => { ctl.current.open = open; }, [open]);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)"), set = () => { ctl.current.calm = mq.matches; if (mq.matches) stop(); };
    const stop = () => { const c = ctl.current; c.token++; c.anim?.cancel(); c.anim = null; setPose("home"); setRoaming(false); setBubble(null); };
    const wait = (ms: number, tok: number) => new Promise<boolean>((res) => setTimeout(() => res(tok === ctl.current.token), ms));
    const move = async (frames: Keyframe[], opts: KeyframeAnimationOptions, tok: number) => {
      const el = wrapRef.current; if (!el) return false;
      const a = el.animate(frames, { ...opts, fill: "forwards" }); ctl.current.anim = a;
      try { await a.finished; } catch { return false; }
      return tok === ctl.current.token;
    };
    const home = () => { const c = ctl.current; c.anim?.cancel(); c.anim = null; setPose("home"); setRoaming(false); };
    const t3 = (x: number, y: number) => `translate3d(${x}px, ${y}px, 0)`;
    const play = async (kind: string) => {
      const c = ctl.current; if (c.calm || c.open || !wrapRef.current || !svgRef.current) return;
      c.token++; c.anim?.cancel(); const tok = c.token, hour = new Date().getHours();
      if (kind === "banana" || kind === "tea") {
        setPose(kind); setBubble(`${timeGreeting(hour, "en")} ${kind === "banana" ? "🍌 Banana break!" : "☕ Chai time!"}`);
        if (!(await wait(3800, tok))) return; setBubble(null);
        if (!(await wait(4600, tok))) return; setPose("home"); return;
      }
      const s0 = svgRef.current.getBoundingClientRect(), vw = window.innerWidth, vh = window.innerHeight;
      if (kind === "header") {
        const hdr = document.querySelector("header"); if (!hdr) return play("banana");
        const h = hdr.getBoundingClientRect(), tx = Math.min(vw - s0.width - 8, Math.max(8, vw * 0.58 - s0.width / 2)), dx = tx - s0.left, dy = h.bottom - 8 - s0.top;
        setRoaming(true); setBubble(null); setPose("run");
        if (!(await move([{ transform: t3(0, 0) }, { transform: t3(dx * 0.5, dy * 0.5 - 70), offset: 0.5 }, { transform: t3(dx, dy) }], { duration: 1000, easing: "cubic-bezier(.3,.6,.4,1)" }, tok))) return;
        setPose("hang"); if (!(await wait(4800, tok))) return;
        setPose("run"); if (!(await move([{ transform: t3(dx, dy) }, { transform: t3(dx * 0.5, dy * 0.5 - 50), offset: 0.5 }, { transform: t3(0, 0) }], { duration: 900, easing: "cubic-bezier(.3,.6,.4,1)" }, tok))) return;
        home(); return;
      }
      // footer run: only when the footer is on screen
      const f = document.querySelector("footer"), fr = f?.getBoundingClientRect();
      if (!f || !fr || fr.top > vh - 70 || fr.bottom < 80) return play("tea");
      const dy = Math.min(fr.bottom, vh) - 6 - s0.bottom, sx = 8 - s0.left, ex = vw - s0.width - 8 - s0.left;
      setRoaming(true); setBubble(null); setPose("run");
      if (!(await move([{ transform: t3(0, 0) }, { transform: t3(sx * 0.5, dy * 0.5 - 60), offset: 0.5 }, { transform: t3(sx, dy) }], { duration: 850, easing: "cubic-bezier(.3,.6,.4,1)" }, tok))) return;
      if (!(await move([{ transform: t3(sx, dy) }, { transform: t3(ex, dy) }], { duration: Math.min(8000, Math.max(3200, (ex - sx) * 6)), easing: "linear" }, tok))) return;
      if (!(await move([{ transform: t3(ex, dy) }, { transform: t3((ex) * 0.5, dy * 0.5 - 70), offset: 0.5 }, { transform: t3(0, 0) }], { duration: 1000, easing: "cubic-bezier(.3,.6,.4,1)" }, tok))) return;
      home();
    };
    const order = ["banana", "header", "tea", "footer"];
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => { timer = setTimeout(() => { if (!document.hidden && !ctl.current.calm && !ctl.current.open) void play(order[ctl.current.next++ % order.length]); schedule(); }, 18000 + Math.random() * 7000); };
    const onPlay = (e: Event) => void play(String((e as CustomEvent).detail)); // manual trigger (also used by tests)
    set(); mq.addEventListener("change", set); window.addEventListener("robo-play", onPlay); window.addEventListener("robo-stop", stop); schedule();
    return () => { clearTimeout(timer); mq.removeEventListener("change", set); window.removeEventListener("robo-play", onPlay); window.removeEventListener("robo-stop", stop); stop(); };
  }, []);
  useEffect(() => { if (open) window.dispatchEvent(new Event("robo-stop")); }, [open]);

  const ask = (q: string) => {
    const text = q.trim(); if (!text || thinking) return;
    setMsgs((m) => [...m, { id: seq.current++, from: "me", text }]); setInput(""); setThinking(true);
    const r = answer(text, new Date(), msgs.length); lang.current = r.lang;
    timer.current = setTimeout(() => { setThinking(false); setMsgs((m) => [...m, { id: seq.current++, from: "bot", text: r.text, human: r.human }]); }, 650);
  };

  if (hidden) return null;
  const mood: Mood = thinking ? "thinking" : hover || open ? "happy" : "idle";
  return (
    <>
      {open && (
        <div role="dialog" aria-label="Chat with Robo" className={cn("robo-pop fixed z-[55] flex w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#131416]",
          onBook ? "right-3 bottom-[15.5rem] h-[min(32rem,calc(100dvh-17.5rem))] lg:right-5 lg:bottom-[6.75rem] lg:h-[min(32rem,calc(100dvh-9.5rem))]" : "right-3 bottom-[11rem] h-[min(32rem,calc(100dvh-13rem))] sm:right-5")}>
          <div className="flex items-center gap-2 bg-[#0A0B0D] px-3 py-2 text-white">
            <span className="flex h-10 w-9 shrink-0 items-center justify-center overflow-hidden"><RoboMonkey mood={mood} size={30} /></span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">Robo · AI Ad Manager Helper</p><p className="truncate text-[11px] text-slate-300">{thinking ? "Thinking… beep-boop" : "Online · English, മലയാളം, Manglish"}</p></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="no-touch inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-200 hover:bg-white/10"><X className="h-5 w-5" aria-hidden="true" /></button>
          </div>
          <div ref={listRef} role="log" aria-live="polite" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3 text-sm">
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex flex-col gap-1.5", m.from === "me" ? "items-end" : "items-start")}>
                <p className={cn("max-w-[88%] rounded-2xl px-3 py-2 leading-relaxed whitespace-pre-line", m.from === "me" ? "rounded-br-sm bg-[#D12014] text-white" : "rounded-bl-sm bg-slate-100 text-slate-900 dark:bg-white/10 dark:text-slate-100")}>{m.text}</p>
                {m.human && <a href={waLink()} target="_blank" rel="noopener noreferrer" data-robo-human className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-extrabold text-[#06371a] hover:brightness-95"><MessageCircle className="h-4 w-4" aria-hidden="true" /> Chat with Human on WhatsApp</a>}
              </div>
            ))}
            {thinking && <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-3 dark:bg-white/10" aria-label="Robo is typing" style={{ width: "fit-content" }}><span className="robo-dot h-1.5 w-1.5 rounded-full bg-slate-500" /><span className="robo-dot h-1.5 w-1.5 rounded-full bg-slate-500" /><span className="robo-dot h-1.5 w-1.5 rounded-full bg-slate-500" /></div>}
          </div>
          <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Quick questions">
            {CHIPS.map((c) => <button key={c.label} type="button" onClick={() => ask(c.q)} disabled={thinking} className="no-touch min-h-11 shrink-0 rounded-full border border-slate-300 px-3 text-xs font-bold whitespace-nowrap text-slate-800 hover:border-[#D12014] hover:text-[#D12014] disabled:opacity-50 dark:border-slate-600 dark:text-slate-100">{c.label}</button>)}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-center gap-2 border-t border-slate-200 px-3 py-2 dark:border-slate-700">
            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} maxLength={200} aria-label="Ask Robo a question" placeholder="Ask in English, മലയാളം or Manglish…" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100" />
            <button type="submit" disabled={thinking || !input.trim()} aria-label="Send question" className="no-touch inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#D12014] text-white hover:bg-[#A91400] disabled:opacity-50"><Send className="h-4 w-4" aria-hidden="true" /></button>
          </form>
          <p className="border-t border-slate-200 px-3 py-1.5 text-center text-[10.5px] text-slate-600 dark:border-slate-700 dark:text-slate-300">Human help: <a className="font-bold underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> · <a className="font-bold whitespace-nowrap underline" href={`tel:${COMPANY.phones[0].tel}`}>{COMPANY.phones[0].display}</a></p>
        </div>
      )}
      <div ref={wrapRef} className={cn("pointer-events-none fixed z-50", onBook ? "right-4 bottom-[10rem] lg:right-5 lg:bottom-5" : "right-5 bottom-[5.5rem]")}>
        {teaser && !open && !roaming && pose === "home" && (
          <div role="status" className="robo-pop pointer-events-auto absolute top-1/2 right-[4.5rem] w-max max-w-[min(16rem,calc(100vw-7.5rem))] -translate-y-1/2 rounded-xl bg-white px-3 py-2 pr-8 text-sm font-semibold text-slate-900 shadow-lg ring-1 ring-slate-200 dark:bg-[#1A1B1E] dark:text-white dark:ring-slate-700">
            {teaserText}
            <button type="button" onClick={dismissTeaser} aria-label="Dismiss" className="no-touch absolute top-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:text-slate-900"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <span aria-hidden="true" className="absolute top-1/2 -right-1 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-white ring-1 ring-slate-200 dark:bg-[#1A1B1E] dark:ring-slate-700" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }} />
          </div>
        )}
        {bubble && !open && (
          <div role="status" className="robo-pop pointer-events-none absolute top-1/2 right-[4.5rem] w-max max-w-[min(16rem,calc(100vw-7.5rem))] -translate-y-1/2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-lg ring-1 ring-slate-200 dark:bg-[#1A1B1E] dark:text-white dark:ring-slate-700">{bubble}</div>
        )}
        <button type="button" onClick={() => { window.dispatchEvent(new Event("robo-stop")); setOpen((o) => !o); }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
          aria-label={open ? "Close Robo help chat" : "Open Robo help chat"} aria-expanded={open} data-robo-trigger
          className="no-touch group pointer-events-auto flex h-[4.75rem] w-16 items-end justify-center bg-transparent drop-shadow-lg transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D12014]">
          <span ref={svgRef} className={cn("block", (pose === "home" || pose === "banana" || pose === "tea") && "robo-bob")}><span className={cn("block", pose === "hang" && "robo-swing")}><RoboMonkey mood={mood} pose={pose} size={52} /></span></span>
        </button>
      </div>
    </>
  );
}
