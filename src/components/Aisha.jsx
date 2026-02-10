import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, LogOut, Volume2, VolumeX, Sparkles } from 'lucide-react';

const FEE_AMOUNT = "250 AED";

const Aisha = ({ user, onLogout }) => {
  const [status, setStatus] = useState("idle"); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  
  const residentName = user?.name || "Resident";

  // --- 1. VOICE SYNTHESIS (Speaking) ---
  const speak = (text) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    setStatus("speaking");
    setLastResponse(text);

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.name.includes('Google US English') || 
      v.name.includes('Samantha') || 
      v.name.includes('Female')
    );
    
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.lang = 'en-US'; 
    utterance.rate = 1;

    // Reset to idle when done speaking
    utterance.onend = () => setStatus("idle");

    window.speechSynthesis.speak(utterance);
  };

  // --- 2. VOICE RECOGNITION (Listening) ---
  const handleListen = () => {
    if (status === "listening") return; // Prevent double clicks

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.continuous = false;
    recognition.interimResults = true; // Show words as they are spoken

    recognition.onstart = () => {
      setStatus("listening");
      setTranscript("");
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);
    };

    recognition.onend = () => {
      if (transcript) {
        processCommand(transcript);
      } else {
        setStatus("idle");
      }
    };

    recognition.start();
  };

  // --- 3. THE BRAIN (Logic) ---
  const processCommand = async (command) => {
    setStatus("processing");
    const lowerText = command.toLowerCase();

    // Simulated Thinking Delay
    setTimeout(() => {
      let responseText = "";
      let successTrigger = false;

      // Logic Block
      if (lowerText.includes("lost") && lowerText.includes("card")) {
        responseText = "Sorry to hear that. It’s quite unfortunate. Let me help you with that. Can you let me know when did you lose your card?";
      } 
      else if (lowerText.includes("yesterday") || lowerText.includes("day") || lowerText.includes("ago")) {
        responseText = `I shall register your request for a replacement card. You will be charged ${FEE_AMOUNT} for this. The charges will reflect in your maintenance bill next month. Shall I proceed?`;
      } 
      else if (lowerText.includes("yes") || lowerText.includes("sure") || lowerText.includes("go ahead")) {
        responseText = "I have processed your request. You can see the details on your screen now.";
        successTrigger = true;
      } 
      else {
        responseText = "I am listening. Could you please clarify your request regarding your residence?";
      }

      // Execute Response
      speak(responseText);
      if (successTrigger) setShowSuccessCard(true);
    }, 1000);
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const greeting = `Hello ${residentName}. I am Aisha. How can I help you today?`;
    // Wait for voices to load
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => speak(greeting);
    } else {
      setTimeout(() => speak(greeting), 500);
    }
  }, [residentName]);

  // --- DYNAMIC STYLES FOR THE "JARVIS" ORB ---
  const getOrbStyles = () => {
    switch(status) {
      case 'listening':
        return "bg-red-500 shadow-[0_0_60px_rgba(239,68,68,0.6)] scale-110 animate-pulse";
      case 'speaking':
        return "bg-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.6)] scale-105 animate-bounce-slow"; // Custom slow bounce
      case 'processing':
        return "bg-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.6)] animate-spin";
      default: // idle
        return "bg-slate-700 shadow-[0_0_30px_rgba(51,65,85,0.4)] hover:scale-105";
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white font-sans overflow-hidden relative">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black z-0"></div>

      {/* HEADER */}
      <div className="relative z-10 p-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-light tracking-[0.2em] text-white/80">AISHA</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${status === 'idle' ? 'bg-slate-500' : 'bg-green-400 animate-pulse'}`}></span>
            <span className="text-xs text-slate-400 uppercase tracking-widest">{status}</span>
          </div>
        </div>
        
        <div className="flex gap-4">
           <button onClick={() => setIsVoiceEnabled(!isVoiceEnabled)} className="text-white/50 hover:text-white transition">
             {isVoiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
           </button>
           <button onClick={onLogout} className="text-white/50 hover:text-red-400 transition">
             <LogOut size={20} />
           </button>
        </div>
      </div>

      {/* MAIN INTERFACE */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
        
        {/* SUCCESS CARD OVERLAY */}
        {showSuccessCard && (
           <div className="absolute top-10 animate-in fade-in zoom-in duration-500 z-50">
             <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl w-80 text-center shadow-2xl">
               <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                 <Sparkles className="text-white" />
               </div>
               <h3 className="text-xl font-semibold mb-1">Request Confirmed</h3>
               <p className="text-sm text-white/70 mb-4">Access Card Replacement</p>
               <div className="bg-black/20 rounded-lg p-3 mb-2">
                 <p className="text-xs text-white/50 uppercase">Charge</p>
                 <p className="text-lg font-bold text-amber-400">{FEE_AMOUNT}</p>
               </div>
               <p className="text-xs text-white/40">Added to next maintenance bill</p>
             </div>
           </div>
        )}

        {/* THE "JARVIS" ORB */}
        <div className="relative mb-12 group">
          {/* Outer Glow Rings */}
          <div className={`absolute inset-0 rounded-full border border-white/10 scale-150 ${status === 'listening' ? 'animate-ping opacity-20' : 'opacity-0'}`}></div>
          <div className={`absolute inset-0 rounded-full border border-white/5 scale-[2] ${status === 'speaking' ? 'animate-pulse opacity-20' : 'opacity-0'}`}></div>
          
          {/* Core Orb Button */}
          <button 
            onClick={handleListen}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ease-out ${getOrbStyles()}`}
          >
            {status === 'listening' ? (
              <Mic size={40} className="text-white animate-pulse" />
            ) : status === 'processing' ? (
              <Sparkles size={40} className="text-white animate-spin-slow" />
            ) : (
              <Mic size={40} className="text-white/80" />
            )}
          </button>
        </div>

        {/* TEXT FEEDBACK */}
        <div className="h-24 text-center px-4 max-w-lg">
           {status === 'listening' ? (
             <p className="text-2xl font-light text-white/90 animate-pulse">"{transcript}"</p>
           ) : status === 'speaking' ? (
             <p className="text-xl text-amber-200/90 font-medium leading-relaxed">{lastResponse}</p>
           ) : (
             <p className="text-sm text-white/30 uppercase tracking-widest">Tap the Orb to Speak</p>
           )}
        </div>

      </div>
    </div>
  );
};

export default Aisha;