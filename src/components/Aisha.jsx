import React, { useState, useEffect, useRef } from 'react';
import { Mic, Volume2, VolumeX, LogOut, Activity, Sparkles, AlertCircle } from 'lucide-react';

// --- CONFIGURATION ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const RESIDENT_NAME = "John";
const FEE_AMOUNT = "250 AED";

const Aisha = ({ user, onLogout }) => {
  const [mode, setMode] = useState("idle"); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [conversation, setConversation] = useState([]); // Short-term memory
  
  const residentName = user?.name || "Resident";

  // --- 1. VOICE OUTPUT ---
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

    utterance.onend = () => setMode("idle");
    window.speechSynthesis.speak(utterance);
  };

  // --- 2. THE REAL BRAIN (Gemini API) ---
  const callGemini = async (userText) => {
    setMode("processing");

    // 1. Build the context for the AI
    // We give it a "Persona" and the history of what was just said.
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

    // 2. Prepare the message history for the API
    const historyText = conversation.map(c => `${c.role}: ${c.text}`).join("\n");
    const fullPrompt = `${systemPrompt}\n\nCONVERSATION HISTORY:\n${historyText}\nUser: ${userText}\nAisha:`;

    try {
      // 3. Call the API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }]
        })
      });

      const data = await response.json();
      const aiText = data.candidates[0].content.parts[0].text;

      // 4. Handle "Secret Actions" (The UI Trigger)
      let finalSpeech = aiText;
      if (aiText.includes("[ACTION:CONFIRM_CARD]")) {
        setShowSuccessCard(true);
        finalSpeech = aiText.replace("[ACTION:CONFIRM_CARD]", "").trim();
      }

      // 5. Update Memory & Speak
      setConversation(prev => [...prev, { role: "User", text: userText }, { role: "Aisha", text: finalSpeech }]);
      speak(finalSpeech);

    } catch (error) {
      console.error("AI Error:", error);
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
    if (!SpeechRecognition) return alert("Chrome is required for voice.");

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;

    recognition.onstart = () => {
      setMode("listening");
      setTranscript("");
    };

    recognition.onresult = (event) => {
      setTranscript(event.results[0][0].transcript);
    };

    recognition.onend = () => {
      // Use a timeout to ensure we capture the final state
      setTranscript(currentText => {
        if (currentText.trim()) {
          callGemini(currentText); // <--- CALLING THE API HERE
        } else {
          setMode("idle");
        }
        return currentText;
      });
    };

    recognition.start();
  };

  // --- INIT ---
  useEffect(() => {
    const greeting = `Hello ${residentName}. I am Aisha. How can I help you?`;
    // Add greeting to memory so AI knows it happened
    setConversation([{ role: "Aisha", text: greeting }]);
    
    // Wait for voices
    if (window.speechSynthesis.getVoices().length > 0) {
      setTimeout(() => speak(greeting), 800);
    } else {
      window.speechSynthesis.onvoiceschanged = () => speak(greeting);
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
      
      {/* 6. NO API KEY WARNING */}
      {(!API_KEY) && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500/90 text-white p-6 rounded-xl shadow-2xl z-[100] text-center w-80">
          <AlertCircle size={40} className="mx-auto mb-4" />
          <h3 className="font-bold text-lg mb-2">API Key Missing</h3>
          <p className="text-sm">Please check your .env file and restart the server.</p>
        </div>
      )}
    </div>
  );
};

export default Aisha;