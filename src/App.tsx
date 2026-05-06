import React, { useState, useMemo } from 'react';
import { CheckCircle2, AlertCircle, XCircle, Info, ArrowRight, LayoutDashboard, Sparkles } from 'lucide-react';

// Базовый список стоп-слов (предлоги, союзы, частицы)
const STOP_WORDS = new Set([
  'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из', 'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'опять', 'уж', 'вам', 'ведь', 'там', 'потом', 'себя', 'ничего', 'ей', 'может', 'они', 'тут', 'где', 'есть', 'надо', 'ней', 'для', 'мы', 'тебя', 'их', 'чем', 'была', 'сам', 'чтоб', 'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'будет', 'ж', 'тогда', 'кто', 'этот', 'того', 'потому', 'этого', 'какой', 'совсем', 'ним', 'здесь', 'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее', 'сейчас', 'были', 'куда', 'зачем', 'всех', 'никогда', 'можно', 'при', 'наконец', 'два', 'об', 'другой', 'хоть', 'после', 'над', 'больше', 'тот', 'через', 'эти', 'нас', 'про', 'всего', 'них', 'какая', 'много', 'разве', 'три', 'эту', 'моя', 'впрочем', 'хорошо', 'свою', 'этой', 'перед', 'иногда', 'лучше', 'чуть', 'том', 'нельзя', 'такой', 'им', 'более', 'всегда', 'конечно', 'всю', 'между'
]);

const tokenize = (text: string) => {
  return text
    .toLowerCase()
    .replace(/[^\w\sа-яё-]/gi, ' ') // Оставляем дефисы для слов типа интернет-магазин
    .split(/\s+/)
    .filter(Boolean);
};

const getStem = (word: string) => {
  if (word.length <= 4) return word;
  // Упрощенный стемминг для группировки однокоренных слов (окончания существительных, прилагательных, глаголов)
  return word.replace(/(ая|яя|ое|ее|ие|ые|ою|ею|ими|ыми|ем|им|ом|его|ого|ему|ому|их|ых|ую|юю|а|ев|ов|ие|ье|е|иями|ями|ами|еи|ии|и|ией|ей|ой|ий|й|иям|ям|ием|ам|ом|о|у|ах|иях|ях|ы|ь|ию|ью|ю|ия|ья|я|ть|ти|ешь|ет|ем|ете|ут|ют|ишь|ит|ите|ат|ят|л|ла|ло|ли)$/gi, '');
};

const DEFAULT_KEYWORDS = `дубленка на девочку
детские дубленки для девочек
купить дубленку для девочки
дубленка детская
дубленки и шубы для девочек
детские дубленки купить
дубленка для девочки купить
купить детскую дубленку`;

const DEFAULT_TITLE = "Детские дубленки для девочек — купить в интернет-магазине недорого";

export default function App() {
  const [keywordsInput, setKeywordsInput] = useState(DEFAULT_KEYWORDS);
  const [titleInput, setTitleInput] = useState(DEFAULT_TITLE);
  const [isGenerating, setIsGenerating] = useState(false);

  // Анализ семантического ядра
  const coreAnalysis = useMemo(() => {
    const lines = keywordsInput.split('\n').map(l => l.trim()).filter(Boolean);
    const unigrams: Record<string, number> = {};
    const bigrams: Record<string, number> = {};
    const stemBigrams: Record<string, number> = {};
    const stemGroups: Record<string, { total: number, forms: Record<string, number> }> = {};

    lines.forEach(line => {
      const tokens = tokenize(line);
      const stems = tokens.map(t => getStem(t));
      tokens.forEach((t, i) => {
        unigrams[t] = (unigrams[t] || 0) + 1;
        
        if (!STOP_WORDS.has(t)) {
          const stem = stems[i];
          if (!stemGroups[stem]) stemGroups[stem] = { total: 0, forms: {} };
          stemGroups[stem].total += 1;
          stemGroups[stem].forms[t] = (stemGroups[stem].forms[t] || 0) + 1;
        }

        if (i < tokens.length - 1) {
          const bg = `${t} ${tokens[i + 1]}`;
          bigrams[bg] = (bigrams[bg] || 0) + 1;

          const sbg = `${stems[i]} ${stems[i + 1]}`;
          stemBigrams[sbg] = (stemBigrams[sbg] || 0) + 1;
        }
      });
    });

    // Группируем по корням и находим лучшую форму
    const topSignificantGroups = Object.entries(stemGroups)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10)
      .map(([stem, data]) => {
        const bestForm = Object.entries(data.forms).sort((a, b) => b[1] - a[1])[0][0];
        return {
          stem,
          bestForm,
          total: data.total,
          weight: Math.round((data.total / lines.length) * 100)
        };
      });

    return { unigrams, bigrams, stemBigrams, stemGroups, topSignificantGroups, totalQueries: lines.length };
  }, [keywordsInput]);

  // Анализ Title
  const titleAnalysis = useMemo(() => {
    const tokens = tokenize(titleInput);
    const sigTokens = tokens.filter(t => !STOP_WORDS.has(t));
    const titleStems = tokens.map(t => getStem(t));
    
    // 1. Длина
    const length = sigTokens.length;
    const isLengthValid = length > 0 && length <= 12;

    // 2. Лишние слова (которых нет в ядре даже по корню)
    const extraWords = sigTokens.filter(t => !coreAnalysis.stemGroups[getStem(t)]);

    // 3. Охват топа и морфология
    const missingTopGroups: typeof coreAnalysis.topSignificantGroups = [];
    const wrongMorphology: { used: string, suggested: string }[] = [];
    
    coreAnalysis.topSignificantGroups.forEach(group => {
      const stemIndex = titleStems.indexOf(group.stem);
      if (stemIndex === -1) {
        missingTopGroups.push(group);
      } else {
        const usedForm = tokens[stemIndex];
        if (usedForm !== group.bestForm) {
          wrongMorphology.push({ used: usedForm, suggested: group.bestForm });
        }
      }
    });

    const coveragePercent = coreAnalysis.topSignificantGroups.length > 0 
      ? Math.round(((coreAnalysis.topSignificantGroups.length - missingTopGroups.length) / coreAnalysis.topSignificantGroups.length) * 100)
      : 0;

    // 4. Порядок слов (биграммы на основе корней)
    const orderWarnings: { used: string, suggested: string, usedCount: number, suggestedCount: number }[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
      const sbg = `${titleStems[i]} ${titleStems[i + 1]}`;
      const revSbg = `${titleStems[i + 1]} ${titleStems[i]}`;
      
      // Если оба корня есть в ядре, проверяем их порядок
      if (coreAnalysis.stemGroups[titleStems[i]] && coreAnalysis.stemGroups[titleStems[i+1]]) {
        const sbgCount = coreAnalysis.stemBigrams[sbg] || 0;
        const revSbgCount = coreAnalysis.stemBigrams[revSbg] || 0;
        
        // Если обратный порядок корней встречается строго чаще прямого
        if (revSbgCount > sbgCount && revSbgCount > 0) {
          // Для наглядности берем лучшие формы этих корней
          const bestForm1 = coreAnalysis.topSignificantGroups.find(g => g.stem === titleStems[i])?.bestForm || tokens[i];
          const bestForm2 = coreAnalysis.topSignificantGroups.find(g => g.stem === titleStems[i+1])?.bestForm || tokens[i+1];
          
          orderWarnings.push({ 
            used: `${tokens[i]} ${tokens[i+1]}`, 
            suggested: `${bestForm2} ${bestForm1}`, 
            usedCount: sbgCount, 
            suggestedCount: revSbgCount 
          });
        }
      }
    }

    // Расчет общего скора (0-100)
    const lengthPenalty = !isLengthValid ? Math.abs(length - 12) * 5 : 0;
    const extraWordsPenalty = extraWords.length * 10;
    const coveragePenalty = (missingTopGroups.length * 5) + (wrongMorphology.length * 2);
    const orderPenalty = orderWarnings.length * 5;

    const score = Math.max(0, 100 - lengthPenalty - extraWordsPenalty - coveragePenalty - orderPenalty);
    
    return {
      tokens,
      titleStems,
      sigTokens,
      length,
      isLengthValid,
      extraWords,
      missingTopGroups,
      wrongMorphology,
      coveragePercent,
      orderWarnings,
      penalties: {
        length: lengthPenalty,
        extraWords: extraWordsPenalty,
        coverage: coveragePenalty,
        order: orderPenalty
      },
      score: Math.max(0, Math.min(100, score))
    };
  }, [titleInput, coreAnalysis]);

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      // Ключ берется из переменных окружения, либо используется предоставленный в запросе
      const apiKey = import.meta.env.VITE_ROUTERAI_API_KEY || "sk-idWLIk8WBHJJiwn-Y2oyMNdW0ckjsfIa";
      
      const reqBody = {
        model: "anthropic/claude-sonnet-4.6",
        messages: [
          {
            role: "system",
            content: "Ты — эксперт по SEO текстовому ранжированию. Твоя задача — составить идеальный Title на основе семантического ядра. Правила: 1) Включи максимальное число значимых корней (максимизируй кворум). 2) Сохраняй прямой порядок самых частых биграмм. 3) Длина строго не более 12 значимых слов. 4) НЕ используй слова, которых нет в семантике (они снижают BM25 вес). 5) Призыв к действию и читабельность должна быть естественной. Ответь ТОЛЬКО готовым текстом Title, без кавычек и дополнительных слов."
          },
          {
            role: "user",
            content: `Вот моё семантическое ядро (список запросов):\n${keywordsInput}`
          }
        ]
      };

      const response = await fetch("https://routerai.ru/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // В зависимости от прокси может требоваться Bearer, но оставляю возможность работы и с сырым ключом
          "Authorization": apiKey.startsWith("sk-") ? `Bearer ${apiKey}` : apiKey
        },
        body: JSON.stringify(reqBody)
      });

      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (data.choices?.[0]?.message?.content) {
        setTitleInput(data.choices[0].message.content.trim().replace(/^['"-]+|['"-]+$/g, ''));
      }
    } catch (e) {
      console.error("Ошибка при генерации AI:", e);
      alert("Не удалось сгенерировать Title. Проверьте консоль для деталей.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            <h1 className="text-lg font-semibold tracking-tight">BM25 Title Analyzer</h1>
          </div>
          <div className="text-sm text-neutral-500 hidden sm:block">
            Оптимизация на основе косвенных метрик текстового ранжирования
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-neutral-900">
                  Семантическое ядро (Кластер)
                </label>
                <span className="text-xs font-medium bg-neutral-100 text-neutral-600 px-2 py-1 rounded-md">
                  {coreAnalysis.totalQueries} запросов
                </span>
              </div>
              <p className="text-xs text-neutral-500 mb-3">
                Вставьте список запросов. Алгоритм извлечет частотные слова и пары слов (биграммы) для эталона.
              </p>
              <textarea
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                className="w-full h-64 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                placeholder="дубленка на девочку&#10;детские дубленки..."
              />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-neutral-900">
                  Анализируемый Title
                </label>
                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !keywordsInput.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg text-xs font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGenerating ? "Генерация..." : "Умная генерация"}
                </button>
              </div>
              
              <div className="mb-4">
                <span className="block text-xs font-medium text-neutral-500 mb-2">
                  Топ-10 слов кластера (сгруппированы по корню):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {coreAnalysis.topSignificantGroups.map((group) => {
                    const stemIndex = titleAnalysis.titleStems.indexOf(group.stem);
                    const isPresent = stemIndex !== -1;
                    const isExactMatch = isPresent && titleAnalysis.tokens[stemIndex] === group.bestForm;
                    
                    let colorClass = 'bg-red-50 text-red-600 border-red-200'; // Missing
                    if (isExactMatch) colorClass = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium'; // Perfect
                    else if (isPresent) colorClass = 'bg-amber-100 text-amber-800 border-amber-300 font-medium'; // Wrong form

                    return (
                      <span
                        key={group.stem}
                        className={`text-xs px-2 py-1 rounded-md border transition-colors duration-300 flex items-center gap-1 ${colorClass}`}
                        title={isPresent && !isExactMatch ? `Вы использовали "${titleAnalysis.tokens[stemIndex]}". Лучше: "${group.bestForm}"` : ''}
                      >
                        {group.bestForm}
                        <span className="opacity-60 text-[10px] bg-white/40 px-1 rounded">{group.weight}%</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <textarea
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full h-24 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                placeholder="Введите ваш Title..."
              />
              <div className="mt-3 flex flex-wrap gap-1">
                {titleAnalysis.tokens.map((token, idx) => {
                  const isStop = STOP_WORDS.has(token);
                  const isExtra = titleAnalysis.extraWords.includes(token);
                  const stem = getStem(token);
                  const group = coreAnalysis.topSignificantGroups.find(g => g.stem === stem);
                  const isWrongForm = group && group.bestForm !== token;

                  return (
                    <span 
                      key={idx} 
                      className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1 ${
                        isStop ? 'bg-neutral-100 text-neutral-400 border-transparent' :
                        isExtra ? 'bg-red-50 text-red-700 border-red-200' :
                        isWrongForm ? 'bg-amber-50 text-amber-700 border-amber-200 font-medium' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                      }`}
                      title={isStop ? 'Стоп-слово (вес ≈ 0)' : isExtra ? 'Нет в семантике (размывает вес)' : isWrongForm ? `Неоптимальная форма. Лучше: ${group.bestForm}` : 'Значимое слово из семантики'}
                    >
                      {token}
                      {group && <span className="opacity-60 text-[10px] bg-white/50 px-1 rounded" title="Вес слова в кластере">{group.weight}%</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Analysis Dashboard */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Score Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-900">Оценка BM25 (Прокси)</h2>
                  <p className="text-sm text-neutral-500 mt-1">На основе 4 ключевых метрик текстовой релевантности</p>
                </div>
                <div className="flex items-center justify-center w-20 h-20 rounded-full border-4 border-neutral-50 relative">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-neutral-100"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className={titleAnalysis.score >= 80 ? "text-emerald-500" : titleAnalysis.score >= 50 ? "text-amber-500" : "text-red-500"}
                      strokeDasharray={`${titleAnalysis.score}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                  </svg>
                  <span className="text-2xl font-bold tracking-tighter">{titleAnalysis.score}</span>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
                <div className="text-center">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Длина</span>
                  <span className={`text-sm font-bold ${titleAnalysis.penalties.length > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {titleAnalysis.penalties.length > 0 ? `-${titleAnalysis.penalties.length}` : '100%'}
                  </span>
                </div>
                <div className="text-center border-l border-neutral-100">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Лишние</span>
                  <span className={`text-sm font-bold ${titleAnalysis.penalties.extraWords > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {titleAnalysis.penalties.extraWords > 0 ? `-${titleAnalysis.penalties.extraWords}` : '100%'}
                  </span>
                </div>
                <div className="text-center border-l border-neutral-100">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Охват</span>
                  <span className={`text-sm font-bold ${titleAnalysis.penalties.coverage > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {titleAnalysis.penalties.coverage > 0 ? `-${titleAnalysis.penalties.coverage}` : '100%'}
                  </span>
                </div>
                <div className="text-center border-l border-neutral-100">
                  <span className="block text-[10px] uppercase tracking-wider font-bold text-neutral-400 mb-1">Порядок</span>
                  <span className={`text-sm font-bold ${titleAnalysis.penalties.order > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    {titleAnalysis.penalties.order > 0 ? `-${titleAnalysis.penalties.order}` : '100%'}
                  </span>
                </div>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Metric 1: Length */}
              <div className={`p-5 rounded-2xl border ${titleAnalysis.isLengthValid ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {titleAnalysis.isLengthValid ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                    Длина Title
                  </h3>
                  <span className={`text-lg font-bold ${titleAnalysis.isLengthValid ? 'text-emerald-700' : 'text-red-700'}`}>
                    {titleAnalysis.length} <span className="text-xs font-normal opacity-70">слов</span>
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  BM25 нормализует вес по длине. Оптимум <strong>≤ 12 значимых слов</strong>. Предлоги не учитываются.
                </p>
                {!titleAnalysis.isLengthValid && (
                  <div className="mt-3 text-xs bg-white/60 text-red-800 p-2 rounded-lg border border-red-100">
                    Title слишком длинный. Вес каждого слова размывается. Удалите наименее важные слова.
                  </div>
                )}
              </div>

              {/* Metric 2: Extra Words */}
              <div className={`p-5 rounded-2xl border ${titleAnalysis.extraWords.length === 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {titleAnalysis.extraWords.length === 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                    Лишние слова
                  </h3>
                  <span className={`text-lg font-bold ${titleAnalysis.extraWords.length === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {titleAnalysis.extraWords.length}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Слова, которых нет в семантике (IDF ≈ 0 для кластера), занимают место и снижают релевантность.
                </p>
                {titleAnalysis.extraWords.length > 0 && (
                  <div className="mt-3 text-xs bg-white/60 text-amber-900 p-2 rounded-lg border border-amber-100 flex flex-wrap gap-1">
                    Удалите или замените: 
                    {titleAnalysis.extraWords.map((w, i) => <span key={i} className="font-semibold underline decoration-amber-300">{w}</span>)}
                  </div>
                )}
              </div>

              {/* Metric 3: Coverage */}
              <div className={`p-5 rounded-2xl border ${titleAnalysis.coveragePercent >= 80 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-amber-50/50 border-amber-100'}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {titleAnalysis.coveragePercent >= 80 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Info className="w-4 h-4 text-amber-600" />}
                    Охват ТОП-10 слов
                  </h3>
                  <span className={`text-lg font-bold ${titleAnalysis.coveragePercent >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {titleAnalysis.coveragePercent}%
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Наличие самых частотных корней из семантического ядра.
                </p>
                {titleAnalysis.missingTopGroups.length > 0 && (
                  <div className="mt-3 text-xs bg-white/60 text-amber-900 p-2 rounded-lg border border-amber-100">
                    <span className="block mb-1 opacity-80">Упущенные смыслы:</span>
                    <div className="flex flex-wrap gap-1">
                      {titleAnalysis.missingTopGroups.slice(0, 5).map((g, i) => (
                        <span key={i} className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-800">{g.bestForm}</span>
                      ))}
                      {titleAnalysis.missingTopGroups.length > 5 && <span>и еще {titleAnalysis.missingTopGroups.length - 5}...</span>}
                    </div>
                  </div>
                )}
                {titleAnalysis.wrongMorphology.length > 0 && (
                  <div className="mt-2 text-xs bg-white/60 text-amber-900 p-2 rounded-lg border border-amber-100">
                    <span className="block mb-1 opacity-80">Неоптимальная морфология:</span>
                    {titleAnalysis.wrongMorphology.map((w, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="line-through opacity-70">{w.used}</span>
                        <ArrowRight className="w-3 h-3 opacity-50" />
                        <span className="font-bold">{w.suggested}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Metric 4: Word Order (Bigrams) */}
              <div className={`p-5 rounded-2xl border ${titleAnalysis.orderWarnings.length === 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    {titleAnalysis.orderWarnings.length === 0 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
                    Порядок слов
                  </h3>
                  <span className={`text-lg font-bold ${titleAnalysis.orderWarnings.length === 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {titleAnalysis.orderWarnings.length === 0 ? 'ОК' : `${titleAnalysis.orderWarnings.length} ошиб.`}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Прямой порядок биграмм дает вес +1.0, обратный +0.5. Проверка по частотности пар в ядре.
                </p>
                {titleAnalysis.orderWarnings.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {titleAnalysis.orderWarnings.map((w, i) => (
                      <div key={i} className="text-xs bg-white/60 text-red-900 p-2 rounded-lg border border-red-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="line-through opacity-70">{w.used}</span>
                          <ArrowRight className="w-3 h-3 mx-1 opacity-50" />
                          <span className="font-bold text-red-700">{w.suggested}</span>
                        </div>
                        <div className="text-[10px] opacity-70 flex justify-between">
                          <span>В ядре: {w.usedCount} раз</span>
                          <span>В ядре: {w.suggestedCount} раз</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
