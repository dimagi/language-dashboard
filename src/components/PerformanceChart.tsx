import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ErrorBar,
} from 'recharts';

type MetricKey = 'readability' | 'adequacy' | 'grammatically_correct' | 'real_words' | 'notable_error';

type PerformanceChartProps = {
  /* Your app’s props */
  languageData?: any[];           // [{ language, models: [{ model, readability, adequacy, ...}, ...] }, ...]
  languageGroups?: any[];         // not required for rendering

  /* Alternate inputs the component also understands */
  languages?: string[];
  availableLanguages?: string[];
  langs?: string[];
  perLanguageMetrics?: Record<string, Record<string, any>>;
  metrics?: Record<string, Record<string, any>>;
  data?: Record<string, Record<string, any>>;
  chartData?: Array<Record<string, any>>;
  rows?: Array<Record<string, any>>;
  modelOrder?: string[];
  MODEL_ORDER?: string[];
  models?: string[];

  /* Display + theming */
  getDisplayModelName?: (slug: string) => string;
  modelDisplayNameBySlug?: Record<string, string>;  // optional map: slug -> pretty name
  colorByModel?: Record<string, string>;            // optional map: slug -> CSS color
  palette?: string[];                               // optional palette fallback (CSS colors)

  /* State & layout */
  selectedMetric?: MetricKey;
  metric?: MetricKey;
  hiddenModels?: Set<string> | string[];
  hidden?: Set<string> | string[];
  height?: number;
};

/* ----------------------- constants ----------------------- */

const METRICS_CONFIG = {
  readability: {
    label: 'Readability',
    domain: [1, 7],
    isPercentage: false,
    dataKey: 'readability_mean'
  },
  adequacy: {
    label: 'Adequacy',
    domain: [1, 7],
    isPercentage: false,
    dataKey: 'adequacy_mean'
  },
  grammatically_correct: {
    label: 'Grammatical Correct (%)',
    domain: [0, 100],
    isPercentage: true,
    dataKey: 'grammatically_correct_pct'
  },
  real_words: {
    label: 'Real Words (%)',
    domain: [0, 100],
    isPercentage: true,
    dataKey: 'real_words_pct'
  },
  notable_error: {
    label: 'Notable Error (%)',
    domain: [0, 100],
    isPercentage: true,
    dataKey: 'notable_error_pct'
  }
} as const;

const PREVIOUS_WINNERS = new Set([
  'claude-3-5-sonnet-20241022',
  'gpt-4o-2024-11-20'
]);

const CURRENT_COMPETITORS = new Set([
  'claude-sonnet-4-20250514',
  'gpt-5-2025-08-07', 
  'gpt-4.1-2025-04-14',
  'gemini-2.5-pro'
]);

/* ----------------------- helpers ----------------------- */

function toSet(x: PerformanceChartProps['hiddenModels'] | PerformanceChartProps['hidden']): Set<string> {
  if (!x) return new Set();
  if (x instanceof Set) return x;
  if (Array.isArray(x)) return new Set(x);
  return new Set();
}

function asNumberOrNull(v: any): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function slugifyModelName(x: any): string {
  const s = String(x ?? '').trim();
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')          // spaces -> hyphens
    .replace(/[^a-z0-9._-]/g, ''); // keep letters, digits, dot, underscore, hyphen
}

// Friendlier default than title-casing the whole slug
// - keep dots (e.g., "4.1")
// - turn "-" and "_" into spaces
// - capitalize first alpha of each token
function defaultPrettyModel(slug: string): string {
  const withSpaces = slug.replace(/[-_]+/g, ' ');
  return withSpaces.replace(/\b([a-z])([a-z0-9._]*)/g, (_, a: string, rest: string) => a.toUpperCase() + rest);
}

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function displayNameFor(
  slug: string,
  getDisplay?: (s: string) => string,
  map?: Record<string, string>,
): string {
  if (map && map[slug]) return map[slug];
  if (getDisplay) return getDisplay(slug);
  return defaultPrettyModel(slug);
}

/** djb2-ish hash for stable color selection */
function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function colorFromSlug(
  slug: string,
  colorByModel?: Record<string, string>,
  palette?: string[],
): string {
  if (colorByModel && colorByModel[slug]) return colorByModel[slug];
  const fallbackPalette =
    palette && palette.length
      ? palette
      : [
          // pleasant, distinct defaults
          '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f',
          '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ab',
          '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
          '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
        ];
  const idx = hash(slug) % fallbackPalette.length;
  return fallbackPalette[idx];
}

/**
 * Build normalized chart rows with keys:
 *   language
 *   `${model}_${metric}` and `${model}_${metric}_error`
 */
function buildChartDataFromNested(
  languages: string[],
  perLanguageMetrics: Record<string, Record<string, any>>,
  modelOrder: string[],
): Array<Record<string, any>> {
  return languages.map((lang) => {
    const row: Record<string, any> = { language: lang };
    const metricsForLang = perLanguageMetrics?.[lang] ?? {};
    for (const m of modelOrder) {
      const src = metricsForLang?.[m] ?? {};

      // Readability (1-7 scale)
      const r = asNumberOrNull(src.readability);
      const rE_raw = asNumberOrNull(src.readability_se ?? src.readability_error ?? src.readability_ci ?? src.readabilityStdErr);
      const rE = rE_raw && r ? Math.min(rE_raw, 7 - r, r - 1) : rE_raw;

      // Adequacy (1-7 scale)
      const a = asNumberOrNull(src.adequacy);
      const aE_raw = asNumberOrNull(src.adequacy_se ?? src.adequacy_error ?? src.adequacy_ci ?? src.adequacyStdErr);
      const aE = aE_raw && a ? Math.min(aE_raw, 7 - a, a - 1) : aE_raw;

      // Binary/percentage metrics (0-100%)
      const grammatically_correct = asNumberOrNull(src.grammatically_correct);
      const real_words = asNumberOrNull(src.real_words);
      const notable_error = asNumberOrNull(src.notable_error);

      // Store all metrics
      row[`${m}_readability`] = r;
      row[`${m}_readability_error`] = rE;
      row[`${m}_adequacy`] = a;
      row[`${m}_adequacy_error`] = aE;
      row[`${m}_grammatically_correct`] = grammatically_correct;
      row[`${m}_real_words`] = real_words;
      row[`${m}_notable_error`] = notable_error;
    }
    return row;
  });
}

/**
 * Try to derive (languages, perLanguageMetrics, modelOrder) from a loose languageData shape.
 * Handles:
 *  A) { language, models: [{ model, readability, adequacy, readability_se, adequacy_se }, ...] }
 *  B) keys like 'gpt-4o_readability' directly on the entry object
 */
function deriveFromLanguageData(languageData: any[] | undefined): {
  languages: string[];
  perLanguageMetrics: Record<string, Record<string, any>>;
  modelOrder: string[];
} {
  const perLang: Record<string, Record<string, any>> = {};
  const modelSet = new Set<string>();
  const languages: string[] = [];

  if (!Array.isArray(languageData) || languageData.length === 0) {
    return { languages, perLanguageMetrics: perLang, modelOrder: [] };
  }

  for (const entry of languageData) {
    const lang: string =
      entry?.language ?? entry?.lang ?? entry?.code ?? entry?.id ?? entry?.name ?? '';
    if (!lang) continue;
    languages.push(lang);

    const modelsForLang: Record<string, any> = {};

    if (Array.isArray(entry?.models)) {
      for (const m of entry.models) {
        const slug = slugifyModelName(m?.model ?? m?.model_slug ?? m?.name);
        if (!slug) continue;
        modelSet.add(slug);
        // Extract all metrics
        const readability = m?.readability ?? m?.avg_readability ?? m?.readability_mean;
        const readability_se_raw = m?.readability_se ?? m?.readability_stderr ?? m?.readability_ci ??
          (m?.readability_ci_high && m?.readability_ci_low ?
            (m.readability_ci_high - m.readability_ci_low) / 2 : undefined);
        const readability_se = readability_se_raw && readability ?
          Math.min(readability_se_raw, 7 - readability, readability - 1) : readability_se_raw;

        const adequacy = m?.adequacy ?? m?.avg_adequacy ?? m?.adequacy_mean;
        const adequacy_se_raw = m?.adequacy_se ?? m?.adequacy_stderr ?? m?.adequacy_ci ??
          (m?.adequacy_ci_high && m?.adequacy_ci_low ?
            (m.adequacy_ci_high - m.adequacy_ci_low) / 2 : undefined);
        const adequacy_se = adequacy_se_raw && adequacy ?
          Math.min(adequacy_se_raw, 7 - adequacy, adequacy - 1) : adequacy_se_raw;

        // Extract binary/percentage metrics
        const grammatically_correct = m?.grammatically_correct_pct ?? m?.grammatically_correct;
        const real_words = m?.real_words_pct ?? m?.real_words;
        const notable_error = m?.notable_error_pct ?? m?.notable_error;

        modelsForLang[slug] = {
          readability,
          readability_se,
          adequacy,
          adequacy_se,
          grammatically_correct,
          real_words,
          notable_error,
        };
      }
    } else {
      const keys = Object.keys(entry);
      const modelMetricRegex = /^(.+?)_(readability|adequacy)(?:_(se|stderr|ci|error))?$/i;

      for (const k of keys) {
        const m = k.match(modelMetricRegex);
        if (!m) continue;
        const slug = slugifyModelName(m[1]);
        const metric = m[2].toLowerCase();
        const errKind = m[3]?.toLowerCase();

        if (!modelsForLang[slug]) modelsForLang[slug] = {};
        modelSet.add(slug);

        if (!errKind) {
          modelsForLang[slug][metric] = entry[k];
        } else {
          modelsForLang[slug][`${metric}_se`] = entry[k];
        }
      }
    }

    perLang[lang] = modelsForLang;
  }

  const modelOrder = Array.from(modelSet).sort();
  return { languages, perLanguageMetrics: perLang, modelOrder };
}

/* ----------------------- component ----------------------- */

export default function PerformanceChart(props: PerformanceChartProps) {
  // State for hidden models, languages, and language groups
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());
  const [hiddenLanguages, setHiddenLanguages] = useState<Set<string>>(new Set());
  const [hiddenLanguageGroups, setHiddenLanguageGroups] = useState<Set<string>>(new Set());
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('readability');

  // Prefer explicit props; else derive from languageData
  const explicitLanguages: string[] =
    props.languages ?? props.availableLanguages ?? props.langs ?? [];

  const explicitNested: Record<string, Record<string, any>> =
    props.perLanguageMetrics ?? props.metrics ?? props.data ?? {};

  const explicitModels: string[] =
    props.modelOrder ?? props.MODEL_ORDER ?? props.models ?? [];

  const derived = useMemo(() => deriveFromLanguageData(props.languageData), [props.languageData]);

  const languages = explicitLanguages.length ? explicitLanguages : derived.languages;
  const perLanguageMetrics =
    Object.keys(explicitNested).length ? explicitNested : derived.perLanguageMetrics;
  const modelOrder = explicitModels.length ? explicitModels : derived.modelOrder;

  // Use internal state, but allow props to override
  const currentSelectedMetric: MetricKey =
    (props.selectedMetric ?? props.metric ?? selectedMetric) as MetricKey;

  // Combine external hidden models with internal state
  const propsHidden = toSet(props.hiddenModels ?? props.hidden);
  const allHiddenModels = new Set([...Array.from(propsHidden), ...Array.from(hiddenModels)]);
  const height = props.height ?? 360;

  // Filter languages based on hidden languages and language groups
  const filteredLanguages = useMemo(() => {
    return languages.filter(lang => {
      if (hiddenLanguages.has(lang)) return false;

      // Check if language's group is hidden
      const group = props.languageGroups?.find(g => g.languages.includes(lang));
      if (group && hiddenLanguageGroups.has(group.name)) return false;

      return true;
    });
  }, [languages, hiddenLanguages, hiddenLanguageGroups, props.languageGroups]);

  const chartData = useMemo(() => {
    if (props.chartData?.length) {
      return props.chartData.filter(row => filteredLanguages.includes(row.language));
    }
    if (props.rows?.length) {
      return props.rows.filter(row => filteredLanguages.includes(row.language));
    }
    if (!filteredLanguages.length || !modelOrder.length) return [];
    return buildChartDataFromNested(filteredLanguages, perLanguageMetrics, modelOrder);
  }, [props.chartData, props.rows, filteredLanguages, perLanguageMetrics, modelOrder]);

  const seriesModelsWithData = useMemo(() => {
    return modelOrder.filter((m) =>
      chartData?.some((row) => typeof row?.[`${m}_${currentSelectedMetric}`] === 'number'),
    );
  }, [chartData, modelOrder, currentSelectedMetric]);

  // Keep the full ordered series (including hidden models for consistent positioning)
  const allOrderedSeries = useMemo(() => {
    // Create specific order: Claude 3.5, Claude Sonnet 4, Gemini, GPT-5, GPT-4.1, GPT-4o
    const orderedModels = seriesModelsWithData.sort((a, b) => {
      const orderMap: Record<string, number> = {
        'claude-3-5-sonnet-20241022': 1,  // Previous winner, at the front
        'claude-sonnet-4-20250514': 2,    // Current Anthropic
        'gemini-2.5-pro': 3,              // Google
        'gpt-5-2025-08-07': 4,            // Current OpenAI (newer)
        'gpt-4.1-2025-04-14': 5,          // Current OpenAI (older)
        'gpt-4o-2024-11-20': 6,           // Previous winner, at the end
      };
      return (orderMap[a] || 999) - (orderMap[b] || 999);
    });

    return orderedModels;
  }, [seriesModelsWithData]);

  // Filter for visible series (only for chart rendering)
  const visibleSeries = useMemo(() => {
    return allOrderedSeries.filter((m) => !allHiddenModels.has(m));
  }, [allOrderedSeries, allHiddenModels]);

  // Toggle functions
  const toggleModel = (modelSlug: string) => {
    setHiddenModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelSlug)) {
        newSet.delete(modelSlug);
      } else {
        newSet.add(modelSlug);
      }
      return newSet;
    });
  };

  const toggleLanguage = (language: string) => {
    setHiddenLanguages(prev => {
      const newSet = new Set(prev);
      const group = props.languageGroups?.find(g => g.languages.includes(language));

      if (newSet.has(language)) {
        // Enabling the language - remove it from hidden languages
        newSet.delete(language);

        // If this was the last hidden language in its group, enable the group too
        if (group) {
          const otherLanguagesInGroup = group.languages.filter((lang: string) => lang !== language);
          const allOtherLanguagesVisible = otherLanguagesInGroup.every((lang: string) => !newSet.has(lang));

          if (allOtherLanguagesVisible) {
            setHiddenLanguageGroups(prevGroups => {
              const newGroupSet = new Set(prevGroups);
              newGroupSet.delete(group.name);
              return newGroupSet;
            });
          }
        }
      } else {
        // Disabling the language - add it to hidden languages
        newSet.add(language);

        // If all languages in the group are now hidden, hide the group too
        if (group) {
          const allLanguagesInGroupHidden = group.languages.every((lang: string) =>
            lang === language || newSet.has(lang)
          );

          if (allLanguagesInGroupHidden) {
            setHiddenLanguageGroups(prevGroups => {
              const newGroupSet = new Set(prevGroups);
              newGroupSet.add(group.name);
              return newGroupSet;
            });
          }
        }
      }
      return newSet;
    });
  };

  const toggleLanguageGroup = (groupName: string) => {
    setHiddenLanguageGroups(prev => {
      const newSet = new Set(prev);
      const group = props.languageGroups?.find(g => g.name === groupName);

      if (newSet.has(groupName)) {
        // Enabling the group - remove it from hidden groups and restore all its languages
        newSet.delete(groupName);
        if (group) {
          setHiddenLanguages(prevLangs => {
            const newLangSet = new Set(prevLangs);
            group.languages.forEach((lang: string) => newLangSet.delete(lang));
            return newLangSet;
          });
        }
      } else {
        // Disabling the group - add it to hidden groups and hide all its languages
        newSet.add(groupName);
        if (group) {
          setHiddenLanguages(prevLangs => {
            const newLangSet = new Set(prevLangs);
            group.languages.forEach((lang: string) => newLangSet.add(lang));
            return newLangSet;
          });
        }
      }
      return newSet;
    });
  };

  // Stable color/pattern getter
  const colorFor = (slug: string) => {
    if (slug === 'claude-3-5-sonnet-20241022') return 'url(#claudeHatch)';
    if (slug === 'gpt-4o-2024-11-20') return 'url(#gptCross)';
    return colorFromSlug(slug, props.colorByModel, props.palette);
  };

  // Name getter
  const pretty = (slug: string) =>
    displayNameFor(slug, props.getDisplayModelName, props.modelDisplayNameBySlug);

  const noData = !chartData?.length || visibleSeries.length === 0;

  // Create legend data from all ordered models (including hidden ones)
  const legendData = useMemo(() => {
    // Use allOrderedSeries to maintain consistent order in legend
    const previousWinners = allOrderedSeries.filter(m => PREVIOUS_WINNERS.has(m));
    const anthropic = allOrderedSeries.filter(m => m.startsWith('claude-sonnet-4'));
    const google = allOrderedSeries.filter(m => m.startsWith('gemini'));
    const openai = allOrderedSeries.filter(m => m.startsWith('gpt-') && !PREVIOUS_WINNERS.has(m));

    return { previousWinners, anthropic, google, openai };
  }, [allOrderedSeries]);

  return (
    <div style={{ width: '100%' }}>
      {/* Metric Selector */}
      <div className="mb-4">
        <div className="text-sm font-medium text-gray-700 mb-3">Select Metric:</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(METRICS_CONFIG).map(([key, config]) => {
            const isActive = currentSelectedMetric === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedMetric(key as MetricKey)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 cursor-pointer transform ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105 ring-2 ring-blue-300'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300 hover:scale-102'
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="mb-6 space-y-4">
        {/* Language Group Filters */}
        {props.languageGroups && props.languageGroups.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Language Groups:</div>
            <div className="flex flex-wrap gap-2">
              {props.languageGroups.map((group) => {
                const isHidden = hiddenLanguageGroups.has(group.name);
                return (
                  <button
                    key={group.name}
                    onClick={() => toggleLanguageGroup(group.name)}
                    className={`px-3 py-1 text-sm rounded-md border transition-colors cursor-pointer ${
                      isHidden
                        ? 'bg-gray-100 text-gray-400 border-gray-300 line-through hover:bg-gray-200'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                    style={{
                      borderColor: isHidden ? '#d1d5db' : group.color,
                      backgroundColor: isHidden ? '#f3f4f6' : `${group.color}15`,
                    }}
                  >
                    {group.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Individual Language Filters */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Languages:</div>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => {
              const isHidden = hiddenLanguages.has(lang);
              const group = props.languageGroups?.find(g => g.languages.includes(lang));
              const groupColor = group?.color || '#6b7280';
              return (
                <button
                  key={lang}
                  onClick={() => toggleLanguage(lang)}
                  className={`px-3 py-1 text-sm rounded-md border transition-colors cursor-pointer ${
                    isHidden
                      ? 'bg-gray-100 text-gray-400 border-gray-300 line-through hover:bg-gray-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  style={{
                    borderColor: isHidden ? '#d1d5db' : groupColor,
                    backgroundColor: isHidden ? '#f3f4f6' : `${groupColor}15`,
                  }}
                >
                  {toTitleCase(lang)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {noData ? (
        <div
          style={{
            height,
            display: 'grid',
            placeItems: 'center',
            border: '1px dashed #ddd',
            borderRadius: 8,
            fontSize: 14,
            color: '#666',
          }}
        >
          No {METRICS_CONFIG[currentSelectedMetric].label} data to display.
        </div>
      ) : (
        <div className="flex gap-8">
          {/* Chart */}
          <div style={{ flex: 1, height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 16, right: 24, bottom: 8, left: 8 }}
                barCategoryGap="10%"
              >
                <defs>
                  {/* Diagonal hatching pattern for Claude 3.5 */}
                  <pattern id="claudeHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <rect width="8" height="8" fill="#FFD4A3" />
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#FF8C00" strokeWidth="2" />
                  </pattern>
                  {/* Crosshatch pattern for GPT-4o */}
                  <pattern id="gptCross" width="8" height="8" patternUnits="userSpaceOnUse">
                    <rect width="8" height="8" fill="#C0C0C0" />
                    <path d="M0 0 L8 8 M8 0 L0 8" stroke="#666666" strokeWidth="2" />
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="language"
                  tickFormatter={(value) => toTitleCase(value)}
                />
                <YAxis
                  domain={METRICS_CONFIG[currentSelectedMetric].domain}
                  label={{
                    value: METRICS_CONFIG[currentSelectedMetric].label,
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    
                    // Find the highest value to identify the winner
                    const maxValue = Math.max(...payload.map(p => typeof p.value === 'number' ? p.value : 0));
                    
                    return (
                      <div style={{
                        backgroundColor: '#fff',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{toTitleCase(String(label || ''))}</div>
                        {payload.map((entry, index) => {
                          const value = typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value ?? '—';
                          const isWinner = typeof entry.value === 'number' && entry.value === maxValue;
                          
                          return (
                            <div
                              key={index}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '4px 6px',
                                marginBottom: '2px',
                                backgroundColor: isWinner ? '#dcfce7' : 'transparent',
                                border: isWinner ? '1px solid #16a34a' : '1px solid transparent',
                                borderRadius: '4px'
                              }}
                            >
                              <div
                                style={{
                                  width: '10px',
                                  height: '10px',
                                  backgroundColor: entry.color,
                                  borderRadius: '2px'
                                }}
                              />
                              <span style={{ fontWeight: isWinner ? 'bold' : 'normal' }}>{entry.name}: {value}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                {allOrderedSeries.map((model, index) => {
                  const valueKey = `${model}_${currentSelectedMetric}`;
                  const errKey = `${model}_${currentSelectedMetric}_error`;
                  const name = pretty(model);
                  const fill = colorFor(model);
                  const isPreviousWinner = PREVIOUS_WINNERS.has(model);
                  const isHidden = allHiddenModels.has(model);

                  // Extra guard
                  const hasAny = chartData.some((r) => typeof r?.[valueKey] === 'number');
                  if (!hasAny) return null;

                  return (
                    <Bar
                      key={model}
                      dataKey={valueKey}
                      name={`${isPreviousWinner ? '⭐ ' : ''}${name}`}
                      fill={isHidden ? 'transparent' : fill}
                      radius={[4, 4, 0, 0]}
                      strokeWidth={isPreviousWinner ? 2 : 0}
                      stroke={isPreviousWinner ? '#8B5A00' : 'transparent'}
                      hide={isHidden}
                    >
                      {!isHidden && !METRICS_CONFIG[currentSelectedMetric].isPercentage && (
                        <ErrorBar
                          dataKey={errKey}
                          width={4}
                          stroke="#1f2937"
                          strokeWidth={2}
                        />
                      )}
                    </Bar>
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Side Legend */}
          <div className="w-64 flex-shrink-0 space-y-6">
            {legendData.previousWinners.length > 0 && (
              <div>
                <div className="font-semibold text-xs text-gray-500 mb-2">PREVIOUS WINNERS</div>
                <div className="space-y-1">
                  {legendData.previousWinners.map((model) => {
                    const isHidden = allHiddenModels.has(model);
                    return (
                      <div
                        key={model}
                        className={`flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors ${isHidden ? 'opacity-50' : ''}`}
                        onClick={() => toggleModel(model)}
                      >
                        <svg className={`w-4 h-4 rounded-sm border ${model === 'claude-3-5-sonnet-20241022' ? 'border-orange-600' : 'border-gray-600'}`}>
                          <defs>
                            {model === 'claude-3-5-sonnet-20241022' ? (
                              <pattern id={`legend-${model}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                <rect width="8" height="8" fill="#FFD4A3" />
                                <line x1="0" y1="0" x2="0" y2="8" stroke="#FF8C00" strokeWidth="2" />
                              </pattern>
                            ) : (
                              <pattern id={`legend-${model}`} width="8" height="8" patternUnits="userSpaceOnUse">
                                <rect width="8" height="8" fill="#C0C0C0" />
                                <path d="M0 0 L8 8 M8 0 L0 8" stroke="#666666" strokeWidth="2" />
                              </pattern>
                            )}
                          </defs>
                          <rect width="100%" height="100%" fill={`url(#legend-${model})`} />
                        </svg>
                        <span className={`text-sm select-none ${isHidden ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          ⭐ {pretty(model)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {legendData.anthropic.length > 0 && (
              <div>
                <div className="font-semibold text-xs text-gray-500 mb-2">ANTHROPIC</div>
                <div className="space-y-1">
                  {legendData.anthropic.map((model) => {
                    const isHidden = allHiddenModels.has(model);
                    return (
                      <div
                        key={model}
                        className={`flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors ${isHidden ? 'opacity-50' : ''}`}
                        onClick={() => toggleModel(model)}
                      >
                        <div
                          className="w-4 h-4 rounded-sm"
                          style={{ backgroundColor: colorFor(model) }}
                        />
                        <span className={`text-sm select-none ${isHidden ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {pretty(model)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {legendData.google.length > 0 && (
              <div>
                <div className="font-semibold text-xs text-gray-500 mb-2">GOOGLE</div>
                <div className="space-y-1">
                  {legendData.google.map((model) => {
                    const isHidden = allHiddenModels.has(model);
                    return (
                      <div
                        key={model}
                        className={`flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors ${isHidden ? 'opacity-50' : ''}`}
                        onClick={() => toggleModel(model)}
                      >
                        <div
                          className="w-4 h-4 rounded-sm"
                          style={{ backgroundColor: colorFor(model) }}
                        />
                        <span className={`text-sm select-none ${isHidden ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {pretty(model)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {legendData.openai.length > 0 && (
              <div>
                <div className="font-semibold text-xs text-gray-500 mb-2">OPENAI</div>
                <div className="space-y-1">
                  {legendData.openai.map((model) => {
                    const isHidden = allHiddenModels.has(model);
                    return (
                      <div
                        key={model}
                        className={`flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors ${isHidden ? 'opacity-50' : ''}`}
                        onClick={() => toggleModel(model)}
                      >
                        <div
                          className="w-4 h-4 rounded-sm"
                          style={{ backgroundColor: colorFor(model) }}
                        />
                        <span className={`text-sm select-none ${isHidden ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                          {pretty(model)}
                        </span>
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
  );
}