import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Sparkles, LogOut, Volume2, VolumeX } from 'lucide-react';

const FEE_AMOUNT = "250 AED";

const Aisha = ({ user, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true); // Default: ON
  const [requestStatus, setRequestStatus] = useState("idle"); 
  
  const chatEndRef = useRef(null);
  const residentName = user?.name || "Resident";

  // --- 1. ROBUST VOICE ENGINE ---
  const speak = (text) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;

    // Helper to actually trigger the speech
    const triggerSpeech = () => {
      window.speechSynthesis.cancel(); // Stop previous

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      
      // Try to find a good female voice
      const femaleVoice = voices.find(v => 
        v.name.includes('Google US English') || 
        v.name.includes('Samantha') || 
        v.name.includes('Female')
      );
      
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.lang = 'en-US'; 
      utterance.rate = 1;

      window.speechSynthesis.speak(utterance);
    };

    // Chrome specific: Voices load asynchronously
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        triggerSpeech();
        window.speechSynthesis.onvoiceschanged = null; // Remove listener after use
      };
    } else {
      triggerSpeech();
    }
  };

  const toggleVoice = () => {
    const newState = !isVoiceEnabled;
    setIsVoiceEnabled(newState);
    if (!newState) {
      window.speechSynthesis.cancel();
    }
  };

  // --- 2. VOICE RECOGNITION ---
  const handleListen = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser. Please use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
    };

    recognition.start();
  };

  // --- 3. THE BRAIN ---
  const getAishaResponse = async (userText) => {
    const lowerText = userText.toLowerCase();

    if (lowerText.includes("lost") && lowerText.includes("card")) {
      return {
        text: "Sorry to hear that. It’s quite unfortunate. Let me help you with that. Can you let me know when did you lose your card?",
        status: "idle"
      };
    }
    
    if (lowerText.includes("yesterday") || lowerText.includes("day") || lowerText.includes("ago")) {
      return {
        text: `I shall register your request for a replacement card. You will be charged ${FEE_AMOUNT} for this. The charges will reflect in your maintenance bill next month. Shall I proceed with replacement?`,
        status: "idle"
      };
    }

    if (lowerText.includes("yes") || lowerText.includes("sure") || lowerText.includes("go ahead") || lowerText.includes("please")) {
      return {
        text: "I have processed your request. You can see the details on your screen now.",
        status: "complete"
      };
    }

    return {
      text: "I am listening. Could you please clarify your request regarding your residence?",
      status: "idle"
    };
  };

  const handleSendMessage = async (textOverride = null) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;

    const newMessages = [...messages, { sender: 'user', text: textToSend }];
    setMessages(newMessages);
    setInputText("");

    setTimeout(async () => {
      const response = await getAishaResponse(textToSend);
      setMessages(prev => [...prev, { sender: 'aisha', text: response.text }]);
      speak(response.text);
      if (response.status === "complete") setRequestStatus("complete");
    }, 800);
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const greeting = `Hello ${residentName}! I am Aisha, your Residence assistant. I am here exclusively to help you with your residence community needs. How can I help you today?`;
    
    // Add text to chat immediately
    setMessages([{ sender: 'aisha', text: greeting }]);
    
    // Try to speak immediately (might be blocked by browser)
    speak(greeting);

    // Fallback: If voices weren't ready, try again in 500ms
    const timer = setTimeout(() => {
       if (window.speechSynthesis.speaking === false && isVoiceEnabled) {
         speak(greeting);
       }
    }, 500);

    return () => clearTimeout(timer);
  }, [residentName]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, requestStatus]);

  // --- RENDER ---
  return (
    <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-4 font-sans text-slate-800">
      
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 flex items-center justify-between text-white shadow-md z-10">
          <div>
            <h1 className="font-semibold text-lg tracking-wide">Aisha</h1>
            <p className="text-[10px] text-amber-400 uppercase tracking-wider">Emaar Residence Assistant</p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Voice Toggle */}
            <button 
              onClick={toggleVoice}
              className={`p-2 rounded-full transition-colors ${
                isVoiceEnabled 
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
              }`}
              title={isVoiceEnabled ? "Mute Voice" : "Enable Voice"}
            >
              {isVoiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>

            {/* Logout */}
            <button 
              onClick={onLogout}
              className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-colors"
            >
              <LogOut size={12} />
              Logout
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 scroll-smooth">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div 
                className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-sm leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-slate-800 text-white rounded-tr-sm' 
                    : 'bg-white text-slate-700 border border-gray-100 rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          
          {/* Success Card */}
          {requestStatus === "complete" && (
            <div className="animate-in zoom-in duration-500 mt-6 mb-2 mx-2">
              <div className="bg-white border border-green-100 shadow-xl rounded-2xl overflow-hidden">
                <div className="bg-green-50 p-3 border-b border-green-100 flex items-center gap-2">
                   <div className="bg-green-100 p-1 rounded-full">
                     <Sparkles size={16} className="text-green-600" />
                   </div>
                   <h3 className="font-bold text-green-800 text-sm">Request Successful</h3>
                </div>
                
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Request ID</span>
                    <span className="font-mono">#EMR-8821</span>
                  </div>
                  <hr className="border-gray-100" />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Resident</span>
                      <span className="font-semibold text-slate-800">{residentName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Time</span>
                      <span className="font-semibold text-slate-800">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Service</span>
                      <span className="font-semibold text-slate-800">Access Card Replacement</span>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2 flex justify-between items-center">
                    <span className="text-xs font-medium text-slate-500">Applicable Charges</span>
                    <span className="font-bold text-amber-600">{FEE_AMOUNT}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
          <div className="flex gap-2 items-center">
            <button 
              onClick={handleListen}
              className={`p-3 rounded-full transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 text-white shadow-lg ring-4 ring-red-200 scale-110' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <Mic size={20} className={isListening ? "animate-pulse" : ""} />
            </button>
            
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? "Listening..." : "Type or speak..."}
                className="w-full bg-slate-50 border border-slate-200 rounded-full py-3 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
            </div>
            
            <button 
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className={`p-3 rounded-full transition-all duration-200 ${
                inputText.trim() 
                  ? 'bg-slate-900 text-white shadow-md hover:bg-slate-800 transform hover:-translate-y-1' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Aisha;