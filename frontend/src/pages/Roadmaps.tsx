import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { roadmapApi } from '../api/roadmaps';
import { aiApi } from '../api/ai';
import { useGamification } from '../context/GamificationContext';
import type { RoadmapResponse, RoadmapRequest, AIModel } from '../types';
import RoadmapCanvas from '../components/RoadmapCanvas';
import TerminalLoader from '../components/TerminalLoader';
import {
  Plus,
  ChevronRight,
  Loader2,
  Map,
  Trash2,
  Play,
  AlertTriangle,
  X,
  ExternalLink,
  Cpu,
} from 'lucide-react';

const statusBadge: Record<string, string> = {
  DRAFT: 'bg-bg-active text-text-muted border-border-secondary',
  ACTIVE: 'bg-accent-dim-green text-accent-green border-accent-green/30',
  PAUSED: 'bg-accent-dim-orange text-accent-orange border-accent-orange/30',
  COMPLETED: 'bg-accent-dim-blue text-accent-blue border-accent-blue/30',
  ARCHIVED: 'bg-bg-active text-text-muted border-border-secondary',
};

export default function Roadmaps() {
  const navigate = useNavigate();
  const { refresh: refreshGamification } = useGamification();
  const [roadmaps, setRoadmaps] = useState<RoadmapResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Generation state — tracks the live canvas while AI works
  const [generatingRoadmap, setGeneratingRoadmap] = useState<RoadmapResponse | null>(null);
  const [thinkingProcess, setThinkingProcess] = useState<string>('');

  // AI model state
  const [models, setModels] = useState<AIModel[]>([]);
  const [defaultModelId, setDefaultModelId] = useState<string>('');
  const [selectedModelName, setSelectedModelName] = useState<string>('');

  const [form, setForm] = useState<RoadmapRequest>({
    title: '',
    description: '',
    goal: '',
    difficulty: 'intermediate',
    estimatedHoursPerWeek: 10,
    tags: [],
    currentLevel: 'beginner',
    preferredLearningStyle: 'hands-on',
    generateWithAI: true,
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadRoadmaps();
    loadModels();
    if (searchParams.get('new') === 'true') {
      setShowCreate(true);
      setSearchParams({});
    }
  }, []);

  const loadRoadmaps = async () => {
    try {
      const res = await roadmapApi.getAll();
      if (res.data.success) setRoadmaps(res.data.data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  const loadModels = async () => {
    try {
      const res = await aiApi.getModels();
      if (res.data.success) {
        const data = res.data.data;
        setModels(data.models);
        setDefaultModelId(data.defaultModel);
        // Set form default model
        setForm((prev) => ({ ...prev, model: data.defaultModel }));
        // Set display name
        const defaultModel = data.models.find((m: AIModel) => m.id === data.defaultModel);
        setSelectedModelName(defaultModel?.name || data.defaultModel);
      }
    } catch {
      // silently handle — models dropdown will just be empty
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setShowCreate(false);

    // Initial state for live generation
    const initialDraft: RoadmapResponse = {
      id: 'draft',
      userId: 'user',
      title: form.title || 'AI Roadmap',
      description: form.description || '',
      goal: form.goal,
      difficulty: form.difficulty,
      estimatedHours: form.estimatedHoursPerWeek * 4,
      estimatedWeeks: 4,
      tags: form.tags,
      topics: [],
      status: 'DRAFT',
      progressPercentage: 0,
      completedTopics: 0,
      totalTopics: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null
    };

    setGeneratingRoadmap(initialDraft);
    setThinkingProcess('');

    try {
      await roadmapApi.createStreaming(
        form,
        (content) => {
          setThinkingProcess((prev) => prev + content);
        },
        (topic) => {
          setGeneratingRoadmap(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              topics: [...prev.topics, {
                id: topic.id,
                title: topic.title,
                sequenceOrder: topic.sequenceOrder,
                status: 'AVAILABLE',
                estimatedMinutes: topic.estimatedMinutes,
                completedContentCount: 0,
                totalContentCount: 0
              }]
            };
          });
        },
        async (completeData) => {
          // Generation complete
          setCreating(false);
          await loadRoadmaps();
          
          // Refresh gamification state (XP was awarded server-side)
          refreshGamification();
          
          // Re-fetch the real one so it has all the correct IDs and data
          try {
            const res = await roadmapApi.getById(completeData.roadmapId);
            if (res.data.success) {
              setGeneratingRoadmap(res.data.data);
            }
          } catch (e) {
            console.error("Failed to load completed roadmap", e);
          }
        },
        (err) => {
          setCreating(false);
          setError(err.message || 'Failed to create roadmap');
          setShowCreate(true);
          setGeneratingRoadmap(null);
        }
      );
    } catch (err: any) {
      setCreating(false);
      setError(err.message || 'Failed to start roadmap creation');
      setShowCreate(true);
      setGeneratingRoadmap(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this roadmap?')) return;
    try {
      await roadmapApi.delete(id);
      await loadRoadmaps();
    } catch {
      // silently handle
    }
  };

  const handleStart = async (id: string) => {
    try {
      await roadmapApi.start(id);
      await loadRoadmaps();
      refreshGamification();
    } catch {
      // silently handle
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput('');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-text-secondary text-base">
          <Loader2 size={17} className="spinner" />
          loading roadmaps...
        </div>
      </div>
    );
  }

  // ── Generating Canvas View ──
  // Shown while AI creates the roadmap OR right after it completes (to show the animated nodes)
  if (creating || generatingRoadmap) {
    return (
      <div className="h-full flex flex-col fade-in">
        {/* Header */}
        <div className="px-12 py-6 border-b border-border-primary bg-bg-secondary shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2.5 text-text-muted text-sm mb-1">
                <ChevronRight size={13} className="text-accent-green" />
                ~/roadmaps/generate
              </div>
              <h1 className="text-base font-semibold text-text-bright">
                {creating ? `generating: ${form.title}` : generatingRoadmap?.title}
              </h1>
            </div>
            {generatingRoadmap && (
              <div className="flex items-center gap-3.5">
                <button
                  onClick={() => {
                    setGeneratingRoadmap(null);
                  }}
                  className="px-3.5 py-2 text-sm text-text-secondary border border-border-primary rounded hover:border-border-secondary transition-colors cursor-pointer"
                >
                  back to list
                </button>
                <Link
                  to={`/roadmaps/${generatingRoadmap.id}`}
                  className="flex items-center gap-2.5 px-3.5 py-2 text-sm bg-accent-dim-green border border-accent-green/30 rounded text-accent-green hover:bg-accent-green/20 transition-colors"
                >
                  <ExternalLink size={14} />
                  open roadmap
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto p-12">
          <div className="max-w-5xl mx-auto">
            {/* Stats bar */}
            {generatingRoadmap && (
              <div className="flex items-center gap-7 mb-7 text-[15px] text-text-muted">
                <span className="text-accent-green">
                  {generatingRoadmap.topics?.length || generatingRoadmap.totalTopics} topics {creating ? 'streaming' : 'generated'}
                </span>
                <span>{generatingRoadmap.difficulty}</span>
                {selectedModelName && (
                  <span className="text-accent-blue">{selectedModelName}</span>
                )}
                {generatingRoadmap.tags?.map((t) => (
                  <span key={t} className="text-accent-cyan">#{t}</span>
                ))}
              </div>
            )}

            {generatingRoadmap?.id === 'draft' && (
              <div className="mb-10">
                <TerminalLoader
                  customText={thinkingProcess}
                  modelName={selectedModelName}
                  maxTokens={models.find((m) => m.id === form.model)?.maxTokens || 16384}
                  title="ai reasoning"
                  subtitle={form.title}
                />
              </div>
            )}
            
            <RoadmapCanvas
              topics={generatingRoadmap?.topics || []}
              isGenerating={creating}
              animate={true}
              title={creating ? form.title : generatingRoadmap?.title}
              modelName={selectedModelName}
            />

            {/* Generation complete — call to action */}
            {generatingRoadmap && generatingRoadmap.id !== 'draft' && (
              <div className="mt-10 flex items-center gap-3.5 fade-in">
                <div className="h-px flex-1 bg-border-primary" />
                <span className="text-[14px] text-accent-green uppercase tracking-wider">
                  generation complete
                </span>
                <div className="h-px flex-1 bg-border-primary" />
              </div>
            )}

            {generatingRoadmap && generatingRoadmap.id !== 'draft' && (
              <div className="mt-6 text-center fade-in">
                <p className="text-sm text-text-secondary mb-5">
                  your roadmap has been generated with {generatingRoadmap.totalTopics} topics.
                  click any node to start learning, or open the full roadmap view.
                </p>
                <div className="flex items-center justify-center gap-3.5">
                  <button
                    onClick={() => navigate(`/roadmaps/${generatingRoadmap.id}`)}
                    className="flex items-center gap-2.5 px-5 py-2.5 text-base bg-accent-dim-green border border-accent-green/30 rounded text-accent-green hover:bg-accent-green/20 transition-colors cursor-pointer"
                  >
                    <Play size={16} />
                    start learning
                  </button>
                  <button
                    onClick={() => setGeneratingRoadmap(null)}
                    className="px-5 py-2.5 text-base text-text-secondary border border-border-primary rounded hover:border-border-secondary transition-colors cursor-pointer"
                  >
                    back to list
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Roadmap List View ──
  return (
    <div className="p-12 max-w-5xl mx-auto fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <div className="flex items-center gap-2.5 text-text-muted text-sm mb-1">
            <ChevronRight size={13} className="text-accent-green" />
            ~/roadmaps
          </div>
          <h1 className="text-2xl font-semibold text-text-bright">learning roadmaps</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2.5 px-5 py-2.5 text-base bg-bg-tertiary border border-border-secondary rounded hover:border-accent-green/50 hover:text-accent-green transition-colors cursor-pointer"
        >
          <Plus size={17} />
          new roadmap
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg border border-border-primary rounded bg-bg-secondary max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-primary">
              <div className="flex items-center gap-2.5">
                <Map size={17} className="text-accent-green" />
                <span className="text-base font-medium">create new roadmap</span>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary cursor-pointer">
                <X size={17} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-5">
              {error && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-accent-dim-red border border-accent-red/30 rounded text-sm text-accent-red">
                  <AlertTriangle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-sm text-text-secondary mb-1 block">title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2 text-base text-text-primary focus:outline-none focus:border-accent-green transition-colors font-[inherit]"
                  placeholder="e.g. Learn Python for Data Science"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-text-secondary mb-1 block">goal</label>
                <input
                  value={form.goal}
                  onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))}
                  className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2 text-base text-text-primary focus:outline-none focus:border-accent-green transition-colors font-[inherit]"
                  placeholder="e.g. Master Python for ML and data analysis"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-text-secondary mb-1 block">description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2 text-base text-text-primary focus:outline-none focus:border-accent-green transition-colors font-[inherit] resize-none h-20"
                  placeholder="Brief description of what you want to learn..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3.5">
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">level</label>
                  <select
                    value={form.currentLevel}
                    onChange={(e) => setForm((p) => ({ ...p, currentLevel: e.target.value }))}
                    className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2 text-base text-text-primary focus:outline-none focus:border-accent-green font-[inherit]"
                  >
                    <option value="beginner">beginner</option>
                    <option value="intermediate">intermediate</option>
                    <option value="advanced">advanced</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}
                    className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2 text-base text-text-primary focus:outline-none focus:border-accent-green font-[inherit]"
                  >
                    <option value="easy">easy</option>
                    <option value="intermediate">intermediate</option>
                    <option value="hard">hard</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">hrs/week</label>
                  <input
                    type="number"
                    value={form.estimatedHoursPerWeek}
                    onChange={(e) => setForm((p) => ({ ...p, estimatedHoursPerWeek: parseInt(e.target.value) || 5 }))}
                    className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2 text-base text-text-primary focus:outline-none focus:border-accent-green font-[inherit]"
                    min={1}
                    max={40}
                  />
                </div>
              </div>

              {/* Model selector */}
              {models.length > 0 && (
                <div>
                  <label className="text-sm text-text-secondary mb-1 block">
                    <span className="flex items-center gap-2">
                      <Cpu size={13} />
                      ai model
                    </span>
                  </label>
                  <select
                    value={form.model || defaultModelId}
                    onChange={(e) => {
                      const modelId = e.target.value;
                      setForm((p) => ({ ...p, model: modelId }));
                      const model = models.find((m) => m.id === modelId);
                      setSelectedModelName(model?.name || modelId);
                    }}
                    className="w-full bg-bg-primary border border-border-primary rounded px-3.5 py-2 text-base text-text-primary focus:outline-none focus:border-accent-green font-[inherit]"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {m.description}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-3.5 mt-1.5 text-[13px] text-text-muted">
                    <span>max_tokens: {models.find((m) => m.id === (form.model || defaultModelId))?.maxTokens || '—'}</span>
                    <span>|</span>
                    <span>stream: {models.find((m) => m.id === (form.model || defaultModelId))?.supportsStreaming ? 'yes' : 'no'}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-text-secondary mb-1 block">tags</label>
                <div className="flex gap-2.5">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    className="flex-1 bg-bg-primary border border-border-primary rounded px-3.5 py-2 text-base text-text-primary focus:outline-none focus:border-accent-green font-[inherit]"
                    placeholder="add tag + enter"
                  />
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1.5 px-2.5 py-0.5 text-[15px] bg-bg-active border border-border-secondary rounded text-accent-cyan cursor-pointer hover:border-accent-red/50"
                        onClick={() => setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }))}
                      >
                        {tag}
                        <X size={10} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-bg-tertiary border border-border-secondary rounded px-3.5 py-2.5 text-base text-accent-green hover:bg-bg-hover hover:border-accent-green/50 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2.5"
              >
                <Plus size={17} />
                <span>generate roadmap</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Roadmap list */}
      {roadmaps.length === 0 ? (
        <div className="border border-border-primary rounded bg-bg-secondary p-16 text-center">
          <Map size={44} className="text-text-muted mx-auto mb-5" />
          <p className="text-base text-text-secondary">no roadmaps yet</p>
          <p className="text-sm text-text-muted mt-2.5">
            create your first AI-generated learning roadmap
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {roadmaps.map((rm) => (
            <div
              key={rm.id}
              className="border border-border-primary rounded bg-bg-secondary hover:border-border-secondary transition-colors"
            >
              <div className="flex items-center gap-5 px-6 py-5">
                <Link to={`/roadmaps/${rm.id}`} className="flex-1 min-w-0 group">
                  <div className="flex items-center gap-3.5">
                    <span className="text-base text-text-primary group-hover:text-accent-blue transition-colors">
                      {rm.title}
                    </span>
                    <span className={`px-2 py-0.5 text-[14px] uppercase tracking-wider border rounded ${statusBadge[rm.status]}`}>
                      {rm.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-5 mt-2 text-[15px] text-text-muted">
                    <span>{rm.totalTopics || 0} topics</span>
                    <span>{rm.difficulty}</span>
                    {rm.estimatedHours > 0 && <span>{rm.estimatedHours}h total</span>}
                    {rm.tags?.length > 0 && (
                      <span className="flex gap-1.5">
                        {rm.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-accent-cyan">#{t}</span>
                        ))}
                      </span>
                    )}
                  </div>
                </Link>

                {/* Progress */}
                <div className="w-32 flex items-center gap-2.5">
                  <div className="flex-1 h-2 bg-bg-primary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-green rounded-full transition-all"
                      style={{ width: `${rm.progressPercentage || 0}%` }}
                    />
                  </div>
                  <span className="text-[15px] text-text-muted w-10 text-right">
                    {Math.round(rm.progressPercentage || 0)}%
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5">
                  {rm.status === 'DRAFT' && (
                    <button
                      onClick={() => handleStart(rm.id)}
                      className="p-2.5 text-text-muted hover:text-accent-green transition-colors cursor-pointer"
                      title="Start"
                    >
                      <Play size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(rm.id)}
                    className="p-2.5 text-text-muted hover:text-accent-red transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
