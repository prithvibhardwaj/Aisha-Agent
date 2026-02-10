import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, LogOut, Activity } from 'lucide-react';

// --- CONFIGURATION ---
const RESIDENT_NAME = "John";
const FEE_AMOUNT = "250 AED";

const Aisha = ({ user, onLogout }) => {
  // State: 'idle', 'listening', 'processing', 'speaking'
  const [mode, setMode] = useState("idle"); 
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  
  // Refs for animation management
  const processingTimeout = useRef(null);

  // --- 1. VOICE OUTPUT (Aisha Speaking) ---
  const speak = (text) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    setMode("speaking");
    setResponse(text);

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    // Prefer a "Google US English" or premium voice
    const femaleVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Female'));
    if (femaleVoice) utterance.voice = femaleVoice;
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setMode("idle");
    };

    window.speechSynthesis.speak(utterance);
  };

  // --- 2. VOICE INPUT (User Speaking) ---
  const handleListen = () => {
    if (mode === "listening" || mode === "speaking") {
      // Tap to stop
      window.speechSynthesis.cancel();
      setMode("idle");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Browser not supported. Use Chrome.");

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setMode("listening");
      setTranscript("");
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const text = event.results[current][0].transcript;
      setTranscript(text);
    };

    recognition.onend = () => {
      // If we caught text, process it. Otherwise go idle.
      // We read the 'transcript' state carefully here or use the event.
      // For simplicity in this demo, we assume the state updated or we process immediately.
      setMode("processing");
      // Artificial delay to show the "Thinking" animation
      processingTimeout.current = setTimeout(() => {
        runLogic();
      }, 1500); 
    };

    recognition.start();
  };

  // --- 3. LOGIC BRAIN ---
  // Note: In a real app, 'transcript' would be passed in directly to avoid stale state issues.
  // Here we use a simplified simulation based on your script.
  const runLogic = () => {
    // This logic runs AFTER the "Processing" delay
    // We are simulating the "Intent Understanding" phase
    
    // Check what was arguably just spoken (using a ref or simple logic check for demo)
    // For this prototype, we cycle responses based on simulated flow or keywords if accessible.
    // Ideally, we'd pass the actual transcript string here.
    
    const lowerText = transcript.toLowerCase() || "test"; 

    if (lowerText.includes("lost") || lowerText.includes("card")) {
      speak("Sorry to hear that. It’s quite unfortunate. Let me help you with that. Can you let me know when did you lose your card?");
    } 
    else if (lowerText.includes("yesterday") || lowerText.includes("day")) {
      speak(`I shall register your request for a replacement card. You will be charged ${FEE_AMOUNT} for this. The charges will reflect in your maintenance bill next month. Shall I proceed?`);
    } 
    else if (lowerText.includes("yes") || lowerText.includes("sure")) {
      speak("I have processed your request. You can see the details on your screen now.");
    } 
    else {
      // Default / Fallback
      speak("I am currently tuned to assist with Access Cards. Could you please clarify?");
    }
  };

  // Initial Greeting
  useEffect(() => {
    // Wait for voices to load
    const initVoice = () => {
       const greeting = `Hello ${RESIDENT_NAME || "Resident"}. I am Aisha. How can I help you today?`;
       speak(greeting);
    };
    
    if (window.speechSynthesis.getVoices().length > 0) {
      setTimeout(initVoice, 800);
    } else {
      window.speechSynthesis.onvoiceschanged = initVoice;
    }
  }, []);


  // --- VISUAL RENDERERS ---

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col items-center justify-center font-sans text-white select-none">
      
      {/* 1. BACKGROUND GRID (Futuristic Floor) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)'
           }}>
      </div>

      {/* 2. MAIN REACTOR CORE */}
      <div className="relative z-10 flex items-center justify-center">
        
        {/* --- STATE: IDLE (Breathing) --- */}
        {mode === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 rounded-full border border-slate-700 opacity-50 animate-[spin_10s_linear_infinite]"></div>
            <div className="absolute w-60 h-60 rounded-full border border-slate-600 opacity-30 animate-[spin_15s_linear_infinite_reverse]"></div>
          </div>
        )}

        {/* --- STATE: LISTENING (User Speaking - CYAN/BLUE) --- */}
        {mode === 'listening' && (
          <>
            {/* Outward Ripples */}
            <div className="absolute w-full h-full animate-[ping_1.5s_ease-out_infinite] border-2 border-cyan-500 rounded-full opacity-50 scale-150"></div>
            <div className="absolute w-full h-full animate-[ping_1.5s_ease-out_infinite_delay-300] border border-cyan-400 rounded-full opacity-30 scale-125"></div>
            {/* Spinning Rings */}
            <div className="absolute w-72 h-72 border-t-2 border-b-2 border-cyan-500 rounded-full animate-[spin_2s_linear_infinite]"></div>
            <div className="absolute w-64 h-64 border-l-2 border-r-2 border-cyan-300 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
          </>
        )}

        {/* --- STATE: SPEAKING (Aisha - GOLD/AMBER) --- */}
        {mode === 'speaking' && (
          <>
            {/* Solar Flare Pulses */}
            <div className="absolute w-full h-full bg-amber-500 blur-3xl opacity-20 animate-pulse"></div>
            <div className="absolute w-72 h-72 border-4 border-amber-500/50 rounded-full animate-[spin_1s_linear_infinite] border-dashed"></div>
            <div className="absolute w-60 h-60 border-2 border-amber-300 rounded-full animate-[spin_4s_linear_infinite_reverse]"></div>
            {/* Particles (CSS dots) */}
            <div className="absolute top-0 w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
            <div className="absolute bottom-0 w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
          </>
        )}

        {/* --- STATE: PROCESSING (Loading) --- */}
        {mode === 'processing' && (
           <div className="absolute w-72 h-72 border-t-4 border-white rounded-full animate-spin"></div>
        )}


        {/* --- THE CORE BUTTON --- */}
        <button 
          onClick={handleListen}
          className={`relative z-20 w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 
            ${mode === 'listening' ? 'bg-cyan-950 shadow-[0_0_50px_cyan]' : ''}
            ${mode === 'speaking' ? 'bg-amber-950 shadow-[0_0_60px_orange]' : ''}
            ${mode === 'idle' ? 'bg-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:bg-slate-800' : ''}
            ${mode === 'processing' ? 'bg-slate-950 scale-90' : ''}
          `}
        >
          {mode === 'listening' && <Mic size={48} className="text-cyan-400 animate-pulse" />}
          {mode === 'speaking' && <Activity size={48} className="text-amber-400 animate-bounce" />}
          {mode === 'processing' && <span className="text-xs tracking-widest uppercase animate-pulse">Processing</span>}
          {mode === 'idle' && <Mic size={40} className="text-slate-500" />}
        </button>

      </div>

      {/* 3. TEXT TRANSCRIPTS (HUD Style) */}
      <div className="absolute bottom-20 w-full max-w-2xl px-6 text-center space-y-4">
         
         {/* User Text */}
         <div className={`transition-all duration-500 ${mode === 'listening' ? 'opacity-100 translate-y-0' : 'opacity-40 translate-y-2'}`}>
            <p className="text-cyan-300 font-mono text-lg tracking-wide">
              {transcript || (mode === 'listening' ? "LISTENING..." : "")}
            </p>
         </div>

         {/* Aisha Text */}
         <div className={`transition-all duration-500 ${mode === 'speaking' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <p className="text-amber-100 font-light text-xl leading-relaxed drop-shadow-lg">
              "{response}"
            </p>
         </div>
      </div>

      {/* 4. HEADER CONTROLS */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-50">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center font-bold text-black text-xs">AI</div>
            <span className="font-light tracking-[0.3em] text-white/50 text-sm">SYSTEM ONLINE</span>
         </div>

         <div className="flex gap-4">
            <button 
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
            >
              {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button 
              onClick={onLogout}
              className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-400 transition"
            >
              <LogOut size={16} />
            </button>
         </div>
      </div>

    </div>
  );
};

export default Aisha;