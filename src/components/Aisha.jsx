import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, VolumeX, LogOut, Activity, Sparkles, AlertCircle, CheckCircle, X } from 'lucide-react';

// --- CONFIGURATION ---
const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || "";
const RESIDENT_NAME = "Prithvi";
const FEE_AMOUNT = "250 AED";

const Aisha = ({ user, onLogout }) => {
  const [systemStarted, setSystemStarted] = useState(false);
  const [mode, setMode] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [conversation, setConversation] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [orderBanner, setOrderBanner] = useState(null); // { name, houseNumber, price }

  const utteranceRef = useRef(null);
  const recognitionRef = useRef(null);
  const manualStopRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const flowStateRef = useRef(null); // null | 'awaiting_unit' | 'awaiting_confirm' | 'done'
  const pendingUnitRef = useRef(null);

  const residentName = user?.name || RESIDENT_NAME;

  // --- 1. VOICE OUTPUT (Browser SpeechSynthesis) ---
  const speak = (text, autoListenAfter = false) => {
    if (!isVoiceEnabled || !window.speechSynthesis) {
      if (autoListenAfter) setTimeout(handleListen, 1000);
      return;
    }

    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }
    window.speechSynthesis.cancel();

    setMode("speaking");
    setResponse(text);

    utteranceRef.current = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v =>
      v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Female')
    );

    if (femaleVoice) utteranceRef.current.voice = femaleVoice;
    utteranceRef.current.lang = 'en-US';
    utteranceRef.current.rate = 1.0;

    utteranceRef.current.onend = () => {
      setMode("idle");
      if (autoListenAfter) handleListen();
    };

    utteranceRef.current.onerror = (e) => {
      console.error("Speech Synthesis Error:", e);
      setMode("idle");
      if (autoListenAfter) handleListen();
    };

    window.speechSynthesis.speak(utteranceRef.current);
  };

  // --- 2. AI BRAIN (OpenAI Chat Completions) ---
  const callAI = async (userText) => {
    try {
      setMode("processing");
      setErrorMessage("");

      if (!API_KEY || API_KEY.length < 5) {
        throw new Error("OpenAI API key is missing (VITE_OPENAI_API_KEY).");
      }

      const pendingUnit = pendingUnitRef.current;
      const flow = flowStateRef.current;

      let flowHint = '';
      if (flow === 'awaiting_unit') {
        flowHint = `\nThe user is providing their unit number right now. Extract it, quote the ${FEE_AMOUNT} replacement fee, and ask them to confirm. Do not ask for the unit number again.`;
      } else if (flow === 'awaiting_confirm') {
        flowHint = `\nYou already have the user's unit number (${pendingUnit}) and quoted ${FEE_AMOUNT}. The user is responding to your confirmation request. If they confirm, begin your reply with exactly "ACTION:ORDER_CONFIRMED:${pendingUnit}" on its own line, then your spoken reply on the next line. If they decline, cancel politely and do not show any action.`;
      }

      const systemPrompt = `You are Aisha, a calm, concise, helpful concierge assistant for ${residentName} at a residential building. Keep responses short, actionable, and friendly.

If the user mentions losing or needing a replacement access card, ask for their unit number.${flowHint}`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 300,
          messages: [
            { role: "system", content: systemPrompt },
            ...conversation.map((c) => ({
              role: c.role === "User" ? "user" : "assistant",
              content: c.text,
            })),
            { role: "user", content: userText },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenAI request failed (${res.status}). ${errText}`.trim());
      }

      const data = await res.json();
      const choice = data?.choices?.[0]?.message;
      const rawText = (choice?.content || choice?.refusal || "").trim();

      // Update flow state based on conversation progress
      let spokenText = rawText;
      let autoListen = true;

      const confirmedMatch = rawText.match(/^ACTION:ORDER_CONFIRMED:(.+)/m);
      if (confirmedMatch) {
        const houseNumber = confirmedMatch[1].trim();
        setOrderBanner({ name: residentName, houseNumber, price: FEE_AMOUNT });
        flowStateRef.current = 'done';
        pendingUnitRef.current = null;
        spokenText = rawText.replace(/^ACTION:ORDER_CONFIRMED:.+\n?/m, "").trim();
        autoListen = false;
      } else if (flow === 'awaiting_unit') {
        // Concatenate all digit groups to handle STT splitting "123" into "1 2 3"
        const allDigits = userText.match(/\d+/g);
        if (allDigits) pendingUnitRef.current = allDigits.join('');
        flowStateRef.current = 'awaiting_confirm';
      } else if (flow === null && /unit number|house number|unit no/i.test(rawText)) {
        flowStateRef.current = 'awaiting_unit';
      }

      const finalSpeech = spokenText || "I'm sorry — I didn't get a response. Please try again.";
      setConversation((prev) => [...prev, { role: "User", text: userText }, { role: "Aisha", text: finalSpeech }]);
      speak(finalSpeech, autoListen);
    } catch (e) {
      console.error("AI call failed:", e);
      setMode("idle");
      setErrorMessage(`AI Error: ${e?.message || "Unknown error"}`);
    }
  };

  // --- 3. VOICE INPUT ---
  const handleListen = () => {
    if (mode === "listening") {
      manualStopRef.current = true;
      try { recognitionRef.current?.stop?.(); } catch (e) { console.error(e); }
      setMode("idle");
      return;
    }

    if (mode === "speaking") {
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
      }
      window.speechSynthesis.cancel();
      setMode("idle");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErrorMessage("Browser Error: Chrome is required for voice recognition.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    recognition.onstart = () => {
      setMode("listening");
      finalTranscriptRef.current = transcript?.trim() ? transcript.trim() : "";
      setErrorMessage("");
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalAdd = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result?.[0]?.transcript || "";
        if (result.isFinal) finalAdd += text + " ";
        else interim += text + " ";
      }
      if (finalAdd.trim()) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalAdd}`.trim();
      }
      setTranscript(`${finalTranscriptRef.current} ${interim}`.trim());
    };

    recognition.onerror = (event) => {
      console.error("Mic error:", event.error);
      if (event.error === 'not-allowed') {
        setErrorMessage("Microphone access was denied. Please click 'Allow' in your browser URL bar.");
      }
      setMode("idle");
    };

    recognition.onend = () => {
      if (manualStopRef.current) {
        manualStopRef.current = false;
        setMode("idle");
        return;
      }
      const finalText = finalTranscriptRef.current.trim();
      if (finalText) callAI(finalText);
      else setMode("idle");
    };

    try { recognition.start(); } catch (e) { console.error("Failed to start mic:", e); }
  };

  // --- INIT ---
  useEffect(() => {
    if (!systemStarted) return;
    const greeting = `Hello ${residentName}. I am Aisha. How can I help you?`;
    setConversation([{ role: "Aisha", text: greeting }]);
    const initVoice = () => speak(greeting, true);
    if (window.speechSynthesis.getVoices().length > 0) {
      setTimeout(initVoice, 800);
    } else {
      window.speechSynthesis.onvoiceschanged = initVoice;
    }
  }, [residentName, systemStarted]);

  // --- PRE-START SCREEN ---
  if (!systemStarted) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center font-sans">
        <button
          onClick={() => setSystemStarted(true)}
          className="px-8 py-4 bg-cyan-950/30 border border-cyan-500/50 text-cyan-400 rounded-full hover:bg-cyan-900/50 transition-all tracking-[0.2em] uppercase text-sm animate-pulse shadow-[0_0_30px_rgba(6,182,212,0.2)]"
        >
          Initialize System
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans text-white select-none">

      {/* ERROR HUD */}
      {errorMessage && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-red-950/90 border border-red-500 text-white px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.3)] z-[100] text-center w-[90%] max-w-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-2 justify-center">
            <AlertCircle size={20} className="text-red-400" />
            <span className="font-bold text-sm tracking-widest uppercase text-red-400">System Error Detected</span>
          </div>
          <p className="text-sm font-mono opacity-90">{errorMessage}</p>
        </div>
      )}

      {/* ORDER BANNER — slides up from bottom like a browser notification */}
      {orderBanner && (
        <div className="absolute bottom-0 left-0 right-0 z-[200] animate-in slide-in-from-bottom-2 duration-400">
          <div className="bg-slate-950/95 border-t-2 border-amber-500/50 backdrop-blur-md px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <CheckCircle size={22} className="text-green-400 shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="text-white/40 text-[10px] font-bold tracking-[0.3em] uppercase">Order Placed — Added to Bill</span>
                <div className="flex items-center gap-3">
                  <span className="text-white text-base font-semibold">{orderBanner.name}</span>
                  <span className="text-white/30">·</span>
                  <span className="text-white/80 text-base">Unit {orderBanner.houseNumber}</span>
                  <span className="text-white/30">·</span>
                  <span className="text-amber-400 text-base font-bold">{orderBanner.price}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setOrderBanner(null)}
              className="text-white/30 hover:text-white transition ml-6"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* BACKGROUND GRID */}
      <div className="absolute inset-0 z-0 opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)'
        }}>
      </div>

      {/* MAIN REACTOR CORE */}
      <div className="relative z-10 flex items-center justify-center">
        {mode === 'listening' && <div className="absolute w-80 h-80 animate-[ping_1.5s_ease-out_infinite] border-2 border-cyan-500 rounded-full opacity-40 scale-150"></div>}
        {mode === 'speaking' && <div className="absolute w-full h-full bg-amber-500 blur-[100px] opacity-20 animate-pulse"></div>}

        <div className={`absolute w-72 h-72 border-2 rounded-full transition-all duration-700 ${mode === 'speaking' ? 'border-amber-500 animate-[spin_2s_linear_infinite]' : 'border-slate-800 animate-[spin_10s_linear_infinite]'}`}></div>
        <div className={`absolute w-60 h-60 border border-dashed rounded-full transition-all duration-700 ${mode === 'listening' ? 'border-cyan-400 animate-[spin_3s_linear_infinite_reverse]' : 'border-slate-700 animate-[spin_15s_linear_infinite_reverse]'}`}></div>

        <button
          onClick={handleListen}
          className={`relative z-20 w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500
            ${mode === 'listening' ? 'bg-cyan-950 shadow-[0_0_60px_cyan] border-cyan-400 border-2' : ''}
            ${mode === 'speaking' ? 'bg-amber-950 shadow-[0_0_80px_orange] border-amber-400 border-2' : ''}
            ${mode === 'idle' ? 'bg-slate-900 border-slate-700 border hover:bg-slate-800 shadow-[0_0_20px_rgba(255,255,255,0.05)]' : ''}
            ${mode === 'processing' ? 'bg-black scale-90' : ''}
          `}
        >
          {mode === 'listening' && <Mic size={48} className="text-cyan-400 animate-pulse" />}
          {mode === 'speaking' && <Activity size={48} className="text-amber-400 animate-bounce" />}
          {mode === 'processing' && <Sparkles size={40} className="text-white animate-spin" />}
          {mode === 'idle' && <Mic size={40} className="text-slate-500" />}
        </button>
      </div>

      {/* HUD TEXT */}
      <div className="absolute bottom-16 w-full max-w-xl text-center px-8 pointer-events-none">
        <div className={`transition-all duration-300 ${mode === 'listening' ? 'opacity-100 scale-100' : 'opacity-40 scale-95'}`}>
          <p className="text-cyan-400 font-mono text-lg lowercase">
            {transcript || (mode === 'listening' ? "Detecting audio..." : "")}
          </p>
        </div>
        <div className={`mt-4 transition-all duration-500 ${mode === 'speaking' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-amber-100 font-light text-xl italic leading-relaxed drop-shadow-md">
            "{response}"
          </p>
        </div>
      </div>

      {/* TOP HUD */}
      <div className="absolute top-0 w-full p-8 flex justify-between items-start z-50">
        <div className="space-y-1">
          <h2 className="text-white/40 text-[10px] tracking-[0.4em] uppercase font-bold">Residency System V4.0</h2>
          <div className="h-[1px] w-24 bg-gradient-to-r from-amber-500 to-transparent"></div>
          <p className="text-amber-500 text-xs font-mono tracking-widest">{residentName.toUpperCase()}</p>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition">
            {isVoiceEnabled ? <Volume2 size={20} className="text-amber-400" /> : <VolumeX size={20} className="text-red-400" />}
          </button>
          <button onClick={onLogout} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50 transition">
            <LogOut size={20} className="text-white/60" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default Aisha;
