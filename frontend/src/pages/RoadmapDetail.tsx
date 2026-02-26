import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { roadmapApi } from '../api/roadmaps';
import { useGamification } from '../context/GamificationContext';
import type { RoadmapResponse, ContentResponse } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  Play,
  Lock,
  CheckCircle2,
  Clock,
  BookOpen,
  Sparkles,
  X,
  AlertTriangle,
} from 'lucide-react';

const topicStatusIcon: Record<string, React.ReactNode> = {
  LOCKED: <Lock size={15} className="text-text-muted" />,
  AVAILABLE: <Play size={15} className="text-accent-blue" />,
  IN_PROGRESS: <Clock size={15} className="text-accent-orange" />,
  COMPLETED: <CheckCircle2 size={15} className="text-accent-green" />,
};

const topicStatusColor: Record<string, string> = {
  LOCKED: 'border-border-primary text-text-muted',
  AVAILABLE: 'border-accent-blue/30 text-accent-blue',
  IN_PROGRESS: 'border-accent-orange/30 text-accent-orange',
  COMPLETED: 'border-accent-green/30 text-accent-green',
};

export default function RoadmapDetail() {
  const { id } = useParams<{ id: string }>();
  const { refresh: refreshGamification } = useGamification();
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<ContentResponse | null>(null);
  const [generatingContent, setGeneratingContent] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [contentError, setContentError] = useState<string | null>(null);

  useEffect(() => {
    if (id) loadRoadmap();
  }, [id]);

  const loadRoadmap = async () => {
    try {
      const res = await roadmapApi.getById(id!);
      if (res.data.success) setRoadmap(res.data.data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      const res = await roadmapApi.start(id!);
      if (res.data.success) setRoadmap(res.data.data);
      refreshGamification();
    } catch {
      // silently handle
    }
  };

  const handleGenerateContent = async (topicId: string, status: string) => {
    if (status === 'LOCKED') {
      setContentError('This topic is locked. Complete previous topics first or start the roadmap.');
      setSelectedTopic(topicId);
      setContent(null);
      return;
    }

    setGeneratingContent(topicId);
    setSelectedTopic(topicId);
    setContentError(null);
    try {
      const res = await roadmapApi.generateContent(topicId, 'THEORY');
      if (res.data.success) {
        setContent(res.data.data);
        refreshGamification();
      } else {
        setContentError(res.data.message || 'Failed to generate content.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to generate content. The topic may be locked or unavailable.';
      setContentError(msg);
      setContent(null);
    } finally {
      setGeneratingContent(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-text-secondary text-base">
          <Loader2 size={17} className="spinner" />
          loading roadmap...
        </div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-text-muted">roadmap not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col fade-in">
      {/* Breadcrumb header */}
      <div className="px-12 py-6 border-b border-border-primary bg-bg-secondary shrink-0">
        <div className="flex items-center gap-2.5 text-sm">
          <Link to="/roadmaps" className="text-text-muted hover:text-accent-blue transition-colors flex items-center gap-1.5">
            <ChevronLeft size={13} />
            roadmaps
          </Link>
          <ChevronRight size={13} className="text-text-muted" />
          <span className="text-text-primary">{roadmap.title}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Roadmap info + Topics */}
        <div className={`${content ? 'w-1/2' : 'w-full max-w-4xl mx-auto'} overflow-y-auto p-12 transition-all`}>
          {/* Roadmap header */}
          <div className="mb-10">
            <h1 className="text-xl font-semibold text-text-bright">{roadmap.title}</h1>
            {roadmap.description && (
              <p className="text-sm text-text-secondary mt-1.5">{roadmap.description}</p>
            )}

            <div className="flex items-center gap-5 mt-3.5 text-[15px] text-text-muted">
              <span className={`px-2 py-0.5 uppercase tracking-wider border rounded ${roadmap.status === 'ACTIVE'
                  ? 'bg-accent-dim-green text-accent-green border-accent-green/30'
                  : 'bg-bg-active text-text-muted border-border-secondary'
                }`}>
                {roadmap.status.toLowerCase()}
              </span>
              <span>{roadmap.totalTopics || 0} topics</span>
              <span>{roadmap.difficulty}</span>
              {roadmap.estimatedHours > 0 && <span>~{roadmap.estimatedHours}h</span>}
              {roadmap.estimatedWeeks > 0 && <span>{roadmap.estimatedWeeks} weeks</span>}
            </div>

            {/* Progress bar */}
            <div className="mt-3.5 flex items-center gap-3.5">
              <div className="flex-1 h-2 bg-bg-active rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-green rounded-full transition-all"
                  style={{ width: `${roadmap.progressPercentage || 0}%` }}
                />
              </div>
              <span className="text-sm text-text-secondary">
                {Math.round(roadmap.progressPercentage || 0)}%
              </span>
            </div>

            {roadmap.status === 'DRAFT' && (
              <button
                onClick={handleStart}
                className="mt-3.5 flex items-center gap-2.5 px-3.5 py-2 text-sm bg-accent-dim-green border border-accent-green/30 rounded text-accent-green hover:bg-accent-green/20 transition-colors cursor-pointer"
              >
                <Play size={15} />
                start roadmap
              </button>
            )}

            {roadmap.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3.5">
                {roadmap.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-0.5 text-[15px] bg-bg-active border border-border-secondary rounded text-accent-cyan">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Topics list */}
          <div className="border border-border-primary rounded bg-bg-secondary">
            <div className="px-6 py-3.5 border-b border-border-primary flex items-center gap-2.5">
              <BookOpen size={17} className="text-accent-cyan" />
              <span className="text-base font-medium">topics</span>
              <span className="text-[15px] text-text-muted ml-auto">
                {roadmap.completedTopics || 0}/{roadmap.totalTopics || 0} completed
              </span>
            </div>

            {roadmap.topics && roadmap.topics.length > 0 ? (
              <div className="divide-y divide-border-primary">
                {roadmap.topics
                  .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                  .map((topic, idx) => (
                    <div
                      key={topic.id}
                      className={`flex items-center gap-5 px-6 py-5 transition-colors group ${
                        topic.status === 'LOCKED'
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-bg-hover cursor-pointer'
                      } ${selectedTopic === topic.id ? 'bg-bg-hover border-l-2 border-accent-blue' : ''}`}
                      onClick={() => handleGenerateContent(topic.id, topic.status)}
                    >
                      {/* Sequence number */}
                      <span className={`w-8 h-8 flex items-center justify-center rounded text-[15px] border ${topicStatusColor[topic.status] || topicStatusColor.LOCKED}`}>
                        {idx + 1}
                      </span>

                      {/* Topic info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          {topicStatusIcon[topic.status]}
                          <span className="text-base text-text-primary group-hover:text-accent-blue transition-colors truncate">
                            {topic.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-3.5 mt-1.5 text-[15px] text-text-muted">
                          <span>{topic.status.toLowerCase().replace('_', ' ')}</span>
                          {topic.estimatedMinutes > 0 && <span>{topic.estimatedMinutes} min</span>}
                        </div>
                      </div>

                      {/* Generate button */}
                      {generatingContent === topic.id ? (
                        <Loader2 size={15} className="spinner text-accent-blue" />
                      ) : (
                        <Sparkles size={15} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-base text-text-muted">
                no topics generated
              </div>
            )}
          </div>
        </div>

        {/* Right: Content viewer / Error panel */}
        {(content || contentError) && (
          <div className="w-1/2 border-l border-border-primary overflow-y-auto bg-bg-secondary fade-in">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-primary sticky top-0 bg-bg-secondary z-10">
              <div className="flex items-center gap-2.5">
                {contentError ? (
                  <>
                    <AlertTriangle size={17} className="text-accent-orange" />
                    <span className="text-base font-medium text-text-primary">cannot load content</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={17} className="text-accent-purple" />
                    <span className="text-base font-medium text-text-primary">{content!.title}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3.5">
                {content?.aiGenerated && (
                  <span className="text-[14px] px-2.5 py-0.5 bg-accent-dim-blue border border-accent-blue/30 rounded text-accent-blue">
                    AI generated
                  </span>
                )}
                <button
                  onClick={() => { setContent(null); setContentError(null); setSelectedTopic(null); }}
                  className="text-text-muted hover:text-text-primary cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {contentError ? (
              <div className="p-10">
                <div className="flex items-start gap-3.5 px-5 py-5 bg-accent-dim-orange border border-accent-orange/30 rounded">
                  <Lock size={20} className="text-accent-orange shrink-0 mt-0.5" />
                  <div>
                    <p className="text-base text-accent-orange font-medium mb-1.5">topic unavailable</p>
                    <p className="text-sm text-text-secondary leading-relaxed">{contentError}</p>
                    {roadmap?.status === 'DRAFT' && (
                      <button
                        onClick={handleStart}
                        className="mt-3.5 flex items-center gap-2.5 px-3.5 py-2 text-sm bg-accent-dim-green border border-accent-green/30 rounded text-accent-green hover:bg-accent-green/20 transition-colors cursor-pointer"
                      >
                        <Play size={15} />
                        start roadmap first
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content!.markdownContent || 'No content available.'}
                </ReactMarkdown>

                {content!.keyPoints && content!.keyPoints.length > 0 && (
                  <div className="mt-10 border border-border-primary rounded p-6 bg-bg-primary">
                    <h4 className="text-base font-semibold text-accent-green mb-3.5">key takeaways</h4>
                    <ul className="space-y-2.5">
                      {content!.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                          <ChevronRight size={13} className="text-accent-green mt-0.5 shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
