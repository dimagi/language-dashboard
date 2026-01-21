import Papa from 'papaparse';
import _ from 'lodash';

const PRIMARY_FILES = [
  'primary_bura_pabir.csv',
  'primary_fulani.csv',
  'primary_hausa.csv',
  'primary_igbo.csv',
  'primary_marghi.csv',
  'primary_nigerian_pidgin.csv',
  'primary_shuwa_arabic.csv',
  'primary_yoruba.csv',
];

const SECONDARY_FILES = [
  'secondary_bura_pabir.csv',
  'secondary_fulani.csv',
  'secondary_hausa.csv',
  'secondary_igbo.csv',
  'secondary_marghi.csv',
  'secondary_nigerian_pidgin.csv',
  'secondary_shuwa_arabic.csv',
  'secondary_yoruba.csv',
];

// Color palettes
const COLORS = {
  claude: ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#ffedd5'], // Orange
  google: ['#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'], // Blue
  openai: ['#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'], // Gray
  other: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'], // Violet (fallback)
};

export const MODEL_PATTERNS = {
  claude: /claude/i,
  google: /gemini|google/i,
  openai: /gpt|openai/i,
};

export const getProvider = (modelName) => {
  if (MODEL_PATTERNS.claude.test(modelName)) return 'claude';
  if (MODEL_PATTERNS.google.test(modelName)) return 'google';
  if (MODEL_PATTERNS.openai.test(modelName)) return 'openai';
  return 'other';
};

const getModelColor = (modelName, index, groupIndex) => {
  const type = getProvider(modelName);

  // Use index to pick a shade, cycle if needed
  const palette = COLORS[type];
  return palette[index % palette.length];
};

const formatModelName = (modelName) => {
  return modelName
    .replace(/bedrock-/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/Claude 3 5/i, 'Claude 3.5')
    .replace(/Gpt 4/i, 'GPT-4')
    .replace(/Gpt 4o/i, 'GPT-4o')
    .replace(/\d{8}/g, '') // Remove 8-digit dates like 20241022
    .replace(/v\d+/i, '') // Remove version numbers like v1, v2 if standalone
    .trim();
};

export const loadData = async (source = 'primary') => {
  const files = source === 'primary' ? PRIMARY_FILES : SECONDARY_FILES;

  const promises = files.map(file => fetch(`/data/${file}`).then(res => res.text()));
  const csvs = await Promise.all(promises);

  const allData = [];

  csvs.forEach((csv, i) => {
    const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
    // Add language from filename if not in row, or verify
    // Filename format: primary_language.csv
    const filename = files[i];
    const langFromFilename = filename.replace(`${source}_`, '').replace('.csv', '').replace(/_/g, ' ');
    const capitalizedLang = langFromFilename.charAt(0).toUpperCase() + langFromFilename.slice(1);

    result.data.forEach(row => {
      // Ensure numeric scores
      row.clarity_score = parseFloat(row.clarity_score);
      row.naturalness_score = parseFloat(row.naturalness_score);
      row.correctness_score = parseFloat(row.correctness_score);

      // Fallback for language name if missing in CSV
      if (!row.target_language_name) {
        row.target_language_name = capitalizedLang;
      }

      allData.push(row);
    });
  });

  return processData(allData);
};

const MODEL_ORDER = [
  // Claude (oldest to newest based on dates)
  'bedrock-claude-3-5-sonnet',        // Oct 2024
  'claude-sonnet-4-20250514',         // May 2025
  'claude-sonnet-4-5-20250929',       // Sep 2025
  'claude-haiku-4-5-20251001',        // Oct 2025
  'claude-opus-4-5-20251101',         // Nov 2025

  // Gemini (oldest to newest)
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-3-pro-preview',

  // OpenAI (oldest to newest)
  'gpt-4.1',      // Apr 2025
  'gpt-5-nano',   // Smaller/older variant
  'gpt-5-mini',   // Medium variant
  'gpt-5',        // Base model
  'gpt-5.1'       // Latest variant
];

const processData = (data) => {
  // Group by Language -> Model
  const grouped = _.groupBy(data, 'target_language_name');

  const processed = Object.keys(grouped).map(language => {
    const rows = grouped[language];
    const models = _.groupBy(rows, 'model');

    let modelStats = Object.keys(models)
      .filter((modelKey) => {
        // Filter out Google models for Round 3
        return !MODEL_PATTERNS.google.test(modelKey);
      })
      .map((modelKey) => {
      const modelRows = models[modelKey];

      // Determine index based on predefined order or fallback to alphabetical
      let orderIndex = MODEL_ORDER.indexOf(modelKey);
      if (orderIndex === -1) orderIndex = 999; // Put unknown models at the end

      const stats = {
        id: modelKey,
        name: formatModelName(modelKey),
        rawName: modelKey,
        orderIndex,
        // Pass orderIndex to getModelColor to maintain consistent coloring
        color: getModelColor(modelKey, orderIndex === 999 ? 0 : orderIndex),
        metrics: {
          clarity: calculateStats(modelRows, 'clarity_score'),
          naturalness: calculateStats(modelRows, 'naturalness_score'),
          correctness: calculateStats(modelRows, 'correctness_score'),
        }
      };
      return stats;
    });

    // Sort models: first by provider (Anthropic, Google, OpenAI), then by orderIndex (oldest to newest) within each provider
    const providerOrder = { 'claude': 1, 'google': 2, 'openai': 3, 'other': 4 };
    modelStats = modelStats.sort((a, b) => {
      const providerA = getProvider(a.id);
      const providerB = getProvider(b.id);
      const providerDiff = (providerOrder[providerA] || 99) - (providerOrder[providerB] || 99);
      if (providerDiff !== 0) return providerDiff;
      // Within same provider, sort by orderIndex (oldest to newest)
      return a.orderIndex - b.orderIndex;
    });

    // Find winners
    const winners = {
      clarity: _.maxBy(modelStats, m => m.metrics.clarity.mean),
      naturalness: _.maxBy(modelStats, m => m.metrics.naturalness.mean),
      correctness: _.maxBy(modelStats, m => m.metrics.correctness.mean),
    };

    return {
      language,
      models: modelStats,
      winners
    };
  });

  return processed;
};

const calculateStats = (rows, field) => {
  const values = rows.map(r => r[field]).filter(v => !isNaN(v));
  if (values.length === 0) return { mean: 0, stdDev: 0, count: 0 };

  const mean = _.mean(values);
  const variance = _.meanBy(values, (v) => Math.pow(v - mean, 2));
  let stdDev = Math.sqrt(variance);

  // Clamp stdDev so that error bars don't exceed 1-7 range
  // Since ErrorBar in Recharts (simple version) is symmetric, we must limit it to the tighter bound.
  const maxUp = 7 - mean;
  const maxDown = mean - 1;
  const maxAllowed = Math.min(maxUp, maxDown);

  // If stdDev is larger than allowed, clamp it. 
  // Note: This visually truncates the error bar to fit the chart, which is what the user requested.
  if (stdDev > maxAllowed) {
    stdDev = Math.max(0, maxAllowed);
  }

  return {
    mean,
    stdDev,
    count: values.length
  };
};
