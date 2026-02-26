import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { chatApi, streamChatMessage } from '../api/chat';
import { aiApi } from '../api/ai';
import type { ChatSession, ChatMessage, AIModel } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Send,
  Square,
  Loader2,
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Brain,
  Cpu,
  Bot,
  User,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  Copy,
  Check,
  List,
} from 'lucide-react';

// ── Helpers ──

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

interface TocHeading {
  level: number;
  text: string;
  id: string;
}

function extractHeadings(content: string, msgIndex: number): TocHeading[] {
  const headings: TocHeading[] = [];
  // Strip think tags and code blocks before parsing headings
  const cleaned = stripThinkTags(content)
    .replace(/```[\s\S]*?```/g, '') // remove fenced code blocks
    .replace(/`[^`]+`/g, '');       // remove inline code
  const lines = cleaned.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`\[\]]/g, '').trim();
      const slug = slugify(text);
      const id = `msg-${msgIndex}-${slug}`;
      if (text && slug) {
        headings.push({ level, text, id });
      }
    }
  }
  return headings;
}

// ── Code Block with copy button ──

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="nexus-code-block">
      <div className="nexus-code-header">
        <span>{language}</span>
        <button onClick={handleCopy} className="nexus-code-copy">
          {copied ? (
            <span className="flex items-center gap-1"><Check size={13} /> copied</span>
          ) : (
            <span className="flex items-center gap-1"><Copy size={13} /> copy</span>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          background: '#0d1117',
          fontSize: '14px',
          lineHeight: '1.5',
        }}
        codeTagProps={{
          style: {
            background: 'transparent',
          },
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}

// ── Thinking Block (collapsible, ChatGPT/Claude style) ──

function ThinkingBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [isOpen, setIsOpen] = useState(isStreaming ?? false);

  // Auto-collapse when streaming finishes
  useEffect(() => {
    if (!isStreaming && content) {
      setIsOpen(false);
    }
  }, [isStreaming]);

  // Keep open while streaming
  useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    }
  }, [isStreaming]);

  const thinkingDuration = content ? Math.ceil(content.length / 80) : 0;

  return (
    <div className="nexus-thinking-block-v2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="nexus-thinking-toggle-v2"
      >
        {isStreaming ? (
          <Loader2 size={14} className="spinner text-text-muted" />
        ) : (
          <Brain size={14} className="text-text-muted" />
        )}
        <span className="text-text-secondary">
          {isStreaming ? 'Thinking...' : `Thought for ${thinkingDuration}s`}
        </span>
        <ChevronDown
          size={14}
          className={`text-text-muted transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
        />
      </button>
      {isOpen && (
        <div className={`nexus-thinking-body-v2 ${isStreaming ? 'streaming' : ''}`}>
          {content}
          {isStreaming && <span className="nexus-stream-cursor" />}
        </div>
      )}
    </div>
  );
}

// ── Markdown Renderer ──

function stripThinkTags(text: string): string {
  // Remove <think>...</think> blocks (including partial/unclosed tags from streaming)
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '') // partial unclosed tag at end
    .replace(/<\/think>/gi, '')       // orphaned closing tag
    .trim();
}

function preprocessTreeBlocks(text: string): string {
  // Detect consecutive lines containing tree/box-drawing characters and wrap in fenced code blocks
  const lines = text.split('\n');
  const result: string[] = [];
  let treeBuffer: string[] = [];
  const treePattern = /[├└│─┌┐┘┬┴┼╠╚║═╔╗╝╦╩╬┤╣╟╢╤╧╪▸▹►▶●○◆◇■□▪▫]/;

  const flushTree = () => {
    if (treeBuffer.length > 0) {
      result.push('```');
      result.push(...treeBuffer);
      result.push('```');
      treeBuffer = [];
    }
  };

  for (const line of lines) {
    if (treePattern.test(line)) {
      treeBuffer.push(line);
    } else {
      flushTree();
      result.push(line);
    }
  }
  flushTree();

  return result.join('\n');
}

function MarkdownContent({ content, msgIndex = 0 }: { content: string; msgIndex?: number }) {
  // Pre-process: strip <think> tags, wrap tree/ASCII art in code blocks
  const processed = preprocessTreeBlocks(stripThinkTags(content));

  return (
    <div className="nexus-markdown text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className || '');
            if (match) {
              return (
                <CodeBlock language={match[1]}>
                  {String(children).replace(/\n$/, '')}
                </CodeBlock>
              );
            }
            return <code className={className}>{children}</code>;
          },
          h1({ children }) {
            const text = typeof children === 'string' ? children : String(children);
            return <h1 id={`msg-${msgIndex}-${slugify(text)}`}>{children}</h1>;
          },
          h2({ children }) {
            const text = typeof children === 'string' ? children : String(children);
            return <h2 id={`msg-${msgIndex}-${slugify(text)}`}>{children}</h2>;
          },
          h3({ children }) {
            const text = typeof children === 'string' ? children : String(children);
            return <h3 id={`msg-${msgIndex}-${slugify(text)}`}>{children}</h3>;
          },
          pre({ children }) {
            // prevent double-wrapping with SyntaxHighlighter
            return <>{children}</>;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}

// ── Message Bubble ──

function MessageBubble({ message, msgIndex }: { message: ChatMessage; msgIndex: number }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end fade-in">
        <div className="max-w-[75%]">
          <div className="flex items-center justify-end gap-2.5 mb-1.5">
            <span className="text-[14px] text-text-muted">you</span>
            <div className="w-6 h-6 flex items-center justify-center rounded bg-accent-dim-blue">
              <User size={13} className="text-accent-blue" />
            </div>
          </div>
          <div className="bg-accent-dim-blue/40 border border-accent-blue/20 rounded-lg px-5 py-3 text-base text-text-primary whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start fade-in">
      <div className="max-w-[85%] min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-6 h-6 flex items-center justify-center rounded bg-accent-dim-green">
            <Bot size={13} className="text-accent-green" />
          </div>
          <span className="text-[14px] text-text-muted">nexus</span>
          {message.model && (
            <span className="text-[13px] text-accent-cyan">{message.model.split('/').pop()}</span>
          )}
        </div>
        {message.thinking && (
          <ThinkingBlock content={message.thinking} />
        )}
        <MarkdownContent content={message.content} msgIndex={msgIndex} />
      </div>
    </div>
  );
}

// ── Streaming Message ──

function StreamingMessage({
  content,
  thinking,
  modelName,
  isThinking,
  msgIndex,
}: {
  content: string;
  thinking: string;
  modelName?: string;
  isThinking: boolean;
  msgIndex: number;
}) {
  return (
    <div className="flex justify-start fade-in">
      <div className="max-w-[85%] min-w-0">
        <div className="flex items-center gap-2.5 mb-1.5">
          <div className="w-6 h-6 flex items-center justify-center rounded bg-accent-dim-green">
            <Bot size={13} className="text-accent-green" />
          </div>
          <span className="text-[14px] text-text-muted">nexus</span>
          {modelName && <span className="text-[13px] text-accent-cyan">{modelName}</span>}
          <Loader2 size={13} className="spinner text-accent-cyan" />
        </div>
        {thinking && (
          <ThinkingBlock content={thinking} isStreaming={isThinking} />
        )}
        {content ? (
          <div>
            <MarkdownContent content={content} msgIndex={msgIndex} />
            <span className="nexus-stream-cursor" />
          </div>
        ) : (
          !thinking && (
            <div className="flex items-center gap-2.5 text-sm text-text-secondary py-2.5">
              <Loader2 size={15} className="spinner" />
              <span>generating response...</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Empty State ──

function EmptyState({
  modelName,
  onSuggestion,
}: {
  modelName?: string;
  onSuggestion: (text: string) => void;
}) {
  const suggestions = [
    'Explain closures in JavaScript',
    'How does garbage collection work in Java?',
    'Difference between REST and GraphQL',
    'What is Big O notation?',
    'Explain the SOLID principles',
    'How does async/await work?',
  ];

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-lg px-6">
        <div className="flex items-center justify-center gap-2.5 mb-5">
          <Sparkles size={34} className="text-accent-cyan" />
        </div>
        <h2 className="text-xl text-text-bright font-semibold mb-1.5">nexus ai</h2>
        <p className="text-sm text-text-muted leading-relaxed mb-8">
          powered by NVIDIA AI{modelName ? ` (${modelName})` : ''}. ask anything about
          programming, concepts, debugging, or whatever you're learning.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="px-5 py-3.5 text-[15px] text-left text-text-secondary border border-border-primary rounded bg-bg-secondary hover:border-accent-cyan/30 hover:text-accent-cyan transition-colors cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── On This Page (TOC sidebar) ──

function OnThisPage({
  headings,
  scrollRef,
}: {
  headings: TocHeading[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [activeId, setActiveId] = useState<string>('');

  // Track which heading is in view via IntersectionObserver
  useEffect(() => {
    if (!scrollRef.current || headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first entry that is intersecting
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        root: scrollRef.current,
        rootMargin: '-5% 0px -75% 0px',
        threshold: 0,
      }
    );

    // Observe all heading elements that match our current headings
    const ids = new Set(headings.map((h) => h.id));
    const headingEls = scrollRef.current.querySelectorAll('h1[id], h2[id], h3[id]');
    headingEls.forEach((el) => {
      if (ids.has(el.id)) {
        observer.observe(el);
      }
    });

    return () => observer.disconnect();
  }, [headings, scrollRef]);

  const handleClick = (id: string) => {
    const el = scrollRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveId(id);
    }
  };

  if (headings.length === 0) return null;

  return (
    <div className="nexus-toc-sidebar w-56 shrink-0 border-l border-border-primary overflow-y-auto hidden xl:block">
      <div className="sticky top-0 px-4 py-5">
        <div className="flex items-center gap-2 text-sm text-text-secondary mb-4">
          <List size={15} />
          <span>on this page</span>
        </div>
        <nav className="nexus-toc-nav space-y-0.5">
          {headings.map((h, i) => (
            <button
              key={`${h.id}-${i}`}
              onClick={() => handleClick(h.id)}
              className={`nexus-toc-item ${activeId === h.id ? 'active' : ''} ${
                h.level === 1 ? 'toc-h1' : h.level === 2 ? 'toc-h2' : 'toc-h3'
              }`}
            >
              {h.text}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

// ══════════════════════════════════════
// ── Main NexusChat Component ──
// ══════════════════════════════════════

export default function NexusChat() {
  // ── State ──
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // Streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [streamThinking, setStreamThinking] = useState('');
  const [isThinkingPhase, setIsThinkingPhase] = useState(false);

  // Input & models
  const [input, setInput] = useState('');
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [enableThinking, setEnableThinking] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  // UI
  const [showSidebar, setShowSidebar] = useState(true);
  const [visibleMsgIndex, setVisibleMsgIndex] = useState<number>(-1);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamContentRef = useRef('');
  const streamThinkingRef = useRef('');

  // ── Derived ──
  const selectedModelObj = models.find((m) => m.id === selectedModel);
  const showThinkingToggle = selectedModelObj?.supportsThinking ?? false;

  // Compute headings for all assistant messages
  const messageHeadingsMap = useMemo(() => {
    const map = new Map<number, TocHeading[]>();
    messages.forEach((msg, i) => {
      if (msg.role === 'assistant' && msg.content) {
        const headings = extractHeadings(msg.content, i);
        if (headings.length > 0) {
          map.set(i, headings);
        }
      }
    });
    return map;
  }, [messages]);

  // Get the headings for the currently visible assistant message
  const currentTocHeadings = useMemo(() => {
    // If streaming, show headings from the streaming content
    if (isStreaming && streamContent) {
      const streamIdx = messages.length; // streaming message is "after" existing messages
      return extractHeadings(streamContent, streamIdx);
    }
    // Otherwise show headings from the visible assistant message
    if (visibleMsgIndex >= 0 && messageHeadingsMap.has(visibleMsgIndex)) {
      return messageHeadingsMap.get(visibleMsgIndex) || [];
    }
    // Fallback: show headings from the last assistant message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messageHeadingsMap.has(i)) {
        return messageHeadingsMap.get(i) || [];
      }
    }
    return [];
  }, [visibleMsgIndex, messageHeadingsMap, isStreaming, streamContent, messages.length]);

  // Track which assistant message is currently in view
  useEffect(() => {
    if (!scrollRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-msg-index'));
            if (!isNaN(idx)) {
              setVisibleMsgIndex(idx);
            }
          }
        }
      },
      {
        root: scrollRef.current,
        rootMargin: '-10% 0px -60% 0px',
        threshold: 0,
      }
    );

    const msgBlocks = scrollRef.current.querySelectorAll('[data-msg-index]');
    msgBlocks.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [messages]);

  // ── Effects ──

  useEffect(() => {
    loadModels();
    loadSessions();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamContent, streamThinking]);

  // ── Load functions ──

  const loadModels = async () => {
    try {
      const res = await aiApi.getModels();
      if (res.data.success) {
        const data = res.data.data;
        setModels(data.models);
        setSelectedModel(data.defaultModel);
      }
    } catch {
      // models endpoint unavailable
    }
  };

  const loadSessions = async () => {
    try {
      const res = await chatApi.getSessions();
      if (res.data.success) {
        setSessions(res.data.data);
      }
    } catch {
      // silently handle
    }
  };

  const loadMessages = useCallback(async (sessionId: string) => {
    setMessagesLoading(true);
    try {
      const res = await chatApi.getMessages(sessionId);
      if (res.data.success) {
        setMessages(res.data.data);
      }
    } catch {
      // silently handle
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // ── Session handlers ──

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setStreamContent('');
    setStreamThinking('');
    streamContentRef.current = '';
    streamThinkingRef.current = '';
    setIsStreaming(false);
    inputRef.current?.focus();
  };

  const handleSelectSession = (sessionId: string) => {
    if (sessionId === activeSessionId) return;
    if (isStreaming) return; // don't switch while streaming
    setActiveSessionId(sessionId);
    setStreamContent('');
    setStreamThinking('');
    loadMessages(sessionId);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await chatApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    } catch {
      // silently handle
    }
  };

  // ── Send message ──

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    // Clear input and add user message locally
    setInput('');
    resetTextareaHeight();

    const userMsg: ChatMessage = {
      id: `tmp-${Date.now()}`,
      sessionId: activeSessionId || '',
      userId: '',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Start streaming
    setIsStreaming(true);
    setStreamContent('');
    setStreamThinking('');
    streamContentRef.current = '';
    streamThinkingRef.current = '';
    setIsThinkingPhase(false);

    const abortController = new AbortController();
    abortRef.current = abortController;

    let sessionId = activeSessionId;

    try {
      await streamChatMessage(
        {
          message: text,
          sessionId: activeSessionId,
          model: selectedModel || undefined,
          enableThinking: showThinkingToggle ? enableThinking : undefined,
        },
        {
          onSession: (data) => {
            sessionId = data.sessionId;
            setActiveSessionId(data.sessionId);
          },
          onContent: (content) => {
            setIsThinkingPhase(false);
            streamContentRef.current += content;
            setStreamContent(streamContentRef.current);
          },
          onThinking: (content) => {
            setIsThinkingPhase(true);
            streamThinkingRef.current += content;
            setStreamThinking(streamThinkingRef.current);
          },
          onDone: (data) => {
            // Finalize: read from refs directly (no nested setState)
            const finalContent = streamContentRef.current;
            const finalThinking = streamThinkingRef.current;

            const assistantMsg: ChatMessage = {
              id: crypto.randomUUID(),
              sessionId: sessionId || '',
              userId: '',
              role: 'assistant',
              content: finalContent,
              thinking: finalThinking || null,
              model: data.model,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMsg]);

            // Clear streaming state
            streamContentRef.current = '';
            streamThinkingRef.current = '';
            setStreamContent('');
            setStreamThinking('');
            setIsStreaming(false);
            setIsThinkingPhase(false);
            loadSessions(); // refresh sidebar
            inputRef.current?.focus();
          },
          onError: (message) => {
            const errorMsg: ChatMessage = {
              id: `err-${crypto.randomUUID()}`,
              sessionId: sessionId || '',
              userId: '',
              role: 'assistant',
              content: `Error: ${message}`,
              createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            streamContentRef.current = '';
            streamThinkingRef.current = '';
            setStreamContent('');
            setStreamThinking('');
            setIsStreaming(false);
            setIsThinkingPhase(false);
          },
        },
        abortController.signal,
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User stopped generation — finalize what we have from refs
        const partialContent = streamContentRef.current;
        const partialThinking = streamThinkingRef.current;

        if (partialContent || partialThinking) {
          const partialMsg: ChatMessage = {
            id: crypto.randomUUID(),
            sessionId: sessionId || '',
            userId: '',
            role: 'assistant',
            content: partialContent || '(generation stopped)',
            thinking: partialThinking || null,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, partialMsg]);
        }
      } else {
        const errorMsg: ChatMessage = {
          id: `err-${crypto.randomUUID()}`,
          sessionId: sessionId || '',
          userId: '',
          role: 'assistant',
          content: 'An error occurred while generating the response.',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
      streamContentRef.current = '';
      streamThinkingRef.current = '';
      setStreamContent('');
      setStreamThinking('');
      setIsStreaming(false);
      setIsThinkingPhase(false);
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  // ── Input handlers ──

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  };

  const resetTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  };

  // ══════════════════════════════
  // ── Render ──
  // ══════════════════════════════

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Session Sidebar ── */}
      {showSidebar && (
        <div className="w-64 border-r border-border-primary bg-bg-secondary flex flex-col shrink-0">
          {/* New Chat button */}
          <div className="p-3.5 border-b border-border-primary">
            <button
              onClick={handleNewChat}
              className="flex items-center justify-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-text-primary bg-bg-primary border border-border-primary rounded hover:border-accent-cyan/40 hover:text-accent-cyan transition-colors cursor-pointer"
            >
              <Plus size={16} />
              <span>new chat</span>
            </button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-[14px] text-text-muted text-center">
                no conversations yet
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`group flex items-center gap-2.5 px-3.5 py-3 cursor-pointer border-l-2 transition-colors ${activeSessionId === session.id
                    ? 'bg-bg-active border-accent-cyan text-text-primary'
                    : 'border-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{session.title}</div>
                    <div className="text-[13px] text-text-muted mt-0.5">
                      {formatRelativeTime(session.updatedAt)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all cursor-pointer p-0.5"
                    title="Delete session"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Sidebar footer */}
          <div className="border-t border-border-primary p-3.5">
            <button
              onClick={() => setShowSidebar(false)}
              className="flex items-center gap-2 text-[14px] text-text-muted hover:text-text-secondary transition-colors cursor-pointer"
            >
              <PanelLeftClose size={15} />
              <span>hide sidebar</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-border-primary bg-bg-secondary shrink-0">
          <div className="flex items-center gap-2.5">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="text-text-muted hover:text-text-secondary transition-colors cursor-pointer mr-1"
              >
                <PanelLeft size={17} />
              </button>
            )}
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <ChevronRight size={13} className="text-accent-cyan" />
              <span className="text-accent-cyan">~/nexus</span>
              {activeSessionId && (
                <>
                  <ChevronRight size={10} className="text-text-muted" />
                  <span className="text-text-secondary truncate max-w-[240px]">
                    {sessions.find((s) => s.id === activeSessionId)?.title || 'chat'}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-[14px] text-text-muted">
            {selectedModelObj?.name || 'loading...'}
          </div>
        </div>

        {/* Messages area + TOC sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Scrollable messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto min-w-0">
            {messagesLoading ? (
              <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-2.5 text-text-secondary text-base">
                  <Loader2 size={17} className="spinner" />
                  loading messages...
                </div>
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              <EmptyState
                modelName={selectedModelObj?.name}
                onSuggestion={(text) => {
                  setInput(text);
                  inputRef.current?.focus();
                }}
              />
            ) : (
              <div className="p-7 space-y-7">
                {messages.map((msg, i) => (
                  <div
                    key={msg.id || i}
                    data-msg-index={msg.role === 'assistant' ? i : undefined}
                  >
                    <MessageBubble message={msg} msgIndex={i} />
                  </div>
                ))}

                {/* Streaming message */}
                {isStreaming && (
                  <div data-msg-index={messages.length}>
                    <StreamingMessage
                      content={streamContent}
                      thinking={streamThinking}
                      modelName={selectedModelObj?.name}
                      isThinking={isThinkingPhase}
                      msgIndex={messages.length}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* On This Page sidebar */}
          {(messages.length > 0 || isStreaming) && (
            <OnThisPage headings={currentTocHeadings} scrollRef={scrollRef} />
          )}
        </div>

        {/* ── Input Bar ── */}
        <div className="border-t border-border-primary bg-bg-secondary p-5 shrink-0">
          <div>
            <div className="flex items-end gap-2.5 border border-border-primary rounded-lg bg-bg-primary focus-within:border-accent-cyan/50 transition-colors">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent px-5 py-3.5 text-base text-text-primary focus:outline-none resize-none font-[inherit] min-h-[48px] max-h-[200px]"
                placeholder="message nexus... (enter to send, shift+enter for newline)"
                rows={1}
                disabled={isStreaming}
              />
              <button
                onClick={isStreaming ? handleStop : handleSend}
                disabled={!isStreaming && !input.trim()}
                className={`px-3.5 py-3.5 transition-colors cursor-pointer ${isStreaming
                  ? 'text-accent-red hover:text-accent-red/80'
                  : 'text-text-muted hover:text-accent-cyan disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
                title={isStreaming ? 'Stop generation' : 'Send message'}
              >
                {isStreaming ? <Square size={18} /> : <Send size={18} />}
              </button>
            </div>

            {/* Bottom row: model selector + thinking toggle */}
            <div className="flex items-center justify-between mt-2.5 text-[14px] text-text-muted">
              <div className="flex items-center gap-3.5">
                {/* Model selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowModelPicker(!showModelPicker)}
                    className="flex items-center gap-2 px-2.5 py-1 text-text-secondary hover:text-accent-cyan border border-border-primary rounded hover:border-accent-cyan/30 transition-colors cursor-pointer"
                  >
                    <Cpu size={13} />
                    <span className="max-w-[160px] truncate">
                      {selectedModelObj?.name || 'select model'}
                    </span>
                    <ChevronDown size={11} />
                  </button>

                  {showModelPicker && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowModelPicker(false)}
                      />
                      <div className="absolute left-0 bottom-full mb-1 w-96 bg-bg-secondary border border-border-primary rounded-lg shadow-lg z-50 overflow-hidden">
                        <div className="px-3.5 py-2.5 border-b border-border-primary text-[13px] text-text-muted uppercase tracking-wider">
                          select model
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {/* Reasoning models */}
                          {models.some(m => m.supportsThinking) && (
                            <div className="px-3 py-1.5 text-[11px] text-accent-purple uppercase tracking-widest bg-bg-primary/50 border-b border-border-primary">
                              reasoning models
                            </div>
                          )}
                          {models.filter(m => m.supportsThinking).map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSelectedModel(m.id);
                                setShowModelPicker(false);
                                if (!m.supportsThinking) setEnableThinking(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 hover:bg-bg-hover transition-colors cursor-pointer ${selectedModel === m.id ? 'bg-bg-active' : ''
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-text-primary">{m.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-accent-purple px-1.5 py-0.5 border border-accent-purple/30 rounded">
                                    thinking
                                  </span>
                                  {selectedModel === m.id && (
                                    <Check size={13} className="text-accent-green" />
                                  )}
                                </div>
                              </div>
                              <div className="text-[12px] text-text-muted mt-0.5">
                                {m.provider} &middot; {m.description}
                              </div>
                            </button>
                          ))}
                          {/* General / non-thinking models */}
                          {models.some(m => !m.supportsThinking) && (
                            <div className="px-3 py-1.5 text-[11px] text-accent-cyan uppercase tracking-widest bg-bg-primary/50 border-b border-border-primary">
                              general models
                            </div>
                          )}
                          {models.filter(m => !m.supportsThinking).map((m) => (
                            <button
                              key={m.id}
                              onClick={() => {
                                setSelectedModel(m.id);
                                setShowModelPicker(false);
                                setEnableThinking(false);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 hover:bg-bg-hover transition-colors cursor-pointer ${selectedModel === m.id ? 'bg-bg-active' : ''
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-text-primary">{m.name}</span>
                                {selectedModel === m.id && (
                                  <Check size={13} className="text-accent-green" />
                                )}
                              </div>
                              <div className="text-[12px] text-text-muted mt-0.5">
                                {m.provider} &middot; {m.description}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Thinking toggle */}
                {showThinkingToggle && (
                  <button
                    onClick={() => setEnableThinking(!enableThinking)}
                    className={`flex items-center gap-2 px-2.5 py-1 border rounded transition-colors cursor-pointer ${enableThinking
                      ? 'text-accent-purple border-accent-purple/40 bg-accent-purple/5'
                      : 'text-text-muted border-border-primary hover:text-accent-purple hover:border-accent-purple/30'
                      }`}
                    title="Toggle thinking/reasoning"
                  >
                    <Brain size={13} />
                    <span>thinking {enableThinking ? 'on' : 'off'}</span>
                  </button>
                )}
              </div>

              <span className="text-text-muted">enter to send</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
