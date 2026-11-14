'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';

export default function ResearchAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([
    { role: 'assistant', content: 'مرحباً بك! أنا المساعد الذكي للمستودع. كيف يمكنني مساعدتك في بحثك اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // التمرير التلقائي لآخر رسالة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      const data = await response.json();
      
      if (data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: 'عذراً، حدث خطأ. يرجى المحاولة لاحقاً.' }]);
      }
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: 'تعذر الاتصال بالخادم.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* الزر العائم */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 left-6 p-4 rounded-full bg-[#1B4D3E] text-white shadow-lg hover:bg-[#153d31] transition-transform hover:scale-105 z-50 flex items-center justify-center ${isOpen ? 'hidden' : ''}`}
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* نافذة المحادثة */}
      {isOpen && (
        <div className="fixed bottom-6 left-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden" style={{ height: '500px' }}>
          
          {/* الترويسة */}
          <div className="bg-[#1B4D3E] p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-bold">المساعد الذكي</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* الرسائل */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#1B4D3E] text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1B4D3E]" />
                  <span className="text-sm text-gray-500">جاري التفكير...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* حقل الإدخال */}
          <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اسأل عن أي شيء..."
              className="flex-1 p-2 border rounded-xl outline-none text-sm focus:ring-2 focus:ring-[#1B4D3E]"
            />
            <button 
              type="submit" 
              disabled={loading || !input.trim()}
              className="bg-[#1B4D3E] text-white p-2 rounded-xl disabled:opacity-50 transition"
            >
              <Send className="w-5 h-5 rotate-180" />
            </button>
          </form>

        </div>
      )}
    </>
  );
}