import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, LogOut, Activity, Sparkles } from 'lucide-react';

const FEE_AMOUNT = "250 AED";

const Aisha = ({ user, onLogout }) => {
  const [mode, setMode] = useState("idle"); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  
  const residentName = user?.name || "Resident";

  // --- 1. VOICE OUTPUT (Aisha Speaking) ---
  const speak = (text) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    
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
    };

    window.speechSynthesis.speak(utterance);
  };

  // --- 2. THE BRAIN (The Fix is Here) ---
  const runLogic = (finalText) => {
    setMode("processing");
    const lowerText = finalText.toLowerCase();

    // Small delay to simulate "Thinking" visual
    setTimeout(() => {
      // Logic Step 1: Lost Card
      if (lowerText.includes("lost") || lowerText.includes("card") || lowerText.includes("access")) {
        speak("Sorry to hear that. It’s quite unfortunate. Let me help you with that. Can you let me know when did you lose your card?");
      } 
      // Logic Step 2: Date (Improved matching)
      else if (lowerText.includes("yesterday") || lowerText.includes("day") || lowerText.includes("ago") || lowerText.includes("last week")) {
        speak(`I shall register your request for a replacement card. You will be charged ${FEE_AMOUNT} for this. The charges will reflect in your maintenance bill next month. Shall I proceed?`);
      } 
      // Logic Step 3: Confirmation
      else if (lowerText.includes("yes") || lowerText.includes("sure") || lowerText.includes("go ahead") || lowerText.includes("please")) {
        speak("I have processed your request. You can see the details on your screen now.");
        setShowSuccessCard(true);
      } 
      // Fallback
      else {
        speak("I'm sorry, I didn't quite catch that. Could you please repeat your request regarding your residence?");
      }
    }, 1000);
  };

  // --- 3. VOICE INPUT (User Speaking) ---
  const handleListen = () => {
    if (mode === "listening" || mode === "speaking") {
      window.speechSynthesis.cancel();
      setMode("idle");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Chrome is required for voice features.");

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    recognition.onstart = () => {
      setMode("listening");
      setTranscript("");
      setShowSuccessCard(false); // Reset UI card on new interaction
    };

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
    };

    recognition.onend = () => {
      // CRITICAL: We use a local variable to capture the final transcript 
      // because state updates are asynchronous.
      setTranscript((finalText) => {
        if (finalText.trim().length > 0) {
          runLogic(finalText);
        } else {
          setMode("idle");
        }
        return finalText;
      });
    };

    recognition.start();
  };

  useEffect(() => {
    const initVoice = () => {
       speak(`Hello ${residentName}. I am Aisha. How can I help you today?`);
    };
    if (window.speechSynthesis.getVoices().length > 0) {
      setTimeout(initVoice, 800);
    } else {
      window.speechSynthesis.onvoiceschanged = initVoice;
    }
  }, [residentName]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans text-white select-none">
      
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
        
        {/* State Visuals */}
        {mode === 'listening' && (
          <div className="absolute w-80 h-80 animate-[ping_1.5s_ease-out_infinite] border-2 border-cyan-500 rounded-full opacity-40 scale-150"></div>
        )}

        {mode === 'speaking' && (
          <div className="absolute w-full h-full bg-amber-500 blur-[100px] opacity-20 animate-pulse"></div>
        )}

        {/* Orbiting Rings */}
        <div className={`absolute w-72 h-72 border-2 rounded-full transition-all duration-700 ${mode === 'speaking' ? 'border-amber-500 animate-[spin_2s_linear_infinite]' : 'border-slate-800 animate-[spin_10s_linear_infinite]'}`}></div>
        <div className={`absolute w-60 h-60 border border-dashed rounded-full transition-all duration-700 ${mode === 'listening' ? 'border-cyan-400 animate-[spin_3s_linear_infinite_reverse]' : 'border-slate-700 animate-[spin_15s_linear_infinite_reverse]'}`}></div>

        {/* The Core Button */}
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

      {/* 3. SUCCESS CARD (Generative UI Over the core) */}
      {showSuccessCard && (
        <div className="absolute top-20 z-50 animate-in fade-in zoom-in slide-in-from-top-4 duration-500">
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

      {/* 4. HUD TEXT (Bottom) */}
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