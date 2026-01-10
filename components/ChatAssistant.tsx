
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, ReceiptData, UserContext } from '../types';
import { chatWithAssistant } from '../services/geminiService';

interface ChatAssistantProps {
  history: ReceiptData[];
  userProfile: UserContext;
  chatLog: ChatMessage[];
  onNewMessage: (msg: ChatMessage) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ history, userProfile, chatLog, onNewMessage }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [chatLog, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    onNewMessage(userMsg);
    setInput('');
    setIsTyping(true);

    try {
      const response = await chatWithAssistant(input, history, userProfile, chatLog);
      onNewMessage({ role: 'model', text: response });
    } catch (err) {
      onNewMessage({ role: 'model', text: "I'm having trouble connecting right now. Please try again." });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {chatLog.length === 0 && (
          <div className="text-center py-10 px-6 space-y-4">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
              <i className="fa-solid fa-robot text-2xl"></i>
            </div>
            <p className="text-slate-500 text-sm">
              I can analyze your shopping patterns, suggest recipes, or help with your budget. 
              Ask me anything about your history!
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button onClick={() => setInput("What was my biggest expense this month?")} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50">"What's my biggest expense?"</button>
              <button onClick={() => setInput("Suggest a healthy dinner based on my items.")} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-50">"Suggest a healthy dinner"</button>
            </div>
          </div>
        )}

        {chatLog.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your coach..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        <button 
          disabled={!input.trim() || isTyping}
          className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition"
        >
          <i className="fa-solid fa-paper-plane"></i>
        </button>
      </form>
    </div>
  );
};

export default ChatAssistant;
