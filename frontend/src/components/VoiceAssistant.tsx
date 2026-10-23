import { useState } from 'react';
import axios from 'axios';
import { Mic, MicOff, MessageSquare, X, Volume2, Sparkles } from 'lucide-react';

export default function VoiceAssistant() {
  const [open, setOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize Speech Recognition
  let recognition: any = null;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
  }

  const handleStartListen = () => {
    if (!recognition) {
      alert('Speech Recognition is not supported in this browser. Try Chrome or Safari!');
      return;
    }
    setIsListening(true);
    setReply('');
    recognition.start();
  };

  if (recognition) {
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setQuery(text);
      setIsListening(false);
      handleSubmitQuery(text);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }

  const handleSubmitQuery = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setReply('');
    try {
      const response = await axios.post('/api/intelligence/chat', { query: searchQuery });
      const answer = response.data.answer || 'No response';
      setReply(answer);

      // Auto text-to-speech speak reply
      speakResponse(answer);
    } catch (err) {
      setReply('System failed to process conversational request.');
    } finally {
      setLoading(false);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel active speech speaking first
      window.speechSynthesis.cancel();
      const utterance = new SynthesisUtterance(text); // fallback/resilient SpeechSynthesisUtterance mapping
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Helper type mapping for resilient Synthesis
  const SynthesisUtterance = (window as any).SpeechSynthesisUtterance || SpeechSynthesisUtterance;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="w-80 md:w-96 glass p-6 rounded-3xl border border-border shadow-2xl space-y-4 text-left relative transition-all">
          <button
            onClick={() => {
              setOpen(false);
              window.speechSynthesis.cancel();
            }}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-foreground hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all"
          >
            <X className="w-4.5 h-4.5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="p-2 bg-primary/10 rounded-xl text-primary">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Neural Conversationalist</h4>
              <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-widest">Voice and Text AI Assistant</p>
            </div>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-neutral-400">Your Query</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask: Where did I spend the most?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitQuery(query)}
                  className="flex-1 glass py-2 px-3 rounded-xl text-xs focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={handleStartListen}
                  className={`p-2 rounded-xl transition-all ${
                    isListening ? 'bg-rose-500 text-white animate-pulse' : 'glass border border-border text-primary'
                  }`}
                  title={isListening ? 'Listening...' : 'Activate Speech Microphone'}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loading && (
              <p className="text-xs text-neutral-400 font-light animate-pulse">Running semantic parsing index...</p>
            )}

            {reply && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] uppercase font-bold text-primary">System Feed</p>
                  <button
                    onClick={() => speakResponse(reply)}
                    className="p-1 text-neutral-400 hover:text-primary transition-all"
                    title="Speak Answer aloud"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 bg-neutral-100/50 dark:bg-neutral-900/40 rounded-xl border border-border text-xs leading-relaxed font-light text-neutral-800 dark:text-neutral-200">
                  {reply}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="p-4 rounded-full bg-primary text-white hover:bg-primary-dark shadow-2xl hover:scale-105 transition-all flex items-center justify-center animate-bounce"
          title="Open AI Conversationalist"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
