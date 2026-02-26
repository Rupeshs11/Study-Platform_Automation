import { useState, useRef, useEffect } from 'react';
import { doubtApi } from '../api/doubts';
import { aiApi } from '../api/ai';
import { useGamification } from '../context/GamificationContext';
import type { DoubtHistory, AIModel } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Loader2,
  ChevronRight,
  ChevronDown,
  MessageCircleQuestion,
  Bot,
  User,
  History,
  X,
  CheckCircle2,
  AlertCircle,
  Cpu,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  resolved?: boolean;
}

export default function Doubts() {
  const { refresh: refreshGamification } = useGamification();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<DoubtHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Model state
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedModelName, setSelectedModelName] = useState<string>('');
  const [showModelPicker, setShowModelPicker] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const res = await aiApi.getModels();
      if (res.data.success) {
        const data = res.data.data;
        setModels(data.models);
        setSelectedModel(data.defaultModel);
        const defaultModel = data.models.find((m: AIModel) => m.id === data.defaultModel);
        setSelectedModelName(defaultModel?.name || data.defaultModel);
      }
    } catch {
      // models endpoint unavailable — no model picker shown
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const doubt = input.trim();
    if (!doubt || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: doubt, timestamp: new Date() }]);
    setLoading(true);

    try {
      const res = await doubtApi.ask({
        doubt,
        includeUserHistory: true,
        maxHistoryItems: 5,
        model: selectedModel || undefined,
      });

      if (res.data.success && res.data.data) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: res.data.data.answer,
            timestamp: new Date(),
            resolved: res.data.data.resolved,
          },
        ]);
        refreshGamification();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Failed to get a response. Please try again.',
            timestamp: new Date(),
            resolved: false,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'An error occurred while processing your question.',
          timestamp: new Date(),
          resolved: false,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const loadHistory = async () => {
    setShowHistory(true);
    setHistoryLoading(true);
    try {
      const res = await doubtApi.getHistory(20);
      if (res.data.success) setHistory(res.data.data);
    } catch {
      // silently handle
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="h-full flex flex-col fade-in">
      {/* Header */}
      <div className="px-10 py-5 border-b border-border-primary bg-bg-secondary shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-text-muted text-xs mb-0.5">
            <ChevronRight size={10} className="text-accent-green" />
            ~/doubts
          </div>
          <h1 className="text-sm font-semibold text-text-bright">AI doubt solver</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Model selector */}
          {models.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowModelPicker(!showModelPicker)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-secondary hover:text-accent-cyan border border-border-primary rounded hover:border-accent-cyan/30 transition-colors cursor-pointer"
              >
                <Cpu size={10} />
                <span className="max-w-[120px] truncate">{selectedModelName || 'select model'}</span>
                <ChevronDown size={10} />
              </button>

              {showModelPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowModelPicker(false)} />
                  <div className="absolute right-0 top-full mt-1 w-72 bg-bg-secondary border border-border-primary rounded shadow-lg z-50 overflow-hidden">
                    <div className="px-3 py-2 border-b border-border-primary text-[10px] text-text-muted uppercase tracking-wider">
                      ai model
                    </div>
                    {models.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setSelectedModel(m.id);
                          setSelectedModelName(m.name);
                          setShowModelPicker(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 hover:bg-bg-hover transition-colors cursor-pointer ${
                          selectedModel === m.id ? 'bg-bg-active' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-primary">{m.name}</span>
                          {selectedModel === m.id && (
                            <span className="text-[10px] text-accent-green">active</span>
                          )}
                        </div>
                        <div className="text-[10px] text-text-muted mt-0.5">
                          {m.provider} | {m.maxTokens} tokens | {m.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={loadHistory}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-text-secondary hover:text-accent-blue border border-border-primary rounded hover:border-accent-blue/30 transition-colors cursor-pointer"
          >
            <History size={12} />
            history
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageCircleQuestion size={36} className="text-text-muted mx-auto mb-4" />
              <h2 className="text-sm text-text-secondary mb-2">ask anything</h2>
              <p className="text-xs text-text-muted leading-relaxed">
                powered by NVIDIA AI{selectedModelName ? ` (${selectedModelName})` : ''}. ask questions about
                programming, concepts, debugging, or anything you're learning.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                {[
                  'Explain closures in JavaScript',
                  'How does garbage collection work?',
                  'What is the difference between REST and GraphQL?',
                  'Explain Big O notation',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
                    className="px-4 py-3 text-[12px] text-left text-text-secondary border border-border-primary rounded bg-bg-secondary hover:border-accent-blue/30 hover:text-accent-blue transition-colors cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto p-10 space-y-8">
            {messages.map((msg, idx) => (
              <div key={idx} className="fade-in">
                {msg.role === 'user' ? (
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center rounded bg-accent-dim-blue shrink-0 mt-0.5">
                      <User size={14} className="text-accent-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-text-muted mb-1.5">you</div>
                      <p className="text-sm text-text-primary">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 flex items-center justify-center rounded bg-accent-dim-green shrink-0 mt-0.5">
                      <Bot size={14} className="text-accent-green" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[12px] text-text-muted">ai assistant</span>
                        {selectedModelName && (
                          <span className="text-[10px] text-accent-cyan">{selectedModelName}</span>
                        )}
                        {msg.resolved !== undefined && (
                          msg.resolved ? (
                            <span className="flex items-center gap-1 text-[11px] text-accent-green">
                              <CheckCircle2 size={9} /> resolved
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-accent-orange">
                              <AlertCircle size={9} /> partial
                            </span>
                          )
                        )}
                      </div>
                      <div className="markdown-content text-sm border border-border-primary rounded bg-bg-secondary p-5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-4 fade-in">
                <div className="w-8 h-8 flex items-center justify-center rounded bg-accent-dim-green shrink-0 mt-0.5">
                  <Bot size={14} className="text-accent-green" />
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary py-2">
                  <Loader2 size={12} className="spinner" />
                  <span>thinking{selectedModelName ? ` (${selectedModelName})` : ''}...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border-primary bg-bg-secondary p-6 shrink-0">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2 border border-border-primary rounded bg-bg-primary focus-within:border-accent-green transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-text-primary focus:outline-none resize-none font-[inherit] min-h-[42px] max-h-[120px]"
              placeholder="ask a question... (enter to send, shift+enter for newline)"
              rows={1}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-3 text-text-muted hover:text-accent-green disabled:opacity-30 transition-colors cursor-pointer"
            >
              <Send size={15} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[12px] text-text-muted">
            <span>
              {selectedModelName
                ? `model: ${selectedModelName.toLowerCase()}`
                : 'powered by nvidia ai'}
            </span>
            <span>enter to send</span>
          </div>
        </form>
      </div>

      {/* History sidebar */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setShowHistory(false)} />
          <div className="w-96 bg-bg-secondary border-l border-border-primary overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-primary sticky top-0 bg-bg-secondary z-10">
              <div className="flex items-center gap-2">
                <History size={14} className="text-accent-cyan" />
                <span className="text-sm font-medium">doubt history</span>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X size={14} />
              </button>
            </div>

            {historyLoading ? (
              <div className="p-8 flex items-center justify-center text-text-secondary text-xs">
                <Loader2 size={12} className="spinner mr-2" />
                loading...
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                no history yet
              </div>
            ) : (
              <div className="divide-y divide-border-primary">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="px-5 py-4 hover:bg-bg-hover transition-colors cursor-pointer"
                    onClick={() => {
                      setMessages((prev) => [
                        ...prev,
                        { role: 'user', content: item.content, timestamp: new Date(item.createdAt) },
                        { role: 'assistant', content: item.aiResponse, timestamp: new Date(item.respondedAt || item.createdAt), resolved: item.resolved },
                      ]);
                      setShowHistory(false);
                    }}
                  >
                    <p className="text-xs text-text-primary truncate">{item.content}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[12px] text-text-muted">
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.resolved ? (
                        <span className="text-accent-green">resolved</span>
                      ) : (
                        <span className="text-accent-orange">unresolved</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
