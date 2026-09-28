import React, { useState } from 'react';
import { ALL_LEVELS, TIERS } from '../data/levels';
import { playTap } from '../utils/sfx';
import {
  Database,
  Search,
  Copy,
  Download,
  Check,
  X,
  Code,
  List,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface DatabaseViewerModalProps {
  soundEnabled: boolean;
  onClose: () => void;
  onJumpToLevel?: (id: number) => void;
}

export const DatabaseViewerModal: React.FC<DatabaseViewerModalProps> = ({
  soundEnabled,
  onClose,
  onJumpToLevel,
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState<'list' | 'json'>('list');

  const filtered = ALL_LEVELS.filter((l) => {
    const matchesTier = selectedTier === 'all' || l.tier === selectedTier;
    const matchesSearch =
      l.id.toString() === search.trim() ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.prompt.toLowerCase().includes(search.toLowerCase()) ||
      l.category.toLowerCase().includes(search.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const handleCopyJson = () => {
    playTap(soundEnabled);
    const jsonStr = JSON.stringify(ALL_LEVELS, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadJson = () => {
    playTap(soundEnabled);
    const jsonStr = JSON.stringify(ALL_LEVELS, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '100_steps_of_logic_levels.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md">
      <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="px-5 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white tracking-wide">
                Database 100 Level & Ekspor JSON
              </h2>
              <p className="text-xs text-slate-400">
                Total {ALL_LEVELS.length} level lengkap dengan Soal, Jawaban, Hint 1 & 2, dan Solusi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy JSON */}
            <button
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              title="Salin seluruh database ke format JSON"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Salin JSON</span>
                </>
              )}
            </button>

            {/* Download JSON */}
            <button
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md transition"
              title="Unduh file levels.json"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh JSON</span>
            </button>

            {/* Close */}
            <button
              onClick={() => {
                playTap(soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* View Mode & Filter Subheader */}
        <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tab selector: List vs Raw JSON */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeTab === 'list'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Daftar Interaktif</span>
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                activeTab === 'json'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Preview Struktur JSON</span>
            </button>
          </div>

          {/* Search & Tier Filters (for list mode) */}
          {activeTab === 'list' && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Tier dropdown / tabs */}
              <div className="flex items-center gap-1">
                {['all', 'beginner', 'intermediate', 'advanced', 'master'].map((tierId) => (
                  <button
                    key={tierId}
                    onClick={() => setSelectedTier(tierId)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      selectedTier === tierId
                        ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {tierId === 'all'
                      ? 'Semua'
                      : tierId === 'beginner'
                      ? 'Pemula'
                      : tierId === 'intermediate'
                      ? 'Menengah'
                      : tierId === 'advanced'
                      ? 'Lanjutan'
                      : 'Master'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari level..."
                  className="w-full pl-8 pr-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950">
          {activeTab === 'list' ? (
            <div className="flex flex-col gap-3 max-w-4xl mx-auto">
              <span className="text-xs text-slate-400 mb-1">
                Menampilkan {filtered.length} dari 100 level teka-teki:
              </span>

              {filtered.map((lvl) => {
                const isExpanded = expandedId === lvl.id;
                return (
                  <div
                    key={lvl.id}
                    className="flex flex-col rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-md transition"
                  >
                    {/* Collapsible Row Header */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : lvl.id)}
                      className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-850 select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-mono font-bold text-xs text-indigo-400">
                          #{lvl.id}
                        </span>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {lvl.title}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {lvl.category} · {lvl.tier.toUpperCase()} · Tipe: {lvl.type}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onJumpToLevel && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playTap(soundEnabled);
                              onClose();
                              onJumpToLevel(lvl.id);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-200 text-[11px] font-semibold transition"
                          >
                            Mainkan
                          </button>
                        )}
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col gap-3 text-xs">
                        {/* Soal / Prompt */}
                        <div>
                          <span className="text-slate-400 font-semibold block mb-0.5">Soal Teka-Teki:</span>
                          <p className="text-white font-medium bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                            {lvl.prompt}
                          </p>
                        </div>

                        {/* Options (if multiple choice) */}
                        {lvl.options && (
                          <div>
                            <span className="text-slate-400 font-semibold block mb-0.5">Pilihan Ganda:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {lvl.options.map((opt, i) => (
                                <span
                                  key={i}
                                  className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                                    opt === lvl.answer
                                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold'
                                      : 'bg-slate-900 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  {opt} {opt === lvl.answer && '✓ (Kunci)'}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Jawaban */}
                        <div>
                          <span className="text-slate-400 font-semibold block mb-0.5">Kunci Jawaban:</span>
                          <span className="inline-block px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
                            {Array.isArray(lvl.answer) ? lvl.answer.join(' / ') : lvl.answer}
                          </span>
                        </div>

                        {/* Hints */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-emerald-400 font-bold block mb-1">
                              💡 Hint 1 (Clue Ringan):
                            </span>
                            <p className="text-slate-300 text-[11px]">{lvl.hint1}</p>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                            <span className="text-amber-400 font-bold block mb-1">
                              🔍 Hint 2 (Clue Mendalam):
                            </span>
                            <p className="text-slate-300 text-[11px]">{lvl.hint2}</p>
                          </div>
                        </div>

                        {/* Solution & Explanation */}
                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                          <span className="text-rose-400 font-bold block mb-1">
                            📖 Solusi & Penjelasan Lengkap:
                          </span>
                          <p className="text-slate-200 text-[11px] leading-relaxed mb-1">
                            {lvl.solution}
                          </p>
                          <span className="text-slate-400 italic text-[11px]">
                            Logika: {lvl.explanation}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* RAW JSON VIEW */
            <div className="max-w-4xl mx-auto flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Struktur Data JSON (100 Level Object Array):</span>
                <button
                  onClick={handleCopyJson}
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin ke Clipboard</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[68vh] leading-relaxed selection:bg-indigo-600">
                {JSON.stringify(ALL_LEVELS, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
