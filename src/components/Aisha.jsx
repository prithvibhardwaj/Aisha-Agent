import React, { useState, useEffect } from 'react';
import { Mic, Volume2, VolumeX, LogOut, Activity, Sparkles, AlertCircle } from 'lucide-react';

// --- CONFIGURATION ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const RESIDENT_NAME = "Prithvi";
const FEE_AMOUNT = "250 AED";

const Aisha = ({ user, onLogout }) => {
  const [mode, setMode] = useState("idle"); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [conversation, setConversation] = useState([]); 
  const [errorMessage, setErrorMessage] = useState(""); // NEW: Live Error Tracking
  
  const residentName = user?.name || RESIDENT_NAME;

  // --- 1. VOICE OUTPUT ---
  // Added "autoListenAfter" parameter to trigger the mic when she stops talking
  const speak = (text, autoListenAfter = false) => {
    if (!isVoiceEnabled || !window.speechSynthesis) {
      if (autoListenAfter) setTimeout(handleListen, 1000);
      return;
    }
    
    window.speechSynthesis.cancel();
    setMode("speaking");
    setResponse(text);

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Female'));
    
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.lang = 'en-US'; 
    utterance.rate = 1.0;

    utterance.onend = () => {
      setMode("idle");
      if (autoListenAfter) {
        handleListen(); // Start listening automatically!
      }
    };

    utterance.onerror = () => {
      setMode("idle");
      if (autoListenAfter) handleListen();
    };

    window.speechSynthesis.speak(utterance);
  };

  // --- 2. THE REAL BRAIN (Gemini API) ---
  const callGemini = async (userText) => {
    setMode("processing");
    setErrorMessage(""); // Clear old errors

    if (!API_KEY || API_KEY.length < 5) {
      setErrorMessage("System Failure: API Key is missing or invalid in your .env file.");
      speak("My systems are offline because the API key is missing.");
      setMode("idle");
      return;
    }

    const systemPrompt = `
      You are Aisha, a high-end Residence Assistant for Emaar.
      Your tone is professional, warm, and concise.
      
      User Name: ${residentName}
      Current Fee for Lost Card: ${FEE_AMOUNT}
      
      PROTOCOL:
      1. If user says they lost a card, express sympathy and ask WHEN they lost it.
      2. If they give a time (any time, like "yesterday", "2 days ago", "last week"), tell them the replacement cost (${FEE_AMOUNT}) will be added to their bill and ask to proceed.
      3. If they confirm (yes/sure/go ahead), say "Request confirmed" and output the exact secret tag: [ACTION:CONFIRM_CARD].
      4. Keep responses short (under 2 sentences) so they are easy to speak.
    `;

    const historyText = conversation.map(c => `${c.role}: ${c.text}`).join("\n");
    const fullPrompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${historyText}\nUser: ${userText}\nAisha:`;

    try {
      const fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
      
      const res = await fetch(fetchUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        const apiErrorMsg = errorData?.error?.message || `HTTP ${res.status}`;
        setErrorMessage(`Google API Rejected: ${apiErrorMsg}`);
        throw new Error(apiErrorMsg);
      }

      const data = await res.json();
      const aiText = data.candidates[0].content.parts[0].text;

      let finalSpeech = aiText;
      if (aiText.includes("[ACTION:CONFIRM_CARD]")) {
        setShowSuccessCard(true);
        finalSpeech = aiText.replace("[ACTION:CONFIRM_CARD]", "").trim();
      }

      setConversation(prev => [...prev, { role: "User", text: userText }, { role: "Aisha", text: finalSpeech }]);
      speak(finalSpeech, true); // <--- Auto-listen after she replies!

    } catch (error) {
      console.error("AI Brain Connection Error:", error);
      if (error.message === "Failed to fetch") {
        setErrorMessage("Network Error: Failed to fetch. Ensure no adblockers or VPNs are blocking Google APIs.");
      } else if (!errorMessage) {
        setErrorMessage(`Connection Error: ${error.message}`);
      }
      speak("I am having trouble connecting to the residence server. Please try again.");
      setMode("idle");
    }
  };

  // --- 3. VOICE INPUT ---
  const handleListen = () => {
    if (mode === "listening" || mode === "speaking") {
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
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    recognition.onstart = () => {
      setMode("listening");
      setTranscript("");
      setErrorMessage(""); // clear errors when starting a new command
    };

    recognition.onresult = (event) => {
      setTranscript(event.results[0][0].transcript);
    };

    recognition.onerror = (event) => {
      console.error("Mic error:", event.error);
      if (event.error === 'not-allowed') {
        setErrorMessage("Microphone access was denied. Please click 'Allow' in your browser URL bar.");
      }
      setMode("idle");
    };

    recognition.onend = () => {
      setTranscript(currentText => {
        if (currentText.trim()) {
          callGemini(currentText);
        } else {
          setMode("idle");
        }
        return currentText;
      });
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start mic:", e);
    }
  };

  // --- INIT ---
  useEffect(() => {
    const greeting = `Hello ${residentName}. I am Aisha. How can I help you?`;
    setConversation([{ role: "Aisha", text: greeting }]);
    
    const initVoice = () => speak(greeting, true); // true = autoListen after greeting
    
    if (window.speechSynthesis.getVoices().length > 0) {
      setTimeout(initVoice, 800);
    } else {
      window.speechSynthesis.onvoiceschanged = initVoice;
    }
  }, [residentName]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans text-white select-none">
      
      {/* NEW: LIVE ERROR HUD */}
      {errorMessage && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-red-950/90 border border-red-500 text-white px-6 py-4 rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.3)] z-[100] text-center w-[90%] max-w-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2 mb-2 justify-center">
            <AlertCircle size={20} className="text-red-400" />
            <span className="font-bold text-sm tracking-widest uppercase text-red-400">System Error Detected</span>
          </div>
          <p className="text-sm font-mono opacity-90">{errorMessage}</p>
        </div>
      )}

      {/* 1. BACKGROUND GRID */}
      <div className="absolute inset-0 z-0 opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)'
           }}>
      </div>

      {/* 2. MAIN REACTOR CORE */}
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

      {/* 3. SUCCESS CARD */}
      {showSuccessCard && (
        <div className="absolute top-24 z-50 animate-in fade-in zoom-in slide-in-from-top-4 duration-500">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl w-80 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
             <div className="bg-green-500 w-10 h-10 rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg shadow-green-500/50">
                <Sparkles size={20} className="text-white" />
             </div>
             <h3 className="text-center font-bold text-lg text-white mb-4 uppercase tracking-tighter">Request Finalized</h3>
             <div className="space-y-3 text-sm text-white/80">
                <div className="flex justify-between border-b border-white/10 pb-2">
                   <span>Service</span>
                   <span className="text-white font-medium">Access Card</span>
                </div>
                <div className="flex justify-between border-b border-white/10 pb-2">
                   <span>Fee</span>
                   <span className="text-amber-400 font-bold">{FEE_AMOUNT}</span>
                </div>
                <div className="flex justify-between">
                   <span>Ref ID</span>
                   <span className="font-mono text-[10px]">#EMR-{Math.floor(Math.random()*90000)}</span>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* 4. HUD TEXT */}
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

      {/* 5. TOP HUD */}
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