"use client";

import { MessageCircle, Send, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { COMPANY } from "@/lib/company";
import { answer, CHIPS, GREETING, waLink, type RoboLang } from "@/lib/robo-kb";
import { cn } from "@/lib/utils";

type Mood = "idle" | "happy" | "thinking";
interface Msg { id: number; from: "bot" | "me"; text: string; human?: boolean }

/** The Robo mascot: floating, blinking, glowing antenna; happy + waving on hover, thinking while it answers. */
function RoboFace({ mood, size = 56 }: { mood: Mood; size?: number }) {
  return (
    <svg viewBox="0 0 64 72" width={size} height={size * (72 / 64)} role="img" aria-label="Robo, the AI Ad Manager helper" className={cn(mood === "happy" && "robo-happy")}>
      <defs>
        <linearGradient id="robo-head" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#CFD6E4" /></linearGradient>
        <linearGradient id="robo-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E83E32" /><stop offset="1" stopColor="#A91400" /></linearGradient>
      </defs>
      <ellipse cx="32" cy="69" rx="14" ry="2.4" fill="rgba(0,0,0,0.22)" />
      <line x1="32" y1="4" x2="32" y2="13" stroke="#8C95A8" strokeWidth="2" strokeLinecap="round" />
      <circle cx="32" cy="4" r="3.2" fill="#FFD84D" className="robo-antenna" style={{ filter: "drop-shadow(0 0 4px #FFD84D)" }} />
      <rect x="18" y="45" width="28" height="20" rx="7" fill="url(#robo-body)" />
      <circle cx="32" cy="55" r="3" fill="#FFD84D" opacity="0.95" />
      <rect x="11" y="47" width="7" height="15" rx="3.5" fill="#8C95A8" className="robo-arm" />
      <rect x="46" y="47" width="7" height="15" rx="3.5" fill="#8C95A8" className="robo-arm wave" />
      <rect x="9" y="13" width="46" height="33" rx="12" fill="url(#robo-head)" stroke="#8C95A8" strokeWidth="1.5" />
      <rect x="14" y="19" width="36" height="22" rx="8" fill="#12161F" />
      {mood === "happy" ? (
        <g fill="none" stroke="#5CF2FF" strokeWidth="2.6" strokeLinecap="round"><path d="M20 30 q4 -6 8 0" /><path d="M36 30 q4 -6 8 0" /></g>
      ) : (
        <g fill="#5CF2FF" style={{ filter: "drop-shadow(0 0 3px #5CF2FF)" }}>
          <rect x={mood === "thinking" ? 23 : 21} y="25" width="7" height="9" rx="3.5" className="robo-eye" />
          <rect x={mood === "thinking" ? 39 : 36} y="25" width="7" height="9" rx="3.5" className="robo-eye r" />
        </g>
      )}
      {mood === "thinking"
        ? <path d="M25 37 h14" stroke="#5CF2FF" strokeWidth="2" strokeLinecap="round" />
        : <path d={mood === "happy" ? "M24 35 q8 7 16 0" : "M26 36 q6 4 12 0"} fill="none" stroke="#5CF2FF" strokeWidth="2" strokeLinecap="round" />}
      <circle cx="13.5" cy="30" r="2.4" fill="#F472B6" opacity="0.7" /><circle cx="50.5" cy="30" r="2.4" fill="#F472B6" opacity="0.7" />
    </svg>
  );
}

/** Floating Robo helper on every customer page: stacked above the WhatsApp button (never over it), with an instant offline knowledge base. */
export function AiRoboAssistant() {
  const path = usePathname();
  const onBook = path.startsWith("/book"); // mirrors the WhatsApp widget, which moves on /book
  const hidden = path === "/admin" || path.startsWith("/admin/") || /^\/(invitation|wedding)-cards\/invite\//.test(path);
  const [open, setOpen] = useState(false), [hover, setHover] = useState(false), [thinking, setThinking] = useState(false);
  const [teaser, setTeaser] = useState(false), [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const seq = useRef(1), listRef = useRef<HTMLDivElement>(null), inputRef = useRef<HTMLInputElement>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lang = useRef<RoboLang>("en");

  useEffect(() => { // dismissible teaser bubble, shown once per visit after a short pause
    let gone = false; try { gone = sessionStorage.getItem("robo-teaser") === "1"; } catch { /* private mode */ }
    if (gone) return;
    const t = setTimeout(() => setTeaser(true), 2500), h = setTimeout(() => setTeaser(false), 14000);
    return () => { clearTimeout(t); clearTimeout(h); };
  }, []);
  const dismissTeaser = () => { setTeaser(false); try { sessionStorage.setItem("robo-teaser", "1"); } catch { /* ignore */ } };

  useEffect(() => { if (open && msgs.length === 0) setMsgs([{ id: seq.current++, from: "bot", text: GREETING[lang.current] }]); if (open) { dismissTeaser(); setTimeout(() => inputRef.current?.focus(), 60); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, thinking]);
  useEffect(() => { if (!open) return; const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); }; document.addEventListener("keydown", esc); return () => document.removeEventListener("keydown", esc); }, [open]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const ask = (q: string) => {
    const text = q.trim(); if (!text || thinking) return;
    setMsgs((m) => [...m, { id: seq.current++, from: "me", text }]); setInput(""); setThinking(true);
    const r = answer(text); lang.current = r.lang;
    timer.current = setTimeout(() => { setThinking(false); setMsgs((m) => [...m, { id: seq.current++, from: "bot", text: r.text, human: r.human }]); }, 650);
  };

  if (hidden) return null;
  const mood: Mood = thinking ? "thinking" : hover || open ? "happy" : "idle";
  return (
    <>
      {open && (
        <div role="dialog" aria-label="Chat with Robo" className={cn("robo-pop fixed z-[55] flex w-[min(23rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#131416]",
          onBook ? "right-3 bottom-[14.25rem] h-[min(32rem,calc(100dvh-16rem))] lg:right-5 lg:bottom-[5.5rem] lg:h-[min(32rem,calc(100dvh-8rem))]" : "right-3 bottom-[9.75rem] h-[min(32rem,calc(100dvh-11.5rem))] sm:right-5")}>
          <div className="flex items-center gap-2 bg-[#0A0B0D] px-3 py-2 text-white">
            <span className="flex h-10 w-9 shrink-0 items-center justify-center"><RoboFace mood={mood} size={34} /></span>
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
      <div className={cn("fixed z-50", onBook ? "right-4 bottom-[10rem] lg:right-5 lg:bottom-5" : "right-5 bottom-[5.5rem]")}>
        {teaser && !open && (
          <div role="status" className="robo-pop absolute top-1/2 right-[4.25rem] w-max max-w-[min(15rem,calc(100vw-7rem))] -translate-y-1/2 rounded-xl bg-white px-3 py-2 pr-8 text-sm font-semibold text-slate-900 shadow-lg ring-1 ring-slate-200 dark:bg-[#1A1B1E] dark:text-white dark:ring-slate-700">
            Stuck? Ask Robo! 🤖
            <button type="button" onClick={dismissTeaser} aria-label="Dismiss" className="no-touch absolute top-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:text-slate-900"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <span aria-hidden="true" className="absolute top-1/2 -right-1 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-white ring-1 ring-slate-200 dark:bg-[#1A1B1E] dark:ring-slate-700" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 0)" }} />
          </div>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onFocus={() => setHover(true)} onBlur={() => setHover(false)}
          aria-label={open ? "Close Robo help chat" : "Open Robo help chat"} aria-expanded={open} data-robo-trigger
          className="no-touch group flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.45)] ring-2 ring-[#D12014]/70 transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D12014] dark:bg-[#1A1B1E]">
          <span className="robo-bob block"><RoboFace mood={mood} size={44} /></span>
        </button>
      </div>
    </>
  );
}
