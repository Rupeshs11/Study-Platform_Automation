import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface TerminalLoaderProps {
  /** Title shown at top (default: 'processing') */
  title?: string;
  /** Short subtitle / context */
  subtitle?: string;
  /** Whether to show the model info footer (default: true) */
  showModelInfo?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Real-time thinking text from AI — when provided, replaces all fake content */
  customText?: string;
  /** Model name to display in footer */
  modelName?: string;
  /** Max tokens to display in footer */
  maxTokens?: number;
}

const WAITING_FRAMES = [
  'waiting for first response from inference engine',
  'establishing connection to model',
  'request queued, awaiting response',
];

export default function TerminalLoader({
  title = 'processing',
  subtitle,
  showModelInfo = true,
  className = '',
  customText,
  modelName = 'ai-model',
  maxTokens = 16384,
}: TerminalLoaderProps) {
  const [elapsed, setElapsed] = useState(0);
  const [waitFrame, setWaitFrame] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Track elapsed time
  useEffect(() => {
    const timer = setInterval(() => setElapsed((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cycle waiting message only when no real content yet
  useEffect(() => {
    if (customText) return;
    const timer = setInterval(() => {
      setWaitFrame((p) => (p + 1) % WAITING_FRAMES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [customText]);

  // Auto-scroll thinking output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [customText]);

  const formatElapsed = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return min > 0
      ? `${min}m ${sec.toString().padStart(2, '0')}s`
      : `${sec}s`;
  };

  const hasContent = !!customText && customText.trim().length > 0;

  return (
    <div className={`border border-border-primary rounded bg-bg-secondary ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border-primary">
        <div className="flex gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${hasContent ? 'bg-accent-green animate-pulse' : 'bg-accent-orange opacity-70 animate-pulse'}`} />
          <span className="w-2.5 h-2.5 rounded-full bg-accent-green opacity-50" />
          <span className="w-2.5 h-2.5 rounded-full bg-bg-active" />
        </div>
        <span className="text-[14px] text-text-muted ml-1">{title}</span>
        {subtitle && (
          <>
            <span className="text-text-muted text-[14px]">--</span>
            <span className="text-[14px] text-text-secondary">{subtitle}</span>
          </>
        )}
        <span className="text-[14px] text-text-muted ml-auto">
          {formatElapsed(elapsed)}
        </span>
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        className="px-5 py-5 max-h-[350px] overflow-y-auto font-mono"
      >
        {hasContent ? (
          /* Real AI thinking output */
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 mb-2.5 text-[13px] text-accent-green/60 uppercase tracking-wider">
              <Loader2 size={13} className="spinner" />
              <span>ai reasoning stream</span>
            </div>
            <pre className="text-sm text-text-secondary whitespace-pre-wrap break-words leading-relaxed">
              {customText}
            </pre>
            <div className="flex text-[14px] text-text-muted mt-2.5">
              <span className="text-accent-green mr-2">$</span>
              <span className="cursor-blink text-accent-green inline-block">_</span>
            </div>
          </div>
        ) : (
          /* Waiting state — no real content yet */
          <div className="space-y-3.5">
            <div className="flex items-center gap-3">
              <Loader2 size={16} className="text-accent-orange spinner" />
              <span className="text-sm text-accent-orange font-medium">
                {WAITING_FRAMES[waitFrame]}
              </span>
            </div>
            <div className="flex items-center gap-1.5 pl-[29px]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${
                    i <= (elapsed % 3) ? 'bg-accent-orange' : 'bg-bg-active'
                  }`}
                />
              ))}
            </div>
            <div className="flex text-[14px] text-text-muted pl-[29px]">
              <span className="text-accent-orange mr-2">$</span>
              <span className="text-accent-orange/60">awaiting stream...</span>
              <span className="cursor-blink text-accent-orange inline-block ml-[2px]">_</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      {showModelInfo && (
        <div className="flex items-center gap-5 px-5 py-2.5 border-t border-border-primary text-[13px] text-text-muted">
          <span>model: {modelName}</span>
          <span>|</span>
          <span>max_tokens: {maxTokens}</span>
          <span>|</span>
          <span>stream: active</span>
          <span>|</span>
          <span>elapsed: {formatElapsed(elapsed)}</span>
        </div>
      )}
    </div>
  );
}
