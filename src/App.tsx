import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/Card';
import PerformanceChart from './components/PerformanceChart';
import ModelLeaderboard from './components/ModelLeaderboard';
import {
  loadAllLanguageData,
  calculateModelLeaderboard,
  LanguageData,
  LANGUAGE_GROUPS,
  MODEL_DISPLAY_NAMES,
  ReviewerType
} from './lib/dataLoader';
import { Globe, TrendingUp, Users, Database } from 'lucide-react';

function App() {
  const [languageData, setLanguageData] = useState<LanguageData[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState<ReviewerType>('primary');

  useEffect(() => {
    const loadData = async () => {
      try {
        if (initialLoading) {
          setInitialLoading(true);
        } else {
          setSwitching(true);
        }
        const data = await loadAllLanguageData(reviewer);
        setLanguageData(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        console.error('Error loading data:', err);
      } finally {
        setInitialLoading(false);
        setSwitching(false);
      }
    };

    loadData();
  }, [reviewer]);

  const leaderboard = React.useMemo(() => {
    if (languageData.length === 0) return [];
    return calculateModelLeaderboard(languageData);
  }, [languageData]);

  const totalSamples = React.useMemo(() => {
    return languageData.reduce((total, lang) => 
      total + lang.models.reduce((langTotal, model) => langTotal + model.n_samples, 0), 0
    );
  }, [languageData]);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading language model analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <div className="text-destructive text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground">Error Loading Data</h2>
          <p className="text-muted-foreground max-w-md">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  LRL Model Analysis Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  Comprehensive evaluation of language models on low-resource languages
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1 relative">
                <button
                  onClick={() => setReviewer('primary')}
                  disabled={switching}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    reviewer === 'primary'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  } disabled:opacity-50`}
                >
                  Primary Reviewer
                </button>
                <button
                  onClick={() => setReviewer('secondary')}
                  disabled={switching}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    reviewer === 'secondary'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  } disabled:opacity-50`}
                >
                  Secondary Reviewer
                </button>
                {switching && (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted/50 rounded-lg">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Database className="h-4 w-4" />
                  <span>{totalSamples.toLocaleString()} samples</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{languageData.length} languages</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Languages Analyzed</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{languageData.length}</div>
              <p className="text-xs text-muted-foreground">
                Across {LANGUAGE_GROUPS.length} language groups
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Models Compared</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{leaderboard.length}</div>
              <p className="text-xs text-muted-foreground">
                Leading AI language models
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Samples</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalSamples.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                High-quality evaluation data
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Full Width Chart */}
        <div className="w-full">
          <PerformanceChart
            languageData={languageData}
            languageGroups={LANGUAGE_GROUPS}
            modelDisplayNameBySlug={MODEL_DISPLAY_NAMES}
            colorByModel={{
              // Anthropic - Orange shades (Claude 4 pure orange, Claude 3.5 whitewashed)
              'claude-sonnet-4-20250514': '#FF8C00',      // Pure orange (Dark Orange)
              'claude-3-5-sonnet-20241022': '#FFD4A3',    // Whitewashed orange (Peach Puff)

              // Google - Blue
              'gemini-2.5-pro': '#4285F4',                // Google Blue

              // OpenAI - Greyscale shades (latest darkest but not too dark)
              'gpt-5-2025-08-07': '#4A4A4A',              // Dark grey (latest model) - lightened
              'gpt-4.1-2025-04-14': '#6B6B6B',            // Medium grey
              'gpt-4o-2024-11-20': '#888888',             // Light grey (older model)
            }}
          />
        </div>

        {/* Leaderboard - Full width below chart */}
        <div className="w-full max-w-4xl mx-auto">
          <ModelLeaderboard leaderboard={leaderboard} />
        </div>

        {/* Footer */}
        <footer className="text-center py-8 border-t">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              Analysis of language model performance on low-resource languages
            </p>
            <p>
              Evaluating readability and adequacy across diverse linguistic contexts
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;