import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
  /** Characters per tick (default: 2) */
  charsPerTick?: number;
  /** Milliseconds between ticks (default: 18) */
  speed?: number;
  /** Whether to start typing immediately (default: true) */
  autoStart?: boolean;
  /** Callback when typing completes */
  onComplete?: () => void;
  /** Whether to show a blinking cursor at the end */
  showCursor?: boolean;
}

interface UseTypewriterReturn {
  /** The currently displayed text (partial during typing, full when done) */
  displayText: string;
  /** Whether the typewriter is actively typing */
  isTyping: boolean;
  /** Whether typing has completed */
  isComplete: boolean;
  /** Skip to the end immediately */
  skip: () => void;
  /** Reset and restart typing */
  restart: () => void;
  /** Start typing (if autoStart was false) */
  start: () => void;
}

export function useTypewriter(
  text: string,
  options: UseTypewriterOptions = {},
): UseTypewriterReturn {
  const {
    charsPerTick = 2,
    speed = 18,
    autoStart = true,
    onComplete,
    showCursor: _showCursor = false,
  } = options;

  const [displayText, setDisplayText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const posRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textRef = useRef(text);
  const onCompleteRef = useRef(onComplete);

  // Keep refs in sync
  onCompleteRef.current = onComplete;

  // Clear any running timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start the typewriter
  const start = useCallback(() => {
    if (timerRef.current) return; // already running
    if (!textRef.current) {
      setIsComplete(true);
      return;
    }

    setIsTyping(true);
    setIsComplete(false);

    timerRef.current = setInterval(() => {
      posRef.current += charsPerTick;
      const current = textRef.current;

      if (posRef.current >= current.length) {
        posRef.current = current.length;
        setDisplayText(current);
        setIsTyping(false);
        setIsComplete(true);
        clearTimer();
        onCompleteRef.current?.();
      } else {
        setDisplayText(current.slice(0, posRef.current));
      }
    }, speed);
  }, [charsPerTick, speed, clearTimer]);

  // Skip to end
  const skip = useCallback(() => {
    clearTimer();
    posRef.current = textRef.current.length;
    setDisplayText(textRef.current);
    setIsTyping(false);
    setIsComplete(true);
    onCompleteRef.current?.();
  }, [clearTimer]);

  // Reset and restart
  const restart = useCallback(() => {
    clearTimer();
    posRef.current = 0;
    setDisplayText('');
    setIsTyping(false);
    setIsComplete(false);
    if (autoStart) {
      // Small delay to allow state to settle
      setTimeout(() => start(), 50);
    }
  }, [clearTimer, autoStart, start]);

  // Handle text changes — if the source text changes, reset
  useEffect(() => {
    if (text !== textRef.current) {
      clearTimer();
      textRef.current = text;
      posRef.current = 0;
      setDisplayText('');
      setIsTyping(false);
      setIsComplete(false);
      if (autoStart && text) {
        start();
      }
    }
  }, [text, autoStart, start, clearTimer]);

  // Auto-start on mount
  useEffect(() => {
    if (autoStart && text && !isComplete && !isTyping) {
      start();
    }
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    displayText,
    isTyping,
    isComplete,
    skip,
    restart,
    start,
  };
}

/**
 * Simplified version: type multiple lines sequentially.
 * Returns the current set of visible lines with typewriter applied to the latest.
 */
export function useTypewriterLines(
  lines: string[],
  options: UseTypewriterOptions & { lineDelay?: number } = {},
): {
  displayLines: string[];
  currentLine: number;
  isComplete: boolean;
  skip: () => void;
} {
  const { lineDelay = 300, ...typewriterOpts } = options;
  const [currentLine, setCurrentLine] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [isAllComplete, setIsAllComplete] = useState(false);

  const currentText = lines[currentLine] || '';

  const { displayText, isComplete: _lineComplete, skip: skipLine } = useTypewriter(currentText, {
    ...typewriterOpts,
    autoStart: true,
    onComplete: () => {
      setTimeout(() => {
        setCompletedLines((prev) => [...prev, lines[currentLine]]);
        if (currentLine < lines.length - 1) {
          setCurrentLine((l) => l + 1);
        } else {
          setIsAllComplete(true);
        }
      }, lineDelay);
    },
  });

  const skip = useCallback(() => {
    skipLine();
    setCompletedLines([...lines]);
    setCurrentLine(lines.length - 1);
    setIsAllComplete(true);
  }, [skipLine, lines]);

  const displayLines = [
    ...completedLines,
    ...(currentLine < lines.length && !isAllComplete ? [displayText] : []),
  ];

  return { displayLines, currentLine, isComplete: isAllComplete, skip };
}
