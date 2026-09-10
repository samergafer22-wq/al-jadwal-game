import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, 
  Brain, 
  Sparkles, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Flame, 
  Filter, 
  Clock, 
  Users, 
  Layers
} from 'lucide-react';
import { ALL_CATEGORIES } from '../data/categories';
import { isWordInLexicon, getLexiconStats, norm } from '../data/arabicLexicon';
import { 
  LearnedWordEntry, 
  subscribeToLearnedLexicon, 
  learnWord, 
  getLearnedLexiconStats 
} from '../lib/learnedLexicon';

interface LearnedLexiconModalProps {
  isOpen: boolean;
  onClose: () => void;
  userDisplayName?: string;
  initialLetter?: string;
  initialCategoryId?: string;
}

const ARABIC_LETTERS = [
  'أ', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 
  'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 
  'ق', 'ك', 'ل', 'م', 'ن', 'هـ', 'و', 'ي'
];

const getCategoryEmoji = (id: string): string => {
  switch (id) {
    case 'name': return '👤';
    case 'animal': return '🦁';
    case 'plant': return '🌿';
    case 'inanimate': return '📦';
    case 'country': return '🌍';
    case 'foods': case 'food': return '🍲';
    case 'professions': return '🛠️';
    case 'space_nature': return '🪐';
    case 'brands': return '🏷️';
    case 'capital': return '🏛️';
    default: return '✨';
  }
};

export const LearnedLexiconModal: React.FC<LearnedLexiconModalProps> = ({
  isOpen,
  onClose,
  userDisplayName = 'لاعب ذكي',
  initialLetter = 'أ',
  initialCategoryId = 'name',
}) => {
  const [activeTab, setActiveTab] = useState<'learned' | 'explore' | 'teach'>('learned');
  const [learnedWords, setLearnedWords] = useState<LearnedWordEntry[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string>(initialLetter);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategoryId);
  const [searchQuery, setSearchQuery] = useState('');

  // "Teach word" form state
  const [teachWordInput, setTeachWordInput] = useState('');
  const [teachLetter, setTeachLetter] = useState(initialLetter);
  const [teachCategory, setTeachCategory] = useState(initialCategoryId);
  const [teachNotes, setTeachNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToLearnedLexicon((words) => {
      setLearnedWords(words);
    });
    return unsub;
  }, [isOpen]);

  const stats = useMemo(() => {
    const lexStats = getLexiconStats();
    const learnStats = getLearnedLexiconStats();
    return {
      baseWordCount: lexStats.totalWords,
      learnedCount: learnStats.totalLearned,
      categoriesCount: ALL_CATEGORIES.length,
    };
  }, [learnedWords]);

  // Filtered learned words
  const filteredLearned = useMemo(() => {
    return learnedWords.filter((item) => {
      if (selectedLetter && item.letter !== selectedLetter) return false;
      if (selectedCategory && item.categoryId !== selectedCategory) return false;
      if (searchQuery) {
        const query = norm(searchQuery);
        const itemNorm = norm(item.word);
        return itemNorm.includes(query) || (item.notes && item.notes.includes(searchQuery));
      }
      return true;
    });
  }, [learnedWords, selectedLetter, selectedCategory, searchQuery]);

  // Handle teaching/learning a new word
  const handleTeachWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const word = teachWordInput.trim();
    if (!word || word.length < 2) {
      setFeedback({ type: 'error', text: 'يرجى إدخال كلمة عربية صحيحة تتكون من حرفين على الأقل' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await learnWord({
        word,
        letter: teachLetter,
        categoryId: teachCategory,
        addedBy: userDisplayName,
        source: 'player_learning',
        notes: teachNotes.trim() || 'كلمة موثقة أضافها لاعب',
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          text: res.isNew 
            ? `🧠 رائع! تم تعلّم وحفظ كلمة "${word}" بنجاح في المعجم. أصبحت الآن مقبولة لجميع اللاعبين!`
            : `✨ تم تعزيز توثيق كلمة "${word}" بنجاح في المعجم!`,
        });
        setTeachWordInput('');
        setTeachNotes('');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'حدث خطأ أثناء حفظ الكلمة، يرجى المحاولة لاحقاً',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 px-5 py-4 border-b border-emerald-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">المعجم الذكي والتعلّم الذاتي</h2>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Brain className="w-3 h-3" /> يتعلّم تلقائياً
                </span>
              </div>
              <p className="text-xs text-slate-300">
                قاعدة كلمات ضخمة تضم أكثر من 18,000 كلمة موثقة مع نظام تعلم تفاعلي من إجابات اللاعبين
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-slate-950/60 border-b border-slate-800 text-center">
          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">إجمالي كلمات المعجم</div>
            <div className="text-base sm:text-lg font-black text-emerald-400 flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              +{(stats.baseWordCount + stats.learnedCount).toLocaleString('ar-EG')}
            </div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">كلمات تعلّمها التطبيق</div>
            <div className="text-base sm:text-lg font-black text-teal-300 flex items-center justify-center gap-1">
              <Brain className="w-4 h-4 text-teal-400" />
              {stats.learnedCount.toLocaleString('ar-EG')}
            </div>
          </div>
          <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">الفئات المغطاة</div>
            <div className="text-base sm:text-lg font-black text-amber-400 flex items-center justify-center gap-1">
              <Layers className="w-4 h-4 text-amber-400" />
              {stats.categoriesCount} فئة متنوعة
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 px-5 pt-3 gap-2 bg-slate-900">
          <button
            onClick={() => setActiveTab('learned')}
            className={`pb-2.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'learned'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Brain className="w-4 h-4" />
            الكلمات المُتعلمة حديثاً ({learnedWords.length})
          </button>
          <button
            onClick={() => setActiveTab('teach')}
            className={`pb-2.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'teach'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-4 h-4" />
            علّم المعجم كلمة جديدة
          </button>
          <button
            onClick={() => setActiveTab('explore')}
            className={`pb-2.5 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'explore'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            فحص كلمة في المعجم
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: LEARNED WORDS */}
          {activeTab === 'learned' && (
            <div className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث في الكلمات المتعلمة..."
                    className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Category select */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">جميع الفئات</option>
                  {ALL_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{getCategoryEmoji(c.id)} {c.label}</option>
                  ))}
                </select>

                {/* Letter select */}
                <select
                  value={selectedLetter}
                  onChange={(e) => setSelectedLetter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">جميع الحروف</option>
                  {ARABIC_LETTERS.map((l) => (
                    <option key={l} value={l}>حرف ({l})</option>
                  ))}
                </select>
              </div>

              {/* Cards Grid */}
              {filteredLearned.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                  <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
                  <h3 className="text-base font-bold text-white mb-1">لا توجد كلمات مطابقة للبحث حالياً</h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
                    يتعلم التطبيق تلقائياً عند لعب أي مباراة حية أو فردية، كما يمكنك إضافة كلمات بنفسك في تبويب "علّم المعجم كلمة جديدة".
                  </p>
                  <button
                    onClick={() => setActiveTab('teach')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> علّم المعجم كلمة الآن
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredLearned.map((item) => {
                    const catObj = ALL_CATEGORIES.find((c) => c.id === item.categoryId);
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-950/70 border border-slate-800/90 hover:border-emerald-500/50 p-3 rounded-xl transition-all flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-emerald-900/50 text-emerald-300 font-black text-sm flex items-center justify-center border border-emerald-500/30">
                              {item.letter}
                            </span>
                            <span className="text-base font-black text-white">{item.word}</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 flex items-center gap-1">
                            {getCategoryEmoji(item.categoryId)} {catObj?.label || item.categoryId}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 border-t border-slate-900 pt-2 mt-1 flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Users className="w-3 h-3" /> أضافها: {item.addedBy}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                            <Flame className="w-3 h-3" /> استخدام: {item.learnedCount}x
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEACH THE LEXICON */}
          {activeTab === 'teach' && (
            <div className="max-w-xl mx-auto bg-slate-950 p-5 rounded-2xl border border-emerald-500/20 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Brain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">إضافة وتوثيق كلمة جديدة في المعجم</h3>
                  <p className="text-xs text-slate-400">
                    أدخل كلمة عربية فصيحة أو شائعة. سيتم حفظها محلياً ومشاركتها مع جميع اللاعبين لتكون معتمدة في التقييم التلقائي.
                  </p>
                </div>
              </div>

              {feedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300' 
                    : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                }`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{feedback.text}</span>
                </div>
              )}

              <form onSubmit={handleTeachWord} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">الكلمة المراد تعليمها للمعجم:</label>
                  <input
                    type="text"
                    value={teachWordInput}
                    onChange={(e) => setTeachWordInput(e.target.value)}
                    placeholder="مثال: ثعبان، زربيان، إيكيا..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">الحرف المستهدف:</label>
                    <select
                      value={teachLetter}
                      onChange={(e) => setTeachLetter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {ARABIC_LETTERS.map((l) => (
                        <option key={l} value={l}>حرف ({l})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">الفئة المصنفة:</label>
                    <select
                      value={teachCategory}
                      onChange={(e) => setTeachCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {ALL_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{getCategoryEmoji(c.id)} {c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">ملاحظة أو دلالة الكلمة (اختياري):</label>
                  <input
                    type="text"
                    value={teachNotes}
                    onChange={(e) => setTeachNotes(e.target.value)}
                    placeholder="مثال: أكلة يمنية شهيرة، طائر مهاجر..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !teachWordInput.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isSubmitting ? 'جاري الحفظ والتعليم...' : 'حفظ الكلمة في المعجم الذكي'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: EXPLORE / VALIDATE WORD */}
          {activeTab === 'explore' && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-emerald-400" />
                  فحص فوري لأي كلمة في المعجم
                </h3>
                <p className="text-xs text-slate-400">
                  اكتب أي كلمة وتحقق مما إذا كان المعجم العربي الذكي يعتبرها صحيحة لأي فئة وحرف.
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="اكتب الكلمة هنا للفحص..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <select
                    value={selectedLetter}
                    onChange={(e) => setSelectedLetter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {ARABIC_LETTERS.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                {searchQuery.trim().length >= 2 && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                    <div className="text-xs font-bold text-slate-300">نتائج الفحص التلقائي:</div>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_CATEGORIES.slice(0, 10).map((cat) => {
                        const valid = isWordInLexicon(searchQuery.trim(), selectedLetter, cat.id);
                        return (
                          <div
                            key={cat.id}
                            className={`p-2 rounded-lg text-xs flex items-center justify-between border ${
                              valid
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                                : 'bg-slate-950/40 border-slate-800 text-slate-500'
                            }`}
                          >
                            <span>{getCategoryEmoji(cat.id)} {cat.label}</span>
                            {valid ? (
                              <span className="font-bold flex items-center gap-1 text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" /> معتمدة
                              </span>
                            ) : (
                              <span className="text-[10px]">غير مسجلة</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            يتم تحديث وحفظ المعجم في السحابة ومحلياً باستمرار
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
