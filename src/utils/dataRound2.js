import Papa from 'papaparse';
import _ from 'lodash';

// Language groups for Round 2
export const LANGUAGE_GROUPS = [
  {
    name: "East African",
    languages: ["amharic", "swahili", "luo"],
    color: "#3B82F6"
  },
  {
    name: "West African",
    languages: ["yoruba", "hausa", "kanuri", "twi", "wolof", "yemba"],
    color: "#EF4444"
  },
  {
    name: "Southern African",
    languages: ["chichewa"],
    color: "#10B981"
  },
  {
    name: "Central African",
    languages: ["luganda", "ewondo"],
    color: "#F59E0B"
  }
];

// Language display names
const LANGUAGE_DISPLAY_NAMES = {
  'amharic': 'Amharic',
  'chichewa': 'Chichewa',
  'ewondo': 'Ewondo',
  'hausa': 'Hausa',
  'kanuri': 'Kanuri',
  'luganda': 'Luganda',
  'luo': 'Luo',
  'swahili': 'Swahili',
  'twi': 'Twi',
  'wolof': 'Wolof',
  'yemba': 'Yemba',
  'yoruba': 'Yoruba'
};

const ROUND2_LANGUAGES = [
  'amharic', 'chichewa', 'ewondo', 'hausa', 'kanuri', 
  'luganda', 'luo', 'swahili', 'twi', 'wolof', 'yemba', 'yoruba'
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

const getModelColor = (modelName, index) => {
  const type = getProvider(modelName);
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
    .replace(/Gpt 5/i, 'GPT-5')
    .replace(/Gemini 2 5/i, 'Gemini 2.5')
    .replace(/\d{8}/g, '') // Remove 8-digit dates
    .replace(/v\d+/i, '') // Remove version numbers
    .trim();
};

const MODEL_ORDER = [
  // Claude
  'claude-3-5-sonnet-20241022',
  'claude-sonnet-4-20250514',
  
  // Gemini
  'gemini-2.5-pro',
  
  // OpenAI
  'gpt-4.1-2025-04-14',
  'gpt-5-2025-08-07',
  'gpt-4o-2024-11-20'
];

export const loadData = async (reviewer = 'primary') => {
  const filename = reviewer === 'primary'
    ? 'primary_reviewer_model_performance.csv'
    : 'secondary_reviewer_model_performance.csv';

  const promises = ROUND2_LANGUAGES.map(async (lang) => {
    try {
      const url = `/round2/${lang}/${filename}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        console.warn(`Failed to fetch ${lang} from ${url}: ${res.status} ${res.statusText}`);
        return { lang, text: null, error: `HTTP ${res.status}` };
      }
      
      const text = await res.text();
      
      // Check if we got HTML instead of CSV (common when file doesn't exist in dev)
      if (text.trim().startsWith('<!') || text.includes('<!doctype html>') || text.includes('<html')) {
        console.warn(`Received HTML instead of CSV for ${lang} at ${url}. Skipping this language.`);
        return { lang, text: null, error: 'HTML response received' };
      }
      
      // Verify it looks like CSV (has commas and newlines)
      if (!text.includes(',') || text.split('\n').length < 2) {
        console.warn(`Response for ${lang} doesn't look like CSV. Skipping.`);
        return { lang, text: null, error: 'Invalid CSV format' };
      }
      
      return { lang, text, error: null };
    } catch (error) {
      console.warn(`Error loading ${lang}:`, error.message);
      return { lang, text: null, error: error.message };
    }
  });
  
  const results = await Promise.all(promises);
  
  // Filter out failed languages and log warnings
  const successful = results.filter(r => r.text !== null);
  const failed = results.filter(r => r.text === null);
  
  if (failed.length > 0) {
    console.warn(`Failed to load ${failed.length} language(s):`, failed.map(f => `${f.lang} (${f.error})`).join(', '));
  }
  
  if (successful.length === 0) {
    throw new Error('Failed to load data for all languages. Please check that the files exist in public/round2/ and restart the dev server.');
  }

  const allData = [];

  successful.forEach(({ lang, text }, i) => {
    // Remove BOM if present
    const csv = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
    
    const result = Papa.parse(csv, { 
      header: true, 
      skipEmptyLines: true,
      transformHeader: (header) => header.trim() // Trim whitespace from headers
    });
    const language = ROUND2_LANGUAGES[i];
    const languageDisplayName = LANGUAGE_DISPLAY_NAMES[language] || language;

    // Check for parsing errors
    if (result.errors && result.errors.length > 0) {
      console.warn(`Parsing errors for ${language}:`, result.errors);
    }

    // Log first row structure for debugging
    if (result.data && result.data.length > 0) {
      console.log(`First row structure for ${language}:`, Object.keys(result.data[0]), result.data[0]);
    }

    result.data.forEach((row, rowIndex) => {
      // Check if row is empty or just whitespace
      if (!row || Object.keys(row).length === 0) {
        return; // Skip empty rows silently
      }

      // Check for model field - try different possible field names
      let modelName = row.model || row.Model || row['model'] || row['Model'];
      
      if (!modelName || (typeof modelName === 'string' && modelName.trim() === '')) {
        // Only log if it's not an empty row
        if (Object.keys(row).some(key => row[key] && String(row[key]).trim() !== '')) {
          console.warn(`Skipping row ${rowIndex} for ${language} - missing model field. Row keys:`, Object.keys(row), 'Row:', row);
        }
        return;
      }

      // Ensure numeric scores - handle both string and number values
      row.readability_mean = parseFloat(row.readability_mean) || 0;
      row.adequacy_mean = parseFloat(row.adequacy_mean) || 0;
      row.grammatically_correct_pct = parseFloat(row.grammatically_correct_pct) || 0;
      row.real_words_pct = parseFloat(row.real_words_pct) || 0;
      row.notable_error_pct = parseFloat(row.notable_error_pct) || 0;
      row.n_samples = parseInt(row.n_samples) || 0;

      row.language = languageDisplayName;
      row.model = String(modelName).trim(); // Use the found model name
      allData.push(row);
    });
  });

  return processData(allData);
};

const processData = (data) => {
  // Group by Language -> Model
  const grouped = _.groupBy(data, 'language');

  const processed = Object.keys(grouped).map(language => {
    const rows = grouped[language];
    const models = _.groupBy(rows, 'model');

    let modelStats = Object.keys(models).map((modelKey) => {
      const modelRows = models[modelKey];
      if (!modelRows || modelRows.length === 0) {
        console.warn(`No rows found for model ${modelKey} in language ${language}`);
        return null;
      }
      
      const firstRow = modelRows[0];
      if (!firstRow) {
        console.warn(`First row is null for model ${modelKey} in language ${language}`);
        return null;
      }

      // Determine index based on predefined order
      let orderIndex = MODEL_ORDER.indexOf(modelKey);
      if (orderIndex === -1) orderIndex = 999;

      // Safely extract values with fallbacks
      const readabilityMean = parseFloat(firstRow.readability_mean) || 0;
      const adequacyMean = parseFloat(firstRow.adequacy_mean) || 0;
      const grammaticallyCorrectPct = parseFloat(firstRow.grammatically_correct_pct) || 0;
      const realWordsPct = parseFloat(firstRow.real_words_pct) || 0;
      const notableErrorPct = parseFloat(firstRow.notable_error_pct) || 0;
      const nSamples = parseInt(firstRow.n_samples) || 0;

      const stats = {
        id: modelKey,
        name: formatModelName(modelKey),
        rawName: modelKey,
        orderIndex,
        color: getModelColor(modelKey, orderIndex === 999 ? 0 : orderIndex),
        metrics: {
          readability: {
            mean: readabilityMean,
            stdDev: calculateStdDev(modelRows, 'readability_mean', readabilityMean),
            count: nSamples
          },
          adequacy: {
            mean: adequacyMean,
            stdDev: calculateStdDev(modelRows, 'adequacy_mean', adequacyMean),
            count: nSamples
          },
          grammatically_correct: {
            mean: grammaticallyCorrectPct,
            stdDev: calculateStdDev(modelRows, 'grammatically_correct_pct', grammaticallyCorrectPct),
            count: nSamples
          },
          real_words: {
            mean: realWordsPct,
            stdDev: calculateStdDev(modelRows, 'real_words_pct', realWordsPct),
            count: nSamples
          },
          notable_error: {
            mean: notableErrorPct,
            stdDev: calculateStdDev(modelRows, 'notable_error_pct', notableErrorPct),
            count: nSamples
          }
        }
      };
      return stats;
    }).filter(Boolean); // Remove any null entries

    // Sort models by defined order
    modelStats = _.sortBy(modelStats, ['orderIndex', 'name']);

    // Find winners
    const winners = {
      readability: _.maxBy(modelStats, m => m.metrics.readability.mean),
      adequacy: _.maxBy(modelStats, m => m.metrics.adequacy.mean),
      grammatically_correct: _.maxBy(modelStats, m => m.metrics.grammatically_correct.mean),
      real_words: _.maxBy(modelStats, m => m.metrics.real_words.mean),
      notable_error: _.minBy(modelStats, m => m.metrics.notable_error.mean) // Lower is better for errors
    };

    return {
      language,
      models: modelStats,
      winners
    };
  });

  return processed;
};

const calculateStdDev = (rows, field, mean) => {
  if (rows.length === 0) return 0;
  // For Round 2, we use CI to estimate stdDev if available
  // Only readability and adequacy have CI fields in the CSV
  const firstRow = rows[0];
  
  // Only readability and adequacy have CI fields in the CSV
  let ciHighField, ciLowField;
  if (field === 'readability_mean') {
    ciHighField = 'readability_ci_high';
    ciLowField = 'readability_ci_low';
  } else if (field === 'adequacy_mean') {
    ciHighField = 'adequacy_ci_high';
    ciLowField = 'adequacy_ci_low';
  }
  
  // Try to use CI if available (only for readability and adequacy)
  if (ciHighField && ciLowField && firstRow[ciHighField] != null && firstRow[ciLowField] != null) {
    const ciHigh = parseFloat(firstRow[ciHighField]);
    const ciLow = parseFloat(firstRow[ciLowField]);
    if (!isNaN(ciHigh) && !isNaN(ciLow) && ciHigh > ciLow) {
      // Approximate stdDev from CI (assuming 95% CI, stdDev ≈ (CI_high - CI_low) / 3.92)
      return Math.max(0, (ciHigh - ciLow) / 3.92);
    }
  }
  
  // For percentage metrics without CI, use a default stdDev based on the mean
  // For percentage metrics (0-100), use a reasonable default
  if (field.includes('_pct')) {
    // Use 5% of the mean as a default stdDev for percentages, with a minimum
    return Math.max(1.0, mean * 0.05);
  }
  
  // For scale metrics (1-7), use a smaller default
  return 0.2;
};

