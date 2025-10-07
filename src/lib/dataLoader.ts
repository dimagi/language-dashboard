import Papa from 'papaparse';

export interface ModelPerformance {
  model: string;
  n_samples: number;
  readability_mean: number;
  readability_median: number;
  readability_ci_low: number;
  readability_ci_high: number;
  adequacy_mean: number;
  adequacy_median: number;
  adequacy_ci_low: number;
  adequacy_ci_high: number;
}

export interface LanguageData {
  language: string;
  models: ModelPerformance[];
}

export interface LanguageGroup {
  name: string;
  languages: string[];
  color: string;
}

export const LANGUAGE_GROUPS: LanguageGroup[] = [
  {
    name: "East African",
    languages: ["amharic", "swahili", "tigrinya", "luo"],
    color: "#3B82F6"
  },
  {
    name: "West African",
    languages: ["yoruba", "igbo", "hausa", "kanuri", "twi", "wolof", "yemba"],
    color: "#EF4444"
  },
  {
    name: "Southern African",
    languages: ["zulu", "xhosa", "afrikaans", "chichewa"],
    color: "#10B981"
  },
  {
    name: "Central African",
    languages: ["lingala", "luganda", "ewondo"],
    color: "#F59E0B"
  }
];

// Human-readable model names
export const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gpt-4o-2024-11-20': 'GPT 4o',
  'gpt-4.1-2025-04-14': 'GPT 4.1',
  'gpt-5-2025-08-07': 'GPT 5'
};

// Model ordering by company
export const MODEL_ORDER: Record<string, number> = {
  'Claude 3.5 Sonnet': 1,
  'Claude Sonnet 4': 2,
  'Gemini 2.5 Pro': 3,
  'GPT 4.1': 4,
  'GPT 5': 5
};

export function getDisplayModelName(modelName: string): string {
  return MODEL_DISPLAY_NAMES[modelName] || modelName;
}

async function looksLikeCsv(response: Response): Promise<boolean> {
  if (!response.ok) return false;

  // If the server redirected (e.g., to /index.html), treat as not CSV
  if (response.redirected) return false;

  const ct = (response.headers.get('content-type') || '').toLowerCase();

  // Accept common CSV-ish types (servers sometimes use text/plain or vnd.ms-excel)
  const csvish =
    ct.includes('text/csv') ||
    ct.includes('application/csv') ||
    ct.includes('application/vnd.ms-excel') ||
    ct.startsWith('text/plain');

  if (!csvish) return false;

  // Sniff first few characters to ensure it's not HTML
  const text = await response.text();
  const head = text.slice(0, 512).trim().toLowerCase();

  // Reject obvious HTML fallbacks
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return false;

  // Super-lightweight CSV heuristic: at least one line with a comma/tab/semicolon
  // and not a single-token line.
  const firstLine = head.split(/\r?\n/)[0] ?? '';
  const hasDelimiter = /[,;\t]/.test(firstLine);
  if (!hasDelimiter) return false;

  return true;
}
export async function getAvailableLanguages(): Promise<string[]> {
  const knownLanguages = [
    'amharic','chichewa','ewondo','hausa','kanuri','luganda','luo','swahili','twi','wolof','tigrinya','yoruba','igbo','zulu','xhosa','afrikaans','lingala','yemba'
  ];
  const availableLanguages: string[] = [];

  for (const lang of knownLanguages) {
    const filesToCheck = ['primary_reviewer_model_performance.csv'];

    for (const filename of filesToCheck) {
      try {
        // Try HEAD first (cheap) then GET fallback if HEAD unsupported
        const url = `/analysis/${lang}/${filename}`;
        let response = await fetch(url, {
          method: 'HEAD',
          headers: { 'Accept': 'text/csv,*/*;q=0.1' },
          cache: 'no-store',
          redirect: 'follow',
        });

        if (!response.ok || response.redirected) {
          // some servers don't support HEAD; try GET with full checks
          response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'text/csv,*/*;q=0.1' },
            cache: 'no-store',
            redirect: 'follow',
          });
          if (!(await looksLikeCsv(response))) {
            continue; // not a real CSV
          }
        } else {
          // HEAD was ok; sanity-check content-type
          const ct = (response.headers.get('content-type') || '').toLowerCase();
          const csvish =
            ct.includes('text/csv') ||
            ct.includes('application/csv') ||
            ct.includes('application/vnd.ms-excel') ||
            ct.startsWith('text/plain');

          if (!csvish) {
            // Do a GET to double-check; HEAD might lie or be missing
            const getResp = await fetch(url, {
              headers: { 'Accept': 'text/csv,*/*;q=0.1' },
              cache: 'no-store',
              redirect: 'follow',
            });
            if (!(await looksLikeCsv(getResp))) continue;
          }
        }

        availableLanguages.push(lang);
        break;
      } catch {
        // try next file / language
      }
    }
  }

  return availableLanguages;
}

export async function loadLanguageData(language: string): Promise<LanguageData> {
  const possibleFiles = [
    'primary_reviewer_model_performance.csv'
  ];

  for (const filename of possibleFiles) {
    try {
      const url = `/analysis/${language}/${filename}`;
      const response = await fetch(url);

      if (response.ok) {
        const csvText = await response.text();

        return new Promise((resolve, reject) => {
          Papa.parse<ModelPerformance>(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
              // Filter out critical errors (ignore field mismatch errors from empty rows)
              const criticalErrors = results.errors.filter(error =>
                error.code !== 'TooFewFields' && error.code !== 'TooManyFields'
              );

              if (criticalErrors.length > 0) {
                reject(new Error(`CSV parsing error: ${criticalErrors[0].message}`));
                return;
              }

              // Filter out rows that don't have a model name or have null/empty model
              const models = results.data.filter(row =>
                row && row.model && typeof row.model === 'string' && row.model.trim() !== ''
              ) as ModelPerformance[];

              resolve({
                language,
                models
              });
            },
            error: (error: Error) => {
              reject(new Error(`CSV parsing failed: ${error.message}`));
            }
          });
        });
      }
    } catch (error) {
      // Continue to next file
    }
  }

  // If we get here, no files were found
  throw new Error(`No data files found for language: ${language}`);
}

export async function loadAllLanguageData(): Promise<LanguageData[]> {
  try {
    const availableLanguages = await getAvailableLanguages();
    const languageDataPromises = availableLanguages.map(lang => loadLanguageData(lang));
    const results = await Promise.allSettled(languageDataPromises);

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<LanguageData> =>
        result.status === 'fulfilled')
      .map(result => result.value);

    return successfulResults;
  } catch (error) {
    console.error('Error loading language data:', error);
    throw error;
  }
}

// Previous winners - excluded from main leaderboard
const PREVIOUS_WINNERS = new Set([
  'claude-3-5-sonnet-20241022',
  'gpt-4o-2024-11-20'
]);

export function calculateModelLeaderboard(languageData: LanguageData[]): Array<{
  model: string;
  avgReadability: number;
  avgAdequacy: number;
  languageCount: number;
  totalScore: number;
}> {
  const modelStats = new Map<string, {
    readabilityScores: number[];
    adequacyScores: number[];
    languages: Set<string>;
  }>();

  // Collect scores for each model across all languages (exclude previous winners)
  languageData.forEach(langData => {
    langData.models.forEach(model => {
      // Skip previous winners in leaderboard calculation
      if (PREVIOUS_WINNERS.has(model.model)) return;
      
      if (!modelStats.has(model.model)) {
        modelStats.set(model.model, {
          readabilityScores: [],
          adequacyScores: [],
          languages: new Set()
        });
      }
      
      const stats = modelStats.get(model.model)!;
      stats.readabilityScores.push(model.readability_mean);
      stats.adequacyScores.push(model.adequacy_mean);
      stats.languages.add(langData.language);
    });
  });

  // Calculate averages and scores weighted by number of languages assessed
  const leaderboard = Array.from(modelStats.entries()).map(([model, stats]) => {
    const avgReadability = stats.readabilityScores.reduce((a, b) => a + b, 0) / stats.readabilityScores.length;
    const avgAdequacy = stats.adequacyScores.reduce((a, b) => a + b, 0) / stats.adequacyScores.length;
    const languageCount = stats.languages.size;
    
    // Sum of average readability scores across all languages (weighted by language count)
    const sumReadability = stats.readabilityScores.reduce((a, b) => a + b, 0);
    const sumAdequacy = stats.adequacyScores.reduce((a, b) => a + b, 0);
    
    // Total score is the sum of readability scores across languages (naturally weights by language count)
    const totalScore = sumReadability + sumAdequacy * 0.5; // Give adequacy half weight compared to readability
    
    return {
      model: getDisplayModelName(model),
      avgReadability,
      avgAdequacy,
      languageCount,
      totalScore
    };
  });

  // Sort by total score (descending)
  return leaderboard.sort((a, b) => b.totalScore - a.totalScore);
}

export function getLanguageGroupForLanguage(language: string): LanguageGroup | undefined {
  return LANGUAGE_GROUPS.find(group => 
    group.languages.includes(language.toLowerCase())
  );
}