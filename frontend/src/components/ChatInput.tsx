import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { GENAI_API_URL } from '../config';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onResponseReceived: (response: string) => void;
  placeholder?: string;
  action?: string; // Add action prop for quick actions
  context?: any; // Add context prop for campaign context
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  value, 
  onChange, 
  onSend,
  onResponseReceived,
  placeholder = 'Describe your campaign goals...',
  action = 'chat',
  context = {}
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendWithAPI();
    }
  };

  const handleSendWithAPI = async () => {
    if (!value.trim() || isLoading) return;

    const userMessage = value;
    
    // Call the parent's onSend to add user message to chat
    onSend();
    
    // Clear input immediately
    onChange('');
    
    // Set loading state
    setIsLoading(true);

    try {
      const response = await fetch(`${GENAI_API_URL}/genai_call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          action: action,
          locale: 'US (en-US), currency $', // You can make this dynamic if needed
          context: {
            brand: context.brand || 'unknown',
            product: context.product || 'unknown',
            category: context.category || 'unknown',
            market: context.market || 'unknown',
            pricing: context.pricing || 'unknown',
            objective: context.objective || 'unknown',
            kpi: context.kpi || 'unknown',
            budget: context.budget || 'unknown',
            timeline: context.timeline || 'unknown',
            stage: context.stage || 'unknown',
            channels: context.channels || 'unknown',
            competitors: context.competitors || 'unknown',
            constraints: context.constraints || 'none'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Pass the bot response back to parent
      onResponseReceived(data.reply || 'I apologize, but I couldn\'t generate a response.');
      
    } catch (error) {
      console.error('Error calling API:', error);
      
      // Pass error message to parent
      onResponseReceived(`I apologize, but I encountered an error connecting to the server. Please make sure the backend is running on ${GENAI_API_URL} and try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 border-t border-slate-200">
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={isLoading}
          className="flex-1 px-5 py-3.5 rounded-xl border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSendWithAPI}
          disabled={!value.trim() || isLoading}
          className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Sending...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span className="text-sm">Send</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;