import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadData, getProvider } from '../utils/data';
import LanguageChart from '../components/LanguageChart';
import Controls from '../components/Controls';
import { Trophy, BarChart3, Loader2, ArrowLeft, Sun, Moon, Users, Cpu, Database, ChevronDown, Globe } from 'lucide-react';
import { ToastContainer } from '../components/Toast';
import { Link, useNavigate } from 'react-router-dom';
import { updateURLParams, getURLParams } from '../utils/urlParams';
import _ from 'lodash';

function Dashboard({ theme, toggleTheme }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dataSource, setDataSource] = useState('primary');
    const [metric, setMetric] = useState('clarity');
    const [visibleModels, setVisibleModels] = useState(new Set());
    const [allModels, setAllModels] = useState([]);
    const [toasts, setToasts] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [showLanguageSelector, setShowLanguageSelector] = useState(false);
    const languageSelectorRef = useRef(null);

    // Close language selector when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (languageSelectorRef.current && !languageSelectorRef.current.contains(event.target)) {
                setShowLanguageSelector(false);
            }
        };

        if (showLanguageSelector) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showLanguageSelector]);

    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const processedData = await loadData(dataSource);
                setData(processedData);

                // Extract all unique models
                const modelsMap = new Map();
                processedData.forEach(lang => {
                    lang.models.forEach(m => {
                        if (!modelsMap.has(m.id)) {
                            modelsMap.set(m.id, {
                                id: m.id,
                                name: m.name,
                                color: m.color,
                                orderIndex: m.orderIndex
                            });
                        }
                    });
                });
                const uniqueModels = Array.from(modelsMap.values()).sort((a, b) => {
                    if (a.orderIndex !== b.orderIndex) {
                        return a.orderIndex - b.orderIndex;
                    }
                    return a.name.localeCompare(b.name);
                });
                setAllModels(uniqueModels);

                const validModels = new Set(uniqueModels.map(m => m.id));
                setVisibleModels(prev => {
                    if (prev.size === 0) return validModels;

                    let hasOverlap = false;
                    for (let id of prev) {
                        if (validModels.has(id)) {
                            hasOverlap = true;
                            break;
                        }
                    }
                    if (!hasOverlap) return validModels;

                    return prev;
                });

            } catch (error) {
                console.error("Failed to load data:", error);
                showToast(`Failed to load data: ${error.message}`, 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [dataSource]);

    // Function to read URL params and update state
    const syncStateFromURL = useRef(() => {
        if (allModels.length === 0) return;

        const params = getURLParams();
        
        // Read metric from URL
        if (params.metric && ['clarity', 'naturalness', 'correctness'].includes(params.metric)) {
            setMetric(params.metric);
        }
        
        // Read dataSource from URL
        if (params.source && ['primary', 'secondary'].includes(params.source)) {
            setDataSource(params.source);
        }
        
        // Read models from URL (can be providers or individual models)
        if (params.providers) {
            const providers = new Set(params.providers.split(','));
            const newVisible = new Set();
            allModels.forEach(m => {
                if (providers.has(getProvider(m.id))) {
                    newVisible.add(m.id);
                }
            });
            setVisibleModels(newVisible);
        } else if (params.models) {
            const modelIds = new Set(params.models.split(','));
            const newVisible = new Set();
            allModels.forEach(m => {
                if (modelIds.has(m.id)) {
                    newVisible.add(m.id);
                }
            });
            if (newVisible.size > 0) {
                setVisibleModels(newVisible);
            }
        } else if (visibleModels.size === 0) {
            setVisibleModels(new Set(allModels.map(m => m.id)));
        }
        
        // Read language from URL
        if (params.lang) {
            setSelectedLanguage(decodeURIComponent(params.lang));
            setTimeout(() => {
                const element = document.getElementById(`lang-${decodeURIComponent(params.lang)}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                    element.classList.add('highlight-card');
                    setTimeout(() => element.classList.remove('highlight-card'), 2000);
                }
            }, 500);
        } else {
            setSelectedLanguage(null);
        }
    });

    // Sync URL params with state on mount and when URL changes
    useEffect(() => {
        syncStateFromURL.current();
    }, [allModels]);

    // Handle browser back/forward navigation
    useEffect(() => {
        const handlePopState = () => {
            syncStateFromURL.current();
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [allModels]);

    // Update URL when metric changes
    useEffect(() => {
        if (metric && metric !== 'clarity') {
            updateURLParams({ metric });
        } else if (metric === 'clarity') {
            const params = getURLParams();
            if (params.metric === 'clarity') {
                updateURLParams({ metric: null });
            }
        }
    }, [metric]);

    // Update URL when dataSource changes
    useEffect(() => {
        if (dataSource && dataSource !== 'primary') {
            updateURLParams({ source: dataSource });
        } else if (dataSource === 'primary') {
            const params = getURLParams();
            if (params.source === 'primary') {
                updateURLParams({ source: null });
            }
        }
    }, [dataSource]);

    // Update URL when visible models change
    useEffect(() => {
        if (allModels.length === 0) return;
        
        const params = getURLParams();
        const activeProviders = new Set();
        const activeModels = [];
        
        allModels.forEach(m => {
            if (visibleModels.has(m.id)) {
                activeProviders.add(getProvider(m.id));
                activeModels.push(m.id);
            }
        });
        
        // Determine if we should use providers or individual models
        const allModelsForProviders = new Set();
        activeProviders.forEach(provider => {
            allModels.filter(m => getProvider(m.id) === provider).forEach(m => {
                allModelsForProviders.add(m.id);
            });
        });
        
        // If all models of active providers are visible, use providers param
        // Otherwise, use individual models param
        const useProviders = activeProviders.size > 0 && 
            allModelsForProviders.size === activeModels.length &&
            Array.from(allModelsForProviders).every(id => visibleModels.has(id));
        
        if (useProviders && activeProviders.size < 2) {
            // Only set providers if not all providers are selected
            updateURLParams({ 
                providers: Array.from(activeProviders).join(','),
                models: null 
            });
        } else if (activeModels.length < allModels.length) {
            // Use individual models if subset is selected
            updateURLParams({ 
                models: activeModels.join(','),
                providers: null 
            });
        } else {
            // Clear both if all models are visible
            updateURLParams({ 
                providers: null,
                models: null 
            });
        }
    }, [visibleModels, allModels]);

    // Update URL when language changes
    useEffect(() => {
        if (selectedLanguage) {
            updateURLParams({ lang: selectedLanguage });
        } else {
            const params = getURLParams();
            if (params.lang) {
                updateURLParams({ lang: null });
            }
        }
    }, [selectedLanguage]);

    const toggleProvider = (provider) => {
        setVisibleModels(prev => {
            const next = new Set(prev);
            const providerModels = allModels.filter(m => getProvider(m.id) === provider);
            const allVisible = providerModels.every(m => next.has(m.id));

            if (allVisible) {
                providerModels.forEach(m => next.delete(m.id));
            } else {
                providerModels.forEach(m => next.add(m.id));
            }
            return next;
        });
    };

    const getShareLink = (language) => {
        const params = new URLSearchParams();
        if (language) params.set('lang', language);

        const activeProviders = new Set();
        allModels.forEach(m => {
            if (visibleModels.has(m.id)) {
                activeProviders.add(getProvider(m.id));
            }
        });

        if (activeProviders.size > 0) {
            params.set('providers', Array.from(activeProviders).join(','));
        }

        return `${window.location.origin}/q4-2025?${params.toString()}`;
    };

    const toggleModel = (modelId) => {
        setVisibleModels(prev => {
            const next = new Set(prev);
            if (next.has(modelId)) {
                next.delete(modelId);
            } else {
                next.add(modelId);
            }
            return next;
        });
    };

    // Filter data by selected language
    const filteredData = useMemo(() => {
        if (!selectedLanguage) return data;
        return data.filter(lang => lang.language === selectedLanguage);
    }, [data, selectedLanguage]);

    const overallWinner = useMemo(() => {
        if (!filteredData.length) return null;

        const allStats = [];
        filteredData.forEach(lang => {
            lang.models.forEach(m => {
                if (visibleModels.has(m.id)) {
                    allStats.push({
                        name: m.name,
                        score: m.metrics[metric].mean,
                        color: m.color
                    });
                }
            });
        });

        const byModel = _.groupBy(allStats, 'name');
        const averages = Object.keys(byModel).map(name => {
            const scores = byModel[name].map(s => s.score);
            return {
                name,
                avgScore: _.mean(scores),
                color: byModel[name][0].color
            };
        });

        return _.maxBy(averages, 'avgScore');
    }, [filteredData, metric, visibleModels]);

    // Calculate summary statistics
    const languagesCount = useMemo(() => {
        return filteredData.length;
    }, [filteredData]);

    const modelsCount = useMemo(() => {
        const modelSet = new Set();
        filteredData.forEach(lang => {
            lang.models.forEach(m => {
                if (visibleModels.has(m.id)) {
                    modelSet.add(m.id);
                }
            });
        });
        return modelSet.size;
    }, [filteredData, visibleModels]);

    const totalSamples = useMemo(() => {
        let total = 0;
        filteredData.forEach(lang => {
            lang.models.forEach(m => {
                if (visibleModels.has(m.id)) {
                    total += m.metrics[metric].count;
                }
            });
        });
        return total;
    }, [filteredData, visibleModels, metric]);

    if (loading && data.length === 0) {
        return (
            <div className="loading-screen">
                <Loader2 className="spin" style={{ marginRight: '0.5rem' }} /> Loading Data...
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="container flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="btn btn-icon" title="Back to Landing Page">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="header-icon">
                            <BarChart3 color="white" size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Q4 2025 Analysis - Round 3</h1>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Comparative analysis of LLM performance across Nigerian languages</p>
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

            <Controls
                metric={metric}
                setMetric={setMetric}
                dataSource={dataSource}
                setDataSource={setDataSource}
                allModels={allModels}
                visibleModels={visibleModels}
                toggleModel={toggleModel}
                toggleProvider={toggleProvider}
                getProvider={getProvider}
                data={data}
                showToast={showToast}
                selectedLanguage={selectedLanguage}
                setSelectedLanguage={setSelectedLanguage}
            />

            <main className="container" style={{ padding: '2rem 1rem' }}>

                {overallWinner && (
                    <div className="leaderboard-card">
                        <div className="leaderboard-glow"></div>

                        <div style={{ position: 'relative', zIndex: 10 }}>
                            <h2 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                Overall Leader ({metric})
                            </h2>
                            <div className="flex items-center gap-4">
                                <span style={{ fontSize: '2.25rem', fontWeight: 800 }}>{overallWinner.name}</span>
                                <span style={{
                                    padding: '0.25rem 0.75rem',
                                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                    color: '#34d399',
                                    fontSize: '0.875rem',
                                    fontWeight: 'bold',
                                    borderRadius: '9999px',
                                    border: '1px solid rgba(16, 185, 129, 0.3)'
                                }}>
                                    {overallWinner.avgScore.toFixed(2)} Avg
                                </span>
                            </div>
                        </div>

                        <div style={{
                            backgroundColor: 'var(--bg-card)',
                            padding: '1rem',
                            borderRadius: '50%',
                            border: '1px solid var(--border-color)',
                            boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)'
                        }}>
                            <Trophy color="#facc15" size={32} />
                        </div>
                    </div>
                )}

                {/* Summary Stats Cards */}
                <div className="grid grid-cols-1" style={{ gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                    }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Users size={20} style={{ color: '#3b82f6' }} />
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: theme === 'light' ? '#1e40af' : '#93c5fd'
                            }}>
                                Languages Analyzed
                            </h3>
                        </div>
                        <p style={{
                            fontSize: '2.5rem',
                            fontWeight: 800,
                            color: theme === 'light' ? '#1e40af' : '#60a5fa',
                            margin: 0,
                            lineHeight: 1
                        }}>
                            {languagesCount}
                        </p>
                        <p style={{
                            fontSize: '0.75rem',
                            color: theme === 'light' ? '#3b82f6' : '#93c5fd',
                            marginTop: '0.5rem',
                            margin: 0
                        }}>
                            Nigerian languages evaluated
                        </p>
                    </div>

                    <div style={{
                        backgroundColor: 'rgba(147, 51, 234, 0.1)',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid rgba(147, 51, 234, 0.2)'
                    }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Cpu size={20} style={{ color: '#9333ea' }} />
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: theme === 'light' ? '#6b21a8' : '#c4b5fd'
                            }}>
                                Models Compared
                            </h3>
                        </div>
                        <p style={{
                            fontSize: '2.5rem',
                            fontWeight: 800,
                            color: theme === 'light' ? '#6b21a8' : '#a78bfa',
                            margin: 0,
                            lineHeight: 1
                        }}>
                            {modelsCount}
                        </p>
                        <p style={{
                            fontSize: '0.75rem',
                            color: theme === 'light' ? '#9333ea' : '#c4b5fd',
                            marginTop: '0.5rem',
                            margin: 0
                        }}>
                            AI language models
                        </p>
                    </div>

                    <div style={{
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        boxShadow: 'var(--shadow-sm)',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Database size={20} style={{ color: '#6366f1' }} />
                            <h3 style={{
                                fontSize: '1rem',
                                fontWeight: 600,
                                color: theme === 'light' ? '#4338ca' : '#a5b4fc'
                            }}>
                                Total Samples
                            </h3>
                        </div>
                        <p style={{
                            fontSize: '2.5rem',
                            fontWeight: 800,
                            color: theme === 'light' ? '#4338ca' : '#818cf8',
                            margin: 0,
                            lineHeight: 1
                        }}>
                            {totalSamples.toLocaleString()}
                        </p>
                        <p style={{
                            fontSize: '0.75rem',
                            color: theme === 'light' ? '#6366f1' : '#a5b4fc',
                            marginTop: '0.5rem',
                            margin: 0
                        }}>
                            Evaluation samples
                        </p>
                    </div>
                </div>

                {selectedLanguage && (
                    <div style={{
                        marginBottom: '1rem',
                        padding: '0.75rem 1rem',
                        backgroundColor: 'var(--bg-panel)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            flex: 1,
                            minWidth: '200px'
                        }}>
                            <Globe size={18} style={{ color: 'var(--text-secondary)' }} />
                            <span style={{
                                fontSize: '0.875rem',
                                color: 'var(--text-secondary)'
                            }}>
                                Showing results for:
                            </span>
                            <div style={{ position: 'relative' }} ref={languageSelectorRef}>
                                <button
                                    onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                                    className="btn"
                                    style={{
                                        fontSize: '0.875rem',
                                        padding: '0.5rem 1rem',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        backgroundColor: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <strong>{selectedLanguage}</strong>
                                    <ChevronDown size={16} style={{
                                        transform: showLanguageSelector ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s'
                                    }} />
                                </button>
                                
                                {showLanguageSelector && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        marginTop: '0.5rem',
                                        backgroundColor: 'var(--bg-card)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '0.5rem',
                                        boxShadow: 'var(--shadow-lg)',
                                        padding: '0.5rem',
                                        zIndex: 1000,
                                        minWidth: '200px',
                                        maxHeight: '300px',
                                        overflowY: 'auto'
                                    }}>
                    {data.map(langData => (
                                            <button
                                                key={langData.language}
                                                onClick={() => {
                                                    setSelectedLanguage(langData.language);
                                                    setShowLanguageSelector(false);
                                                    window.history.replaceState({}, '', `/q4-2025?lang=${encodeURIComponent(langData.language)}`);
                                                    // Scroll to the language chart
                                                    setTimeout(() => {
                                                        const element = document.getElementById(`lang-${langData.language}`);
                                                        if (element) {
                                                            element.scrollIntoView({ behavior: 'smooth' });
                                                        }
                                                    }, 100);
                                                }}
                                                className="btn"
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    fontSize: '0.875rem',
                                                    textAlign: 'left',
                                                    backgroundColor: langData.language === selectedLanguage ? 'var(--bg-card-hover)' : 'transparent',
                                                    color: langData.language === selectedLanguage ? 'var(--color-accent)' : 'var(--text-primary)',
                                                    border: 'none',
                                                    borderRadius: '0.375rem',
                                                    fontWeight: langData.language === selectedLanguage ? 600 : 400,
                                                    marginBottom: '0.25rem'
                                                }}
                                            >
                                                {langData.language}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedLanguage(null);
                                setShowLanguageSelector(false);
                                updateURLParams({ lang: null });
                            }}
                            className="btn"
                            style={{
                                fontSize: '0.875rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            Show All Languages
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-6" style={{
                    gridTemplateColumns: selectedLanguage ? '1fr' : undefined
                }}>
                    {filteredData.map(langData => (
                        <LanguageChart
                            key={langData.language}
                            language={langData.language}
                            data={langData}
                            metric={metric}
                            visibleModels={visibleModels}
                            theme={theme}
                            id={`lang-${langData.language}`}
                            currentFilters={{ metric, dataSource }}
                        />
                    ))}
                </div>

            </main>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </div>
    );
}

export default Dashboard;
