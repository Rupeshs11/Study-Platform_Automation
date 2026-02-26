import { useState, useEffect, useRef, Fragment } from 'react';
import type { TopicSummary } from '../types';
import {
  Lock,
  Play,
  Clock,
  CheckCircle2,
  Sparkles,
  Cpu,
} from 'lucide-react';

// ── Types ──

interface RoadmapCanvasProps {
  topics: TopicSummary[];
  onTopicClick?: (topicId: string, status: string) => void;
  selectedTopicId?: string | null;
  generatingTopicId?: string | null;
  isGenerating?: boolean;
  nodesPerRow?: number;
  animate?: boolean;
  title?: string;
  modelName?: string;
}

interface CanvasRow {
  nodes: TopicSummary[];
  direction: 'ltr' | 'rtl';
  rowIndex: number;
}

// ── Constants ──

const STATUS_STYLES: Record<string, { border: string; bg: string; text: string; icon: React.ReactNode }> = {
  LOCKED: {
    border: 'border-border-primary',
    bg: 'bg-bg-tertiary',
    text: 'text-text-muted',
    icon: <Lock size={14} />,
  },
  AVAILABLE: {
    border: 'border-accent-blue/40',
    bg: 'bg-accent-dim-blue/30',
    text: 'text-accent-blue',
    icon: <Play size={14} />,
  },
  IN_PROGRESS: {
    border: 'border-accent-orange/40',
    bg: 'bg-accent-dim-orange/30',
    text: 'text-accent-orange',
    icon: <Clock size={14} />,
  },
  COMPLETED: {
    border: 'border-accent-green/40',
    bg: 'bg-accent-dim-green/30',
    text: 'text-accent-green',
    icon: <CheckCircle2 size={14} />,
  },
};

// ── Helpers ──

function buildSnakeRows(
  nodes: TopicSummary[],
  nodesPerRow: number,
): CanvasRow[] {
  const rows: CanvasRow[] = [];
  for (let i = 0; i < nodes.length; i += nodesPerRow) {
    const rowIndex = Math.floor(i / nodesPerRow);
    const rowNodes = nodes.slice(i, i + nodesPerRow);
    rows.push({
      nodes: rowIndex % 2 === 1 ? [...rowNodes].reverse() : rowNodes,
      direction: rowIndex % 2 === 0 ? 'ltr' : 'rtl',
      rowIndex,
    });
  }
  return rows;
}

// ── Component ──

export default function RoadmapCanvas({
  topics,
  onTopicClick,
  selectedTopicId,
  generatingTopicId,
  isGenerating = false,
  nodesPerRow = 5,
  animate = true,
  title,
  modelName,
}: RoadmapCanvasProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const prevTopicCountRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stagger reveal of real topics when they arrive
  useEffect(() => {
    if (topics.length > prevTopicCountRef.current) {
      // New topic(s) arrived — reveal them with stagger
      const startFrom = prevTopicCountRef.current;
      let count = startFrom;
      const timer = setInterval(() => {
        count++;
        setRevealedCount(count);
        if (count >= topics.length) clearInterval(timer);
      }, 150);
      prevTopicCountRef.current = topics.length;
      return () => clearInterval(timer);
    } else if (topics.length > 0 && revealedCount === 0) {
      // Initial load (non-streaming) — reveal all
      setRevealedCount(topics.length);
      prevTopicCountRef.current = topics.length;
    }
  }, [topics.length, animate]);

  const rows = buildSnakeRows(topics, nodesPerRow);

  // Determine the global index of each node for animation delay
  let globalIdx = 0;

  return (
    <div ref={containerRef} className="w-full">
      {/* Terminal header */}
      {(title || isGenerating) && (
        <div className="flex items-center gap-2.5 mb-5 px-1">
          {isGenerating ? (
            <>
              <Cpu size={17} className="text-accent-green canvas-node-glow" />
              <span className="text-sm text-accent-green font-medium">
                generating roadmap
              </span>
              <span className="text-[14px] text-text-muted ml-2.5 canvas-dot-pulse">
                <span>.</span><span>.</span><span>.</span>
              </span>
              <span className="text-[14px] text-text-muted ml-auto">
                {topics.length} nodes
              </span>
            </>
          ) : (
            <>
              <Sparkles size={17} className="text-accent-cyan" />
              <span className="text-sm text-text-secondary font-medium">
                {title || 'roadmap topology'}
              </span>
              <span className="text-[14px] text-text-muted ml-auto">
                {topics.length} nodes
              </span>
            </>
          )}
        </div>
      )}

      {/* Canvas grid */}
      <div className="relative border border-border-primary rounded-lg bg-bg-secondary/50 p-6 overflow-x-auto">
        {/* Grid dot pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {topics.length === 0 && isGenerating && (
          <div className="relative z-10 flex items-center justify-center py-8">
            <div className="flex items-center gap-2.5 text-sm text-text-muted">
              <Cpu size={16} className="text-accent-green spinner" />
              <span>waiting for first topic...</span>
            </div>
          </div>
        )}

        {topics.length === 0 && !isGenerating && (
          <div className="relative z-10 flex items-center justify-center py-8">
            <span className="text-sm text-text-muted">no topics yet</span>
          </div>
        )}

        <div className="relative z-10 space-y-0">
          {rows.map((row, rowIdx) => {
            const isLastRow = rowIdx === rows.length - 1;

            return (
              <Fragment key={rowIdx}>
                {/* Node row */}
                <div className="flex items-center">
                  {row.nodes.map((node, nodeIdx) => {
                    const currentGlobalIdx = globalIdx++;
                    const isFirst = nodeIdx === 0;
                    const isRevealed = currentGlobalIdx < revealedCount || !animate;
                    const style = STATUS_STYLES[node.status] || STATUS_STYLES.LOCKED;
                    const isSelected = selectedTopicId === node.id;
                    const isBeingGenerated = generatingTopicId === node.id;
                    const seqNum = node.sequenceOrder;

                    return (
                      <Fragment key={node.id}>
                        {/* Horizontal connector (before every node except first) */}
                        {!isFirst && (
                          <div
                            className="canvas-connector-h flex-shrink-0 flex items-center"
                            style={{
                              animationDelay: animate ? `${currentGlobalIdx * 150 + 50}ms` : '0ms',
                            }}
                          >
                            <div className="w-6 lg:w-10 h-px border-t border-dashed border-accent-green/30 relative">
                              {/* Arrow tip */}
                              <div
                                className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 ${
                                  row.direction === 'ltr'
                                    ? 'right-0 border-l-[4px] border-l-accent-green/40 border-y-[3px] border-y-transparent'
                                    : 'left-0 border-r-[4px] border-r-accent-green/40 border-y-[3px] border-y-transparent'
                                }`}
                              />
                            </div>
                          </div>
                        )}

                        {/* Node */}
                        <div
                          className={`
                            flex-shrink-0 w-[120px] lg:w-[140px] relative
                            ${isRevealed ? 'canvas-node-appear' : 'opacity-0'}
                            ${isBeingGenerated ? 'canvas-node-glow' : ''}
                          `}
                          style={{
                            animationDelay: animate ? `${currentGlobalIdx * 150}ms` : '0ms',
                          }}
                        >
                          {/* Pulse ring for generating state */}
                          {isBeingGenerated && (
                            <div className="absolute inset-0 rounded border border-accent-blue/30 canvas-pulse-ring pointer-events-none" />
                          )}

                          {/* Real node */}
                          <div
                            onClick={() => onTopicClick?.(node.id, node.status)}
                            className={`
                              rounded border p-3.5 h-[72px] flex flex-col justify-between
                              transition-all duration-200 group
                              ${style.border} ${style.bg}
                              ${node.status !== 'LOCKED' ? 'cursor-pointer hover:scale-[1.04] hover:shadow-lg hover:shadow-accent-green/5' : 'cursor-not-allowed opacity-60'}
                              ${isSelected ? 'ring-1 ring-accent-blue shadow-lg shadow-accent-blue/10 scale-[1.04]' : ''}
                            `}
                          >
                            {/* Top: number + status icon */}
                            <div className="flex items-center justify-between">
                              <span className={`text-[13px] font-bold ${style.text}`}>
                                {String(seqNum).padStart(2, '0')}
                              </span>
                              <span className={style.text}>
                                {style.icon}
                              </span>
                            </div>

                            {/* Title */}
                            <p className="text-[14px] text-text-primary leading-tight truncate mt-1">
                              {node.title}
                            </p>

                            {/* Bottom: time estimate */}
                            <div className="flex items-center justify-between mt-auto">
                              {node.estimatedMinutes > 0 && (
                                <span className="text-[12px] text-text-muted">
                                  {node.estimatedMinutes}m
                                </span>
                              )}
                              <span className={`text-[12px] uppercase tracking-wider ${style.text}`}>
                                {node.status.toLowerCase().replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Fragment>
                    );
                  })}
                </div>

                {/* Vertical connector between rows */}
                {!isLastRow && (
                  <div
                    className={`flex ${row.direction === 'ltr' ? 'justify-end pr-[55px] lg:pr-[65px]' : 'justify-start pl-[55px] lg:pl-[65px]'}`}
                  >
                    <div
                      className="canvas-connector-v w-px h-6 border-l border-dashed border-accent-green/30 relative"
                      style={{
                        animationDelay: animate
                          ? `${(row.rowIndex + 1) * nodesPerRow * 150 - 50}ms`
                          : '0ms',
                      }}
                    >
                      {/* Down arrow */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-t-[4px] border-t-accent-green/40 border-x-[3px] border-x-transparent" />
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Footer with real model info */}
      {isGenerating && modelName && (
        <div className="mt-3.5 px-1">
          <div className="flex items-center gap-3.5 text-[13px] text-text-muted">
            <span>model: {modelName}</span>
            <span>|</span>
            <span>nodes: {topics.length}</span>
            <span>|</span>
            <span>stream: active</span>
          </div>
        </div>
      )}
    </div>
  );
}
