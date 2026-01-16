import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Info, ArrowRight, Sun, Moon, X, Globe, BarChart, ExternalLink } from 'lucide-react';
import { loadData } from '../utils/data';
import { loadData as loadDataRound2, LANGUAGE_GROUPS } from '../utils/dataRound2';
import _ from 'lodash';

// TODO: Replace with actual article/post URL when available
const PROJECT_MOTIVATION_ARTICLE_URL = null; // Set to the full article URL when ready

const ANALYSIS_CARDS = [
    {
        id: 'q4-2025',
        title: 'Q4 2025 Analysis - Round 3',
        description: 'Fresh evaluation of SOTA models on Nigerian languages including Fulani, Hausa, Igbo, and Yoruba.',
        icon: 'R3',
        path: '/q4-2025',
        color: '#0ea5e9' // Blue
    },
    {
        id: 'round-2',
        title: 'Round 2 Analysis',
        description: 'Historical data from our second evaluation cycle across 12 African languages organized by regional groups.',
        icon: 'R2',
        path: '/round2',
        color: '#10b981', // Green
        disabled: false
    },
    {
        id: 'round-1',
        title: 'Round 1 (Initial)',
        description: 'The baseline study that started the low-resource language evaluation project.',
        icon: 'R1',
        path: '#', // Placeholder
        color: '#f59e0b', // Amber
        disabled: true
    }
];

function LandingPage({ theme, toggleTheme }) {
    const [showQ4Modal, setShowQ4Modal] = useState(false);
    const [showRound2Modal, setShowRound2Modal] = useState(false);
    const [showLanguageList, setShowLanguageList] = useState(false);
    const [showLanguageGroupList, setShowLanguageGroupList] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [previewDataRound2, setPreviewDataRound2] = useState(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const [loadingPreviewRound2, setLoadingPreviewRound2] = useState(false);
    const navigate = useNavigate();

    // Load preview data when modal opens
    useEffect(() => {
        if (showQ4Modal && !previewData && !loadingPreview) {
            setLoadingPreview(true);
            loadData('primary').then(data => {
                // 1. Calculate overall averages (across all languages and metrics)
                const modelAverages = {};

                data.forEach(lang => {
                    lang.models.forEach(model => {
                        if (!modelAverages[model.id]) {
                            modelAverages[model.id] = {
                                name: model.name,
                                totalScore: 0,
                                count: 0
                            };
                        }
                        // Average across all three metrics for this language
                        const avgScore = (
                            model.metrics.clarity.mean +
                            model.metrics.naturalness.mean +
                            model.metrics.correctness.mean
                        ) / 3;
                        modelAverages[model.id].totalScore += avgScore;
                        modelAverages[model.id].count++;
                    });
                });

                // Find overall leader (highest average)
                const overallLeader = Object.values(modelAverages).reduce((best, current) => {
                    const currentAvg = current.totalScore / current.count;
                    const bestAvg = best ? (best.totalScore / best.count) : 0;
                    return currentAvg > bestAvg ? current : best;
                }, null);

                // 2. Calculate language wins per model
                const modelWins = {};

                data.forEach(lang => {
                    let bestModelForLang = null;
                    let bestScoreForLang = -Infinity;

                    lang.models.forEach(model => {
                        const avgScore = (
                            model.metrics.clarity.mean +
                            model.metrics.naturalness.mean +
                            model.metrics.correctness.mean
                        ) / 3;

                        if (avgScore > bestScoreForLang) {
                            bestScoreForLang = avgScore;
                            bestModelForLang = model.id;
                        }
                    });

                    if (bestModelForLang) {
                        if (!modelWins[bestModelForLang]) {
                            const winningModel = lang.models.find(m => m.id === bestModelForLang);
                            modelWins[bestModelForLang] = {
                                name: winningModel.name,
                                wins: 0,
                                totalScore: 0
                            };
                        }
                        modelWins[bestModelForLang].wins++;
                        modelWins[bestModelForLang].totalScore += bestScoreForLang;
                    }
                });

                // Get top 2 models by language wins
                const topByWins = Object.values(modelWins)
                    .sort((a, b) => b.wins - a.wins)
                    .slice(0, 2)
                    .map(model => ({
                        name: model.name,
                        wins: model.wins
                    }));

                setPreviewData({
                    languages: data.map(l => l.language),
                    overallLeader: overallLeader ? {
                        name: overallLeader.name,
                        avgScore: (overallLeader.totalScore / overallLeader.count).toFixed(2)
                    } : null,
                    topByWins: topByWins
                });
                setLoadingPreview(false);
            }).catch(err => {
                console.error('Failed to load preview data:', err);
                setLoadingPreview(false);
            });
        }
    }, [showQ4Modal, previewData, loadingPreview]);

    const handleFullAnalysis = () => {
        navigate('/q4-2025');
    };

    const handleLanguageClick = (language) => {
        // Use the language name as-is to match the Dashboard's lang-{language} format
        navigate(`/q4-2025?lang=${encodeURIComponent(language)}`);
    };

    const handleLanguageGroupClick = (groupName) => {
        navigate(`/round2?group=${encodeURIComponent(groupName)}`);
    };

    const handleLanguageClickRound2 = (language) => {
        navigate(`/round2?lang=${encodeURIComponent(language)}`);
    };

    // Load Round 2 preview data when modal opens
    useEffect(() => {
        if (showRound2Modal && !previewDataRound2 && !loadingPreviewRound2) {
            setLoadingPreviewRound2(true);
            loadDataRound2('primary').then(data => {
                // Calculate overall averages using only Readability and Adequacy (simple average)
                const modelAverages = {};

                data.forEach(lang => {
                    lang.models.forEach(model => {
                        if (!modelAverages[model.id]) {
                            modelAverages[model.id] = {
                                name: model.name,
                                totalReadability: 0,
                                totalAdequacy: 0,
                                totalScore: 0,
                                count: 0
                            };
                        }
                        // Track readability and adequacy separately
                        modelAverages[model.id].totalReadability += model.metrics.readability.mean;
                        modelAverages[model.id].totalAdequacy += model.metrics.adequacy.mean;
                        // Use simple average for calculation
                        const avgScore = (model.metrics.readability.mean + model.metrics.adequacy.mean) / 2;
                        modelAverages[model.id].totalScore += avgScore;
                        modelAverages[model.id].count++;
                    });
                });

                // Find overall leader using simple average
                const overallLeader = Object.values(modelAverages).reduce((best, current) => {
                    const currentAvg = current.totalScore / current.count;
                    const bestAvg = best ? (best.totalScore / best.count) : 0;
                    return currentAvg > bestAvg ? current : best;
                }, null);

                // Calculate display value as simple average of readability and adequacy means
                if (overallLeader) {
                    const avgReadability = overallLeader.totalReadability / overallLeader.count;
                    const avgAdequacy = overallLeader.totalAdequacy / overallLeader.count;
                    overallLeader.displayScore = ((avgReadability + avgAdequacy) / 2).toFixed(2);
                }

                // Calculate leaders for other metrics
                const metricLeaders = {
                    grammatically_correct: { name: null, score: -Infinity },
                    real_words: { name: null, score: -Infinity },
                    notable_error: { name: null, score: Infinity } // Lower is better
                };

                const metricAverages = {
                    grammatically_correct: {},
                    real_words: {},
                    notable_error: {}
                };

                data.forEach(lang => {
                    lang.models.forEach(model => {
                        // Grammatical Correct %
                        if (!metricAverages.grammatically_correct[model.id]) {
                            metricAverages.grammatically_correct[model.id] = { name: model.name, total: 0, count: 0 };
                        }
                        metricAverages.grammatically_correct[model.id].total += model.metrics.grammatically_correct.mean;
                        metricAverages.grammatically_correct[model.id].count++;

                        // Real Words %
                        if (!metricAverages.real_words[model.id]) {
                            metricAverages.real_words[model.id] = { name: model.name, total: 0, count: 0 };
                        }
                        metricAverages.real_words[model.id].total += model.metrics.real_words.mean;
                        metricAverages.real_words[model.id].count++;

                        // Notable Error % (lower is better)
                        if (!metricAverages.notable_error[model.id]) {
                            metricAverages.notable_error[model.id] = { name: model.name, total: 0, count: 0 };
                        }
                        metricAverages.notable_error[model.id].total += model.metrics.notable_error.mean;
                        metricAverages.notable_error[model.id].count++;
                    });
                });

                // Find leaders for each metric
                Object.keys(metricAverages).forEach(metricKey => {
                    const averages = Object.values(metricAverages[metricKey]).map(stat => ({
                        name: stat.name,
                        avg: stat.total / stat.count
                    }));

                    if (metricKey === 'notable_error') {
                        // Lower is better
                        const leader = _.minBy(averages, 'avg');
                        if (leader) {
                            metricLeaders[metricKey] = { name: leader.name, score: leader.avg };
                        }
                    } else {
                        // Higher is better
                        const leader = _.maxBy(averages, 'avg');
                        if (leader) {
                            metricLeaders[metricKey] = { name: leader.name, score: leader.avg };
                        }
                    }
                });

                // Calculate language wins per model (using simple average of Readability and Adequacy)
                const modelWins = {};

                data.forEach(lang => {
                    let bestModelForLang = null;
                    let bestScoreForLang = -Infinity;

                    lang.models.forEach(model => {
                        // Use simple average of Readability and Adequacy
                        const score = (model.metrics.readability.mean + model.metrics.adequacy.mean) / 2;

                        if (score > bestScoreForLang) {
                            bestScoreForLang = score;
                            bestModelForLang = model.id;
                        }
                    });

                    if (bestModelForLang) {
                        if (!modelWins[bestModelForLang]) {
                            const winningModel = lang.models.find(m => m.id === bestModelForLang);
                            modelWins[bestModelForLang] = {
                                name: winningModel.name,
                                wins: 0,
                                totalScore: 0
                            };
                        }
                        modelWins[bestModelForLang].wins++;
                        modelWins[bestModelForLang].totalScore += bestScoreForLang;
                    }
                });

                // Get top 3 models by language wins
                const topByWins = Object.values(modelWins)
                    .sort((a, b) => b.wins - a.wins)
                    .slice(0, 3)
                    .map(model => ({
                        name: model.name,
                        wins: model.wins
                    }));

                // Get languages by group
                const languagesByGroup = {};
                LANGUAGE_GROUPS.forEach(group => {
                    const normalizedGroupLangs = new Set(group.languages.map(l => l.toLowerCase()));
                    languagesByGroup[group.name] = data
                        .filter(lang => {
                            const normalizedLang = lang.language.toLowerCase().replace(/\s+/g, '_');
                            return normalizedGroupLangs.has(normalizedLang);
                        })
                        .map(l => l.language);
                });

                setPreviewDataRound2({
                    languages: data.map(l => l.language),
                    languagesByGroup,
                    overallLeader: overallLeader ? {
                        name: overallLeader.name,
                        avgScore: overallLeader.displayScore || '0.00'
                    } : null,
                    topByWins: topByWins,
                    metricLeaders: {
                        grammatically_correct: metricLeaders.grammatically_correct.name ? {
                            name: metricLeaders.grammatically_correct.name,
                            score: metricLeaders.grammatically_correct.score.toFixed(2)
                        } : null,
                        real_words: metricLeaders.real_words.name ? {
                            name: metricLeaders.real_words.name,
                            score: metricLeaders.real_words.score.toFixed(2)
                        } : null,
                        notable_error: metricLeaders.notable_error.name ? {
                            name: metricLeaders.notable_error.name,
                            score: metricLeaders.notable_error.score.toFixed(2)
                        } : null
                    }
                });
                setLoadingPreviewRound2(false);
            }).catch(err => {
                console.error('Failed to load Round 2 preview data:', err);
                setLoadingPreviewRound2(false);
            });
        }
    }, [showRound2Modal, previewDataRound2, loadingPreviewRound2]);

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="container flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="header-icon">
                            <BarChart3 color="white" size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>LRL Evaluation Portal</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Low-Resource Language Model Benchmarking</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="btn"
                        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </header>

            <main className="container" style={{ padding: '1.5rem 1rem' }}>

                {/* Motivation Section */}
                <section className="motivation-section mb-12">
                    <div className="flex items-start gap-4 p-6 rounded-xl border border-blue-500/20 bg-blue-500/5">
                        <div className="p-3 rounded-full bg-blue-500/10 text-blue-500">
                            <Info size={24} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <h2 className="text-xl font-bold mb-2">Benchmarking Natural Language Generation for Low-Resource Languages</h2>
                            <p className="text-secondary leading-relaxed mb-4">
                                Frontier models work great in high-resource languages like English. While we've seen some progress in low-resource languages,{' '}
                                <a
                                    href="https://www.pnas.org/doi/10.1073/pnas.2514626122"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--primary-color, #3b82f6)',
                                        textDecoration: 'underline',
                                        textDecorationStyle: 'dotted',
                                        textUnderlineOffset: '2px',
                                        transition: 'opacity 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                    they continue to struggle for the majority of languages
                                </a>. Current AI benchmarks offer a distorted view of multilingual performance.
                                Most rely on translated multiple-choice exams (like MMLU), which even if we ignore <a
                                    href="https://arxiv.org/abs/2412.03304"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        color: 'var(--primary-color, #3b82f6)',
                                        textDecoration: 'underline',
                                        textDecorationStyle: 'dotted',
                                        textUnderlineOffset: '2px',
                                        transition: 'opacity 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                >
                                    issues with cultural bias
                                </a>, at best will test
                                Natural Language Understanding (NLU) rather than active fluency.
                            </p>
                            <p className="text-secondary leading-relaxed">
                                To measure true utility, we focus on Natural Language Generation (NLG). We prompt frontier models to write original text across a
                                diverse set of topics in low-resource languages, blind the outputs to remove bias, and have expert native speakers evaluate
                                them across a range of metrics like readability and clarity. By tracking the performance of models both within and between AI labs,
                                we can evaluate how performance is changing over time.
                            </p>
                        </div>
                    </div>
                </section>

                <div className="mb-8">
                    <h2 className="text-sm font-bold text-muted uppercase tracking-wider mb-4">Available Analyses</h2>
                    <div className="landing-grid">
                        {ANALYSIS_CARDS.map(card => {
                            if (card.id === 'q4-2025') {
                                // Special handling for Q4 2025 card - show modal
                                return (
                                    <div
                                        key={card.id}
                                        onClick={() => setShowQ4Modal(true)}
                                        className="landing-card"
                                        style={{ cursor: 'pointer', textDecoration: 'none' }}
                                    >
                                        <div className="landing-card-content">
                                            <div
                                                className="landing-card-icon"
                                                style={{ backgroundColor: `${card.color}20`, color: card.color, borderColor: `${card.color}40` }}
                                            >
                                                {card.icon}
                                            </div>
                                            <h3 className="landing-card-title">{card.title}</h3>
                                            <p className="landing-card-description">{card.description}</p>
                                        </div>

                                        <div className="landing-card-footer active">
                                            View Results <ArrowRight size={16} />
                                        </div>
                                    </div>
                                );
                            }

                            if (card.id === 'round-2') {
                                // Special handling for Round 2 card - show modal
                                return (
                                    <div
                                        key={card.id}
                                        onClick={() => setShowRound2Modal(true)}
                                        className="landing-card"
                                        style={{ cursor: 'pointer', textDecoration: 'none' }}
                                    >
                                        <div className="landing-card-content">
                                            <div
                                                className="landing-card-icon"
                                                style={{ backgroundColor: `${card.color}20`, color: card.color, borderColor: `${card.color}40` }}
                                            >
                                                {card.icon}
                                            </div>
                                            <h3 className="landing-card-title">{card.title}</h3>
                                            <p className="landing-card-description">{card.description}</p>
                                        </div>

                                        <div className="landing-card-footer active">
                                            View Results <ArrowRight size={16} />
                                        </div>
                                    </div>
                                );
                            }

                            // Other cards use Link as before
                            return (
                            <Link
                                key={card.id}
                                to={card.disabled ? '#' : card.path}
                                className={`landing-card ${card.disabled ? 'disabled' : ''}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <div className="landing-card-content">
                                    <div
                                        className="landing-card-icon"
                                        style={{ backgroundColor: `${card.color}20`, color: card.color, borderColor: `${card.color}40` }}
                                    >
                                        {card.icon}
                                    </div>
                                    <h3 className="landing-card-title">{card.title}</h3>
                                    <p className="landing-card-description">{card.description}</p>
                                </div>

                                <div className={`landing-card-footer ${card.disabled ? '' : 'active'}`}>
                                    {card.disabled ? 'Coming Soon' : (
                                        <>
                                            View Results <ArrowRight size={16} />
                                        </>
                                    )}
                                </div>
                            </Link>
                            );
                        })}
                    </div>
                </div>
            </main>

            {/* Q4 2025 Analysis Modal */}
            {showQ4Modal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: '1rem'
                    }}
                    onClick={() => {
                        setShowQ4Modal(false);
                        setShowLanguageList(false);
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '1rem',
                            padding: '2rem',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: 'var(--shadow-lg)',
                            position: 'relative'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                setShowQ4Modal(false);
                                setShowLanguageList(false);
                            }}
                            className="btn btn-icon"
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                padding: '0.5rem'
                            }}
                            title="Close"
                        >
                            <X size={20} />
                        </button>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            marginBottom: '1.5rem',
                            color: 'var(--text-primary)',
                            paddingRight: '2rem'
                        }}>
                            Q4 2025 Analysis - Round 3
                        </h2>

                        {/* Preview Section */}
                        {loadingPreview ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                Loading preview...
                            </div>
                        ) : previewData && (
                            <>
                                {/* Languages Included Card */}
                                <div style={{
                                    backgroundColor: theme === 'light' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
                                    border: `1px solid ${theme === 'light' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(96, 165, 250, 0.4)'}`,
                                    borderRadius: '0.5rem',
                                    padding: '1rem',
                                    marginBottom: '1rem'
                                }}>
                                    <p style={{
                                        fontSize: '1.125rem',
                                        fontWeight: 'bold',
                                        color: theme === 'light' ? '#3b82f6' : '#60a5fa',
                                        marginBottom: '0.75rem'
                                    }}>
                                        {previewData.languages.length} Languages
                                    </p>
                                    <div style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '0.5rem'
                                    }}>
                                        {previewData.languages.map((lang) => (
                                            <span
                                                key={lang}
                                                style={{
                                                    fontSize: '0.75rem',
                                                    padding: '0.375rem 0.625rem',
                                                    backgroundColor: theme === 'light' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.2)',
                                                    border: `1px solid ${theme === 'light' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(96, 165, 250, 0.4)'}`,
                                                    borderRadius: '0.375rem',
                                                    color: theme === 'light' ? '#1e40af' : '#93c5fd',
                                                    fontWeight: 500
                                                }}
                                            >
                                                {lang}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Model Performance Summary */}
                                <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                                    <h3 style={{
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                        marginBottom: '1rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Model Performance Summary
                                    </h3>

                                    {/* Overall Leader Card */}
                                    {previewData.overallLeader && (
                                        <div style={{
                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            borderRadius: '0.5rem',
                                            padding: '1rem',
                                            marginBottom: '1rem'
                                        }}>
                                            <p style={{
                                                fontSize: '0.875rem',
                                                color: 'var(--text-primary)',
                                                marginBottom: '0.5rem',
                                                fontWeight: 600
                                            }}>
                                                🏆 Overall Leader
                                            </p>
                                            <p style={{
                                                fontSize: '1.125rem',
                                                fontWeight: 'bold',
                                                color: '#10b981',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {previewData.overallLeader.name}
                                            </p>
                                            <p style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                Highest average score across all languages: {previewData.overallLeader.avgScore}
                                            </p>
                                        </div>
                                    )}

                                    {/* Top Models by Language Wins */}
                                    {previewData.topByWins && previewData.topByWins.length > 0 && (
                                        <div style={{
                                            backgroundColor: 'var(--bg-panel)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '0.5rem',
                                            padding: '1rem'
                                        }}>
                                            <p style={{
                                                fontSize: '0.875rem',
                                                color: 'var(--text-primary)',
                                                marginBottom: '0.75rem',
                                                fontWeight: 600
                                            }}>
                                                📊 Top Models by Language Wins
                                            </p>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.5rem'
                                            }}>
                                                {previewData.topByWins.map((model, index) => (
                                                    <div
                                                        key={model.name}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.625rem 0.75rem',
                                                            backgroundColor: index === 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)',
                                                            border: `1px solid ${index === 0 ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                                                            borderRadius: '0.375rem'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <span style={{
                                                                fontSize: '0.875rem',
                                                                fontWeight: 600,
                                                                color: index === 0 ? '#10b981' : 'var(--text-primary)',
                                                                minWidth: '1.5rem'
                                                            }}>
                                                                {index + 1}.
                                                            </span>
                                                            <span style={{
                                                                fontSize: '0.875rem',
                                                                fontWeight: index === 0 ? 600 : 500,
                                                                color: index === 0 ? '#10b981' : 'var(--text-primary)'
                                                            }}>
                                                                {model.name}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                color: 'var(--text-secondary)'
                                                            }}>
                                                                {model.wins} win{model.wins !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Navigation Options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                onClick={handleFullAnalysis}
                                className="btn btn-active"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <BarChart size={20} />
                                View Full Analysis
                            </button>

                            <button
                                onClick={() => setShowLanguageList(!showLanguageList)}
                                className="btn"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <Globe size={20} />
                                Browse by Language
                                <ArrowRight size={16} style={{
                                    transform: showLanguageList ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }} />
                            </button>

                            {/* Language List */}
                            {showLanguageList && previewData && (
                                <div style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem',
                                    padding: '1rem',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    backgroundColor: 'var(--bg-panel)'
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                        gap: '0.5rem'
                                    }}>
                                        {previewData.languages.map(language => (
                                            <button
                                                key={language}
                                                onClick={() => handleLanguageClick(language)}
                                                className="btn"
                                                style={{
                                                    padding: '0.75rem',
                                                    fontSize: '0.875rem',
                                                    textAlign: 'center',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '0.375rem'
                                                }}
                                            >
                                                {language}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Round 2 Analysis Modal */}
            {showRound2Modal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000,
                        padding: '1rem'
                    }}
                    onClick={() => {
                        setShowRound2Modal(false);
                        setShowLanguageList(false);
                        setShowLanguageGroupList(false);
                    }}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '1rem',
                            padding: '2rem',
                            maxWidth: '600px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: 'var(--shadow-lg)',
                            position: 'relative'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => {
                                setShowRound2Modal(false);
                                setShowLanguageList(false);
                                setShowLanguageGroupList(false);
                            }}
                            className="btn btn-icon"
                            style={{
                                position: 'absolute',
                                top: '1rem',
                                right: '1rem',
                                padding: '0.5rem'
                            }}
                            title="Close"
                        >
                            <X size={20} />
                        </button>

                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            marginBottom: '1.5rem',
                            color: 'var(--text-primary)',
                            paddingRight: '2rem'
                        }}>
                            Round 2 Analysis
                        </h2>

                        {/* Preview Section */}
                        {loadingPreviewRound2 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                Loading preview...
                            </div>
                        ) : previewDataRound2 && (
                            <>
                                {/* Languages Included Card */}
                                <div style={{
                                    backgroundColor: theme === 'light' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
                                    border: `1px solid ${theme === 'light' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(96, 165, 250, 0.4)'}`,
                                    borderRadius: '0.5rem',
                                    padding: '1rem',
                                    marginBottom: '1rem'
                                }}>
                                    <p style={{
                                        fontSize: '1.125rem',
                                        fontWeight: 'bold',
                                        color: theme === 'light' ? '#3b82f6' : '#60a5fa',
                                        marginBottom: '0.75rem'
                                    }}>
                                        {previewDataRound2.languages.length} Languages
                                    </p>

                                    {/* Language Groups */}
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        {LANGUAGE_GROUPS.map(group => {
                                            const groupLangs = previewDataRound2.languagesByGroup[group.name] || [];
                                            if (groupLangs.length === 0) return null;
                                            return (
                                                <div key={group.name} style={{ marginBottom: '0.5rem' }}>
                                                    <p style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        color: group.color,
                                                        marginBottom: '0.25rem'
                                                    }}>
                                                        {group.name} ({groupLangs.length})
                                                    </p>
                                                    <div style={{
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        gap: '0.5rem'
                                                    }}>
                                                        {groupLangs.map((lang) => (
                                                            <span
                                                                key={lang}
                                                                style={{
                                                                    fontSize: '0.75rem',
                                                                    padding: '0.375rem 0.625rem',
                                                                    backgroundColor: theme === 'light' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.2)',
                                                                    border: `1px solid ${theme === 'light' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(96, 165, 250, 0.4)'}`,
                                                                    borderRadius: '0.375rem',
                                                                    color: theme === 'light' ? '#1e40af' : '#93c5fd',
                                                                    fontWeight: 500
                                                                }}
                                                            >
                                                                {lang}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Model Performance Summary */}
                                <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                                    <h3 style={{
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                        marginBottom: '1rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Model Performance Summary
                                    </h3>

                                    {/* Overall Leader Card */}
                                    {previewDataRound2.overallLeader && (
                                        <div style={{
                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            borderRadius: '0.5rem',
                                            padding: '1rem',
                                            marginBottom: '1rem'
                                        }}>
                                            <p style={{
                                                fontSize: '0.875rem',
                                                color: 'var(--text-primary)',
                                                marginBottom: '0.5rem',
                                                fontWeight: 600
                                            }}>
                                                🏆 Overall Leader
                                            </p>
                                            <p style={{
                                                fontSize: '1.125rem',
                                                fontWeight: 'bold',
                                                color: '#10b981',
                                                marginBottom: '0.25rem'
                                            }}>
                                                {previewDataRound2.overallLeader.name}
                                            </p>
                                            <p style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--text-secondary)'
                                            }}>
                                                Highest average score across all languages (Readability and Adequacy): {previewDataRound2.overallLeader.avgScore}
                                            </p>
                                        </div>
                                    )}

                                    {/* Metric Leaders */}
                                    {previewDataRound2.metricLeaders && (
                                        <div style={{
                                            backgroundColor: 'var(--bg-panel)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '0.5rem',
                                            padding: '1rem',
                                            marginBottom: '1rem'
                                        }}>
                                            <p style={{
                                                fontSize: '0.875rem',
                                                color: 'var(--text-primary)',
                                                marginBottom: '0.75rem',
                                                fontWeight: 600
                                            }}>
                                                📈 Leaders by Metric
                                            </p>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.5rem'
                                            }}>
                                                {previewDataRound2.metricLeaders.grammatically_correct && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '0.5rem 0.75rem',
                                                        backgroundColor: 'var(--bg-card)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '0.375rem'
                                                    }}>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-secondary)'
                                                        }}>
                                                            Grammatical Correct (%):
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            color: 'var(--text-primary)'
                                                        }}>
                                                            {previewDataRound2.metricLeaders.grammatically_correct.name} ({previewDataRound2.metricLeaders.grammatically_correct.score}%)
                                                        </span>
                                                    </div>
                                                )}
                                                {previewDataRound2.metricLeaders.real_words && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '0.5rem 0.75rem',
                                                        backgroundColor: 'var(--bg-card)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '0.375rem'
                                                    }}>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-secondary)'
                                                        }}>
                                                            Real Words (%):
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            color: 'var(--text-primary)'
                                                        }}>
                                                            {previewDataRound2.metricLeaders.real_words.name} ({previewDataRound2.metricLeaders.real_words.score}%)
                                                        </span>
                                                    </div>
                                                )}
                                                {previewDataRound2.metricLeaders.notable_error && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '0.5rem 0.75rem',
                                                        backgroundColor: 'var(--bg-card)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '0.375rem'
                                                    }}>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-secondary)'
                                                        }}>
                                                            Notable Error (%):
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            color: 'var(--text-primary)'
                                                        }}>
                                                            {previewDataRound2.metricLeaders.notable_error.name} ({previewDataRound2.metricLeaders.notable_error.score}%)
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Top Models by Language Wins */}
                                    {previewDataRound2.topByWins && previewDataRound2.topByWins.length > 0 && (
                                        <div style={{
                                            backgroundColor: 'var(--bg-panel)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '0.5rem',
                                            padding: '1rem'
                                        }}>
                                            <p style={{
                                                fontSize: '0.875rem',
                                                color: 'var(--text-primary)',
                                                marginBottom: '0.75rem',
                                                fontWeight: 600
                                            }}>
                                                📊 Top Models by Language Wins
                                            </p>
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.5rem'
                                            }}>
                                                {previewDataRound2.topByWins.map((model, index) => (
                                                    <div
                                                        key={model.name}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.625rem 0.75rem',
                                                            backgroundColor: index === 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-card)',
                                                            border: `1px solid ${index === 0 ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'}`,
                                                            borderRadius: '0.375rem'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <span style={{
                                                                fontSize: '0.875rem',
                                                                fontWeight: 600,
                                                                color: index === 0 ? '#10b981' : 'var(--text-primary)',
                                                                minWidth: '1.5rem'
                                                            }}>
                                                                {index + 1}.
                                                            </span>
                                                            <span style={{
                                                                fontSize: '0.875rem',
                                                                fontWeight: index === 0 ? 600 : 500,
                                                                color: index === 0 ? '#10b981' : 'var(--text-primary)'
                                                            }}>
                                                                {model.name}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <span style={{
                                                                fontSize: '0.75rem',
                                                                color: 'var(--text-secondary)'
                                                            }}>
                                                                {model.wins} win{model.wins !== 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Navigation Options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <button
                                onClick={() => navigate('/round2')}
                                className="btn btn-active"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <BarChart size={20} />
                                View Full Analysis
                            </button>

                            <button
                                onClick={() => setShowLanguageGroupList(!showLanguageGroupList)}
                                className="btn"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <Globe size={20} />
                                Browse by Language Group
                                <ArrowRight size={16} style={{
                                    transform: showLanguageGroupList ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }} />
                            </button>

                            {/* Language Group List */}
                            {showLanguageGroupList && previewDataRound2 && (
                                <div style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem',
                                    padding: '1rem',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    backgroundColor: 'var(--bg-panel)'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem'
                                    }}>
                                        {LANGUAGE_GROUPS.map(group => {
                                            const groupLangs = previewDataRound2.languagesByGroup[group.name] || [];
                                            if (groupLangs.length === 0) return null;
                                            return (
                                                <button
                                                    key={group.name}
                                                    onClick={() => handleLanguageGroupClick(group.name)}
                                                    className="btn"
                                                    style={{
                                                        padding: '0.75rem',
                                                        fontSize: '0.875rem',
                                                        textAlign: 'left',
                                                        border: `1px solid ${group.color}40`,
                                                        borderRadius: '0.375rem',
                                                        backgroundColor: theme === 'light' ? `${group.color}10` : `${group.color}20`,
                                                        color: group.color,
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {group.name} ({groupLangs.length} languages)
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => setShowLanguageList(!showLanguageList)}
                                className="btn"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <Globe size={20} />
                                Browse by Language
                                <ArrowRight size={16} style={{
                                    transform: showLanguageList ? 'rotate(90deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }} />
                            </button>

                            {/* Language List */}
                            {showLanguageList && previewDataRound2 && (
                                <div style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.5rem',
                                    padding: '1rem',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    backgroundColor: 'var(--bg-panel)'
                                }}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                        gap: '0.5rem'
                                    }}>
                                        {previewDataRound2.languages.map(language => (
                                            <button
                                                key={language}
                                                onClick={() => handleLanguageClickRound2(language)}
                                                className="btn"
                                                style={{
                                                    padding: '0.75rem',
                                                    fontSize: '0.875rem',
                                                    textAlign: 'center',
                                                    border: '1px solid var(--border-color)',
                                                    borderRadius: '0.375rem'
                                                }}
                                            >
                                                {language}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LandingPage;
