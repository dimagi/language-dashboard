import React, { useState, useEffect, useRef } from 'react';
import { Check, Download, X, ChevronDown, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updateURLParams } from '../utils/urlParams';

// Metric definitions for Round 3
const METRIC_DEFINITIONS = {
    clarity: 'Measures how easy it is to read and understand the generated text. Higher scores indicate clearer and more comprehensible sentences.',
    naturalness: 'Evaluates whether the sentence sounds natural and authentic, as if spoken by a native speaker in everyday conversation. Higher scores indicate more natural-sounding text.',
    correctness: 'Assesses the technical accuracy of the text, including spelling, grammar, verb tenses, and other linguistic rules. Higher scores indicate fewer errors and better adherence to language standards.'
};

const Controls = ({
    metric,
    setMetric,
    dataSource,
    setDataSource,
    allModels,
    visibleModels,
    toggleModel,
    toggleProvider,
    getProvider,
    data,
    showToast,
    selectedLanguage = null,
    setSelectedLanguage = () => {}
}) => {
    const navigate = useNavigate();
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [openProviderMenu, setOpenProviderMenu] = useState(null); // 'claude', 'google', 'openai', or null
    const [isMobile, setIsMobile] = useState(false);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const providerMenuRefs = useRef({});
    const languageMenuRef = useRef(null);
    
    const handleRoundChange = (round) => {
        if (round === 'round1') {
            // Show coming soon message
            if (showToast) {
                showToast('Round 1 is coming soon!', 'success');
            } else {
                alert('Round 1 is coming soon!');
            }
            return;
        }
        if (round === 'round2') {
            navigate('/round2');
        }
        // round3 is current, no action needed
    };

    // Detect mobile screen size
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (showDownloadModal || (openProviderMenu && isMobile)) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showDownloadModal, openProviderMenu, isMobile]);

    // Close provider menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openProviderMenu) {
                const ref = providerMenuRefs.current[openProviderMenu];
                if (ref && !ref.contains(event.target)) {
                    setOpenProviderMenu(null);
                }
            }
            if (showLanguageMenu && languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
                setShowLanguageMenu(false);
            }
        };

        if (openProviderMenu || showLanguageMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [openProviderMenu, showLanguageMenu]);

    const handleDownloadData = (format) => {
        if (!data || data.length === 0) return;

        if (format === 'json') {
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `q4-2025-analysis-${dataSource}-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else {
            // CSV export
            const headers = ['language', 'model', 'clarity_mean', 'clarity_stdDev', 'clarity_count', 
                'naturalness_mean', 'naturalness_stdDev', 'naturalness_count',
                'correctness_mean', 'correctness_stdDev', 'correctness_count'];
            const rows = data.flatMap(lang => 
                lang.models.map(model => [
                    lang.language,
                    model.name,
                    model.metrics.clarity.mean,
                    model.metrics.clarity.stdDev,
                    model.metrics.clarity.count,
                    model.metrics.naturalness.mean,
                    model.metrics.naturalness.stdDev,
                    model.metrics.naturalness.count,
                    model.metrics.correctness.mean,
                    model.metrics.correctness.stdDev,
                    model.metrics.correctness.count
                ])
            );
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');
            
            const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `q4-2025-analysis-${dataSource}-${Date.now()}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
        setShowDownloadModal(false);
    };
    // Map internal provider keys to display names
    const getProviderDisplayName = (provider) => {
        const displayNames = {
            'claude': 'Anthropic',
            'google': 'Google',
            'openai': 'OpenAI'
        };
        return displayNames[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
    };

    // Helper to check if a provider is fully active, partially active, or inactive
    const getProviderState = (provider) => {
        const models = allModels.filter(m => getProvider(m.id) === provider);
        if (models.length === 0) return 'none';

        const allVisible = models.every(m => visibleModels.has(m.id));
        const someVisible = models.some(m => visibleModels.has(m.id));

        if (allVisible) return 'all';
        if (someVisible) return 'some';
        return 'none';
    };

    // Get models for a specific provider
    const getProviderModels = (provider) => {
        return allModels.filter(m => getProvider(m.id) === provider);
    };

    // Handle provider button click - toggle menu or select all
    const handleProviderClick = (provider) => {
        if (openProviderMenu === provider) {
            setOpenProviderMenu(null);
        } else {
            setOpenProviderMenu(provider);
        }
    };

    // Handle select all models for a provider
    const handleSelectAllProvider = (provider) => {
        const providerModels = getProviderModels(provider);
        const allVisible = providerModels.every(m => visibleModels.has(m.id));
        
        if (allVisible) {
            // Deselect all
            providerModels.forEach(m => {
                if (visibleModels.has(m.id)) {
                    toggleModel(m.id);
                }
            });
        } else {
            // Select all
            providerModels.forEach(m => {
                if (!visibleModels.has(m.id)) {
                    toggleModel(m.id);
                }
            });
        }
    };

    return (
        <>
        <div className="controls-bar">
            <div className="container flex-col gap-md">

                {/* Top Row: Metrics and Data Source */}
                <div className="flex items-center justify-between gap-4" style={{ flexWrap: 'wrap' }}>

                    {/* Metric Tabs */}
                    <div className="flex" style={{ backgroundColor: 'var(--bg-card)', padding: '0.25rem', borderRadius: '0.5rem' }}>
                        {['clarity', 'naturalness', 'correctness'].map(m => (
                            <button
                                key={m}
                                onClick={() => {
                                    setMetric(m);
                                    if (m !== 'clarity') {
                                        updateURLParams({ metric: m });
                                    } else {
                                        updateURLParams({ metric: null });
                                    }
                                }}
                                className={`btn ${metric === m ? 'btn-active' : ''}`}
                                title={METRIC_DEFINITIONS[m]}
                                style={{ position: 'relative' }}
                            >
                                {m.charAt(0).toUpperCase() + m.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Round Selector */}
                    <div className="flex items-center gap-4" style={{ backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Round:</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleRoundChange('round3')}
                                className="btn btn-toggle btn-toggle-active"
                                disabled
                                style={{ opacity: 1, cursor: 'default' }}
                            >
                                Round 3
                            </button>
                            <button
                                onClick={() => handleRoundChange('round2')}
                                className="btn btn-toggle"
                                title="Switch to Round 2"
                            >
                                Round 2
                            </button>
                            <button
                                onClick={() => handleRoundChange('round1')}
                                className="btn btn-toggle"
                                style={{ opacity: 0.6 }}
                                title="Round 1 - Coming Soon"
                            >
                                Round 1
                            </button>
                        </div>
                    </div>

                    {/* Data Source Toggle with Download */}
                    <div className="flex items-center gap-4" style={{ backgroundColor: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '0.5rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Data Source:</span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setDataSource('primary');
                                    updateURLParams({ source: null });
                                }}
                                className={`btn btn-toggle ${dataSource === 'primary' ? 'btn-toggle-active' : ''}`}
                            >
                                Primary
                            </button>
                            <button
                                onClick={() => {
                                    setDataSource('secondary');
                                    updateURLParams({ source: 'secondary' });
                                }}
                                className={`btn btn-toggle ${dataSource === 'secondary' ? 'btn-toggle-active' : ''}`}
                            >
                                Secondary
                            </button>
                        </div>
                        <button
                            onClick={() => setShowDownloadModal(true)}
                            className="btn"
                            title="Download data"
                            style={{ padding: '0.5rem' }}
                        >
                            <Download size={16} />
                        </button>
                    </div>
                </div>

                {/* Provider Toggles with Model Selection and Language Filter */}
                <div className="flex gap-4 items-center justify-between" style={{ flexWrap: 'wrap', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                    <div className="flex gap-4 items-center" style={{ flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', marginRight: '0.5rem' }}>Providers:</span>
                    {['claude', 'openai'].map(provider => {
                        const state = getProviderState(provider);
                        const providerModels = getProviderModels(provider);
                        const isMenuOpen = openProviderMenu === provider;
                        const allModelsVisible = providerModels.length > 0 && providerModels.every(m => visibleModels.has(m.id));
                        
                        return (
                            <div key={provider} style={{ position: 'relative' }} ref={el => providerMenuRefs.current[provider] = el}>
                            <button
                                    onClick={() => handleProviderClick(provider)}
                                className={`btn btn-sm ${state === 'all' ? 'btn-active' : ''}`}
                                style={{
                                    opacity: state === 'none' ? 0.6 : 1,
                                        border: state === 'some' ? '1px dashed var(--primary-color)' : undefined,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    {getProviderDisplayName(provider)}
                                    {state === 'all' && <Check size={14} />}
                                    <ChevronDown size={14} style={{ 
                                        transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s'
                                    }} />
                                </button>
                                
                                {/* Provider Model Menu - Desktop Dropdown / Mobile Modal */}
                                {isMenuOpen && (
                                    <>
                                        {isMobile ? (
                                            // Mobile: Full-screen modal
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
                                                onClick={() => setOpenProviderMenu(null)}
                                            >
                                                <div
                                                    style={{
                                                        backgroundColor: 'var(--bg-card)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '1rem',
                                                        padding: '1.5rem',
                                                        width: '100%',
                                                        maxWidth: '400px',
                                                        maxHeight: '80vh',
                                                        overflowY: 'auto',
                                                        boxShadow: 'var(--shadow-lg)',
                                                        position: 'relative'
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => setOpenProviderMenu(null)}
                                                        className="btn btn-icon"
                                                        style={{
                                                            position: 'absolute',
                                                            top: '1rem',
                                                            right: '1rem',
                                                            padding: '0.5rem'
                                                        }}
                                                    >
                                                        <X size={20} />
                                                    </button>
                                                    <h3 style={{
                                                        fontSize: '1.125rem',
                                                        fontWeight: 'bold',
                                                        marginBottom: '1rem',
                                                        color: 'var(--text-primary)',
                                                        paddingRight: '2rem'
                                                    }}>
                                                        {getProviderDisplayName(provider)} Models
                                                    </h3>
                                                    <button
                                                        onClick={() => handleSelectAllProvider(provider)}
                                                        className="btn"
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.75rem',
                                                            fontSize: '0.875rem',
                                                            marginBottom: '1rem',
                                                            backgroundColor: allModelsVisible ? 'var(--color-accent)' : 'transparent',
                                                            color: allModelsVisible ? 'white' : 'var(--text-secondary)',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: '0.375rem',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}
                                                    >
                                                        <span>Select All</span>
                                                        {allModelsVisible && <Check size={14} />}
                                                    </button>
                                                    <div style={{
                                                        borderTop: '1px solid var(--border-color)',
                                                        paddingTop: '1rem',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.5rem'
                                                    }}>
                                                        {providerModels.map(model => (
                                                            <button
                                                                key={model.id}
                                                                onClick={() => {
                                                                    toggleModel(model.id);
                                                                }}
                                                                className="btn"
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.75rem',
                                                                    fontSize: '0.875rem',
                                                                    backgroundColor: visibleModels.has(model.id) ? 'var(--bg-card-hover)' : 'transparent',
                                                                    color: 'var(--text-primary)',
                                                                    border: '1px solid var(--border-color)',
                                                                    borderRadius: '0.375rem',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.75rem',
                                                                    textAlign: 'left'
                                                                }}
                                                            >
                                                                <span
                                                                    style={{ 
                                                                        width: '10px', 
                                                                        height: '10px', 
                                                                        borderRadius: '50%', 
                                                                        backgroundColor: model.color,
                                                                        flexShrink: 0
                                                                    }}
                                                                />
                                                                <span style={{ flex: 1 }}>{model.name}</span>
                                                                {visibleModels.has(model.id) && <Check size={16} />}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            // Desktop: Dropdown
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                marginTop: '0.5rem',
                                                backgroundColor: 'var(--bg-card)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '0.5rem',
                                                boxShadow: 'var(--shadow-lg)',
                                                padding: '0.75rem',
                                                zIndex: 1000,
                                                minWidth: '200px',
                                                maxWidth: '300px'
                                            }}>
                                        {/* Select All Button */}
                                        <button
                                            onClick={() => handleSelectAllProvider(provider)}
                                            className="btn"
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem 0.75rem',
                                                fontSize: '0.875rem',
                                                marginBottom: '0.5rem',
                                                backgroundColor: allModelsVisible ? 'var(--color-accent)' : 'transparent',
                                                color: allModelsVisible ? 'white' : 'var(--text-secondary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '0.375rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between'
                                            }}
                                        >
                                            <span>Select All</span>
                                            {allModelsVisible && <Check size={14} />}
                                        </button>
                                        
                                        <div style={{
                                            borderTop: '1px solid var(--border-color)',
                                            paddingTop: '0.5rem',
                                            maxHeight: '300px',
                                            overflowY: 'auto'
                                        }}>
                                            {providerModels.map(model => (
                                                <button
                                                    key={model.id}
                                                    onClick={() => {
                                                        toggleModel(model.id);
                                                    }}
                                                    className="btn"
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem 0.75rem',
                                                        fontSize: '0.875rem',
                                                        marginBottom: '0.25rem',
                                                        backgroundColor: visibleModels.has(model.id) ? 'var(--bg-card-hover)' : 'transparent',
                                                        color: 'var(--text-primary)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: '0.375rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    <span
                                                        style={{ 
                                                            width: '8px', 
                                                            height: '8px', 
                                                            borderRadius: '50%', 
                                                            backgroundColor: model.color,
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                    <span style={{ flex: 1 }}>{model.name}</span>
                                                    {visibleModels.has(model.id) && <Check size={14} />}
                            </button>
                                            ))}
                                        </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>

                    {/* Language Filter */}
                    {data && Array.isArray(data) && data.length > 0 && (
                        <div style={{ position: 'relative' }} ref={languageMenuRef}>
                            <button
                                onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                                className="btn btn-sm"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    border: selectedLanguage ? '1px solid var(--primary-color)' : undefined
                                }}
                            >
                                <Globe size={14} />
                                <span>{selectedLanguage || 'Browse by Language'}</span>
                                <ChevronDown size={14} style={{ 
                                    transform: showLanguageMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s'
                                }} />
                            </button>
                        
                        {showLanguageMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                backgroundColor: 'var(--bg-card)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '0.5rem',
                                boxShadow: 'var(--shadow-lg)',
                                padding: '0.5rem',
                                zIndex: 1000,
                                minWidth: '200px',
                                maxHeight: '400px',
                                overflowY: 'auto'
                            }}>
                            <button
                                onClick={() => {
                                    setSelectedLanguage(null);
                                    setShowLanguageMenu(false);
                                    const params = new URLSearchParams(window.location.search);
                                    params.delete('lang');
                                    navigate(`${window.location.pathname}?${params.toString()}`);
                                }}
                                className="btn"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    fontSize: '0.875rem',
                                    backgroundColor: !selectedLanguage ? 'var(--bg-card-hover)' : 'transparent',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '0.375rem',
                                    marginBottom: '0.5rem',
                                    textAlign: 'left'
                                }}
                            >
                                All Languages
                            </button>
                            {data && Array.isArray(data) && data.length > 0 && data.map(langData => {
                                if (!langData || !langData.language) return null;
                                return (
                                    <button
                                        key={langData.language}
                                        onClick={() => {
                                            if (setSelectedLanguage) {
                                                setSelectedLanguage(langData.language);
                                            }
                                            setShowLanguageMenu(false);
                                            updateURLParams({ lang: langData.language });
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
                                            backgroundColor: selectedLanguage === langData.language ? 'var(--bg-card-hover)' : 'transparent',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '0.375rem',
                                            marginBottom: '0.5rem',
                                            textAlign: 'left',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <span>{langData.language}</span>
                                        {selectedLanguage === langData.language && <Check size={14} />}
                                    </button>
                                );
                            })}
                        </div>
                        )}
                        </div>
                    )}
                </div>

            </div>
        </div>

        {/* Download Modal */}
        {showDownloadModal && (
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
                onClick={() => setShowDownloadModal(false)}
            >
                <div
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '1rem',
                        padding: '2rem',
                        maxWidth: '400px',
                        width: '100%',
                        boxShadow: 'var(--shadow-lg)',
                        position: 'relative'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        onClick={() => setShowDownloadModal(false)}
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
                    <h3 style={{
                        fontSize: '1.25rem',
                        fontWeight: 'bold',
                        marginBottom: '1.5rem',
                        color: 'var(--text-primary)'
                    }}>
                        Download Data
                    </h3>
                    <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        marginBottom: '1.5rem'
                    }}>
                        Choose a format to download the analysis data:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <button
                            onClick={() => handleDownloadData('csv')}
                            className="btn btn-active"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                fontSize: '0.875rem',
                                fontWeight: 500
                            }}
                        >
                            Download as CSV
                        </button>
                        <button
                            onClick={() => handleDownloadData('json')}
                            className="btn btn-active"
                            style={{
                                width: '100%',
                                padding: '0.75rem 1rem',
                                fontSize: '0.875rem',
                                fontWeight: 500
                            }}
                        >
                            Download as JSON
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default Controls;
