import React, { useState, useEffect, useRef } from 'react';
import { Mic, Send, Sparkles } from 'lucide-react';

// --- CONFIGURATION ---
const RESIDENT_NAME = "John";
const FEE_AMOUNT = "250 AED";

const Aisha = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [requestStatus, setRequestStatus] = useState("idle"); // idle, processing, complete
  
  const chatEndRef = useRef(null);

  // --- 1. VOICE SYNTHESIS (Aisha Speaks) ---
  const speak = (text) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any current speech to avoid overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Attempt to select a female voice (Google or System default)
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English'));
    
    if (femaleVoice) utterance.voice = femaleVoice;
    utterance.lang = 'en-US'; 
    utterance.rate = 1;
    utterance.pitch = 1;
    
    window.speechSynthesis.speak(utterance);
  };

  // --- 2. VOICE RECOGNITION (User Speaks) ---
  const handleListen = () => {
    // Browser compatibility check
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
      // Optional: Auto-send on voice stop
      // handleSendMessage(transcript); 
    };

    recognition.start();
  };

  // --- 3. THE BRAIN (Simulated Logic) ---
  const getAishaResponse = async (userText) => {
    const lowerText = userText.toLowerCase();

    // SCRIPT STEP 3 -> 4: Lost Card Logic
    if (lowerText.includes("lost") && lowerText.includes("card")) {
      return {
        text: "Sorry to hear that. It’s quite unfortunate. Let me help you with that. Can you let me know when did you lose your card?",
        status: "idle"
      };
    }
    
    // SCRIPT STEP 5 -> 6: Date Provided Logic
    if (lowerText.includes("yesterday") || lowerText.includes("day") || lowerText.includes("ago")) {
      return {
        text: `I shall register your request for a replacement card. You will be charged ${FEE_AMOUNT} for this. The charges will reflect in your maintenance bill next month. Shall I proceed with replacement?`,
        status: "idle"
      };
    }

    // SCRIPT STEP 7 -> 8: Confirmation Logic
    if (lowerText.includes("yes") || lowerText.includes("sure") || lowerText.includes("go ahead") || lowerText.includes("please")) {
      return {
        text: "I have processed your request. You can see the details on your screen now.",
        status: "complete" // This triggers the UI Card
      };
    }

    // Fallback
    return {
      text: "I am listening. Could you please clarify your request regarding your residence?",
      status: "idle"
    };
  };

  const handleSendMessage = async (textOverride = null) => {
    const textToSend = textOverride || inputText;
    if (!textToSend.trim()) return;

    // Add User Message
    const newMessages = [...messages, { sender: 'user', text: textToSend }];
    setMessages(newMessages);
    setInputText("");

    // Simulate AI thinking delay
    setTimeout(async () => {
      const response = await getAishaResponse(textToSend);
      
      setMessages(prev => [...prev, { sender: 'aisha', text: response.text }]);
      speak(response.text);
      
      if (response.status === "complete") {
        setRequestStatus("complete");
      }
      
    }, 800);
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    // Load voices immediately so they are ready
    window.speechSynthesis.getVoices();

    const greeting = `Hello ${RESIDENT_NAME}! I am Aisha, your Residence assistant. I am here exclusively to help you with your residence community needs. How can I help you today?`;
    
    // Add greeting to chat (Voice usually requires user interaction first in modern browsers)
    setTimeout(() => {
      setMessages([{ sender: 'aisha', text: greeting }]);
    }, 500);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, requestStatus]);

  // --- RENDER ---
  return (
    <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-4 font-sans text-slate-800">
      
      {/* APP CONTAINER */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col h-[85vh]">
        
        {/* HEADER */}
        <div className="bg-slate-900 p-5 flex items-center justify-between text-white shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-amber-300 to-amber-600 rounded-full flex items-center justify-center text-slate-900 font-bold shadow-lg ring-2 ring-amber-200/50">
              AI
            </div>
            <div>
              <h1 className="font-semibold text-lg tracking-wide">Aisha</h1>
              <p className="text-[10px] text-amber-400 uppercase tracking-wider">Emaar Residence Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full border border-white/5">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-medium">Online</span>
          </div>
        </div>

        {/* CHAT AREA */}
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
          
          {/* GENERATIVE UI COMPONENT (Appears on Success) */}
          {requestStatus === "complete" && (
            <div className="animate-in zoom-in duration-500 mt-6 mb-2 mx-2">
              <div className="bg-white border border-green-100 shadow-xl rounded-2xl overflow-hidden">
                {/* Card Header */}
                <div className="bg-green-50 p-3 border-b border-green-100 flex items-center gap-2">
                   <div className="bg-green-100 p-1 rounded-full">
                     <Sparkles size={16} className="text-green-600" />
                   </div>
                   <h3 className="font-bold text-green-800 text-sm">Request Successful</h3>
                </div>
                
                {/* Card Body */}
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Request ID</span>
                    <span className="font-mono">#EMR-8821</span>
                  </div>
                  
                  <hr className="border-gray-100" />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Resident</span>
                      <span className="font-semibold text-slate-800">{RESIDENT_NAME}</span>
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

        {/* INPUT AREA */}
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