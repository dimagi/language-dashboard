import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ErrorBar, Cell } from 'recharts';
import { Link, Copy, Check } from 'lucide-react';
import _ from 'lodash';

const CustomTooltip = ({ active, payload, label, theme, isPercentage }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const bgColor = theme === 'light' ? '#ffffff' : '#1e293b';
        const borderColor = theme === 'light' ? '#e2e8f0' : '#334155';
        const textColor = theme === 'light' ? '#0f172a' : '#f8fafc';
        const secondaryText = theme === 'light' ? '#64748b' : '#94a3b8';

        return (
            <div className="tooltip-custom" style={{ backgroundColor: bgColor, borderColor: borderColor, color: textColor }}>
                <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{data.name}</p>
                <p style={{ fontSize: '0.875rem' }}>
                    Score: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#60a5fa' }}>
                        {data.value.toFixed(2)}{isPercentage ? '%' : ''}
                    </span>
                </p>
                <p style={{ fontSize: '0.75rem', color: secondaryText }}>Std Dev: {data.error.toFixed(2)}{isPercentage ? '%' : ''}</p>
                <p style={{ fontSize: '0.75rem', color: secondaryText }}>Samples: {data.count}</p>
            </div>
        );
    }
    return null;
};

const LanguageChart = ({ language, data, metric, visibleModels, theme, id, currentFilters }) => {
    const [copied, setCopied] = useState(false);

    const copyLanguageLink = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const params = new URLSearchParams(window.location.search);
        params.set('lang', language);
        
        // Preserve current filters
        if (currentFilters) {
            if (currentFilters.metric && currentFilters.metric !== 'readability') {
                params.set('metric', currentFilters.metric);
            }
            if (currentFilters.reviewer && currentFilters.reviewer === 'secondary') {
                params.set('reviewer', 'secondary');
            }
        }
        
        const url = `${window.location.origin}${window.location.pathname}?${params.toString()}#${id}`;
        
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy link:', err);
        });
    };
    // Determine if metric is percentage-based
    const isPercentage = ['grammatically_correct', 'real_words', 'notable_error'].includes(metric);
    const domain = isPercentage ? [0, 100] : [1, 7];

    if (!data || !data.models) {
        console.warn(`No data or models found for language ${language}`);
        return (
            <div id={id} className="card chart-container">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="chart-title mb-0">{language}</h3>
                </div>
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No data available
                </div>
            </div>
        );
    }

    const chartData = data.models
        .filter(m => m && visibleModels.has(m.id))
        .map(model => {
            // Ensure metric exists
            if (!model.metrics || !model.metrics[metric]) {
                console.warn(`Missing metric ${metric} for model ${model.name} in language ${language}`);
                return null;
            }
            
            return {
                name: model.name || 'Unknown',
                value: model.metrics[metric].mean || 0,
                error: model.metrics[metric].stdDev || 0,
                count: model.metrics[metric].count || 0,
                color: model.color || '#888888',
                id: model.id
            };
        })
        .filter(Boolean); // Remove any null entries

    if (chartData.length === 0) {
        return (
            <div id={id} className="card chart-container">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="chart-title mb-0">{language}</h3>
                </div>
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No data available for selected models
                </div>
            </div>
        );
    }

    const sortedData = chartData;
    const textColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#334155';

    // Calculate N (sample size)
    const counts = sortedData.map(d => d.count).filter(c => c != null && !isNaN(c));
    const minN = counts.length > 0 ? _.min(counts) : 0;
    const maxN = counts.length > 0 ? _.max(counts) : 0;
    const nDisplay = minN === maxN ? `N=${minN}` : `N=${minN}-${maxN}`;

    return (
        <div id={id} className="card chart-container">
            <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex items-center gap-2">
                    <h3 className="chart-title mb-0">
                        {language}
                    </h3>
                    <button
                        onClick={copyLanguageLink}
                        className="btn btn-icon"
                        title="Copy link to this language"
                        style={{
                            padding: '0.25rem',
                            opacity: copied ? 0.6 : 0.7,
                            transition: 'opacity 0.2s'
                        }}
                    >
                        {copied ? <Check size={14} color="#10b981" /> : <Link size={14} />}
                    </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: theme === 'light' ? '#64748b' : '#94a3b8', fontWeight: 500 }}>
                    {nDisplay}
                </span>
            </div>
            <div style={{ flexGrow: 1, width: '100%', minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={sortedData}
                        margin={{ top: 5, right: 30, left: 0, bottom: 60 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: textColor, fontSize: 10 }}
                            angle={-45}
                            textAnchor="end"
                            interval={0}
                            height={60}
                        />
                        <YAxis
                            domain={domain}
                            tick={{ fill: textColor, fontSize: 12 }}
                            tickCount={isPercentage ? 11 : 7}
                            allowDataOverflow={true}
                            label={isPercentage ? { value: '%', angle: -90, position: 'insideLeft', style: { fill: textColor } } : undefined}
                        />
                        <Tooltip
                            content={<CustomTooltip theme={theme} isPercentage={isPercentage} />}
                            cursor={{ fill: theme === 'light' ? '#f1f5f9' : '#1e293b' }}
                        />
                        <Bar dataKey="value" isAnimationActive={true} minPointSize={5}>
                            {sortedData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <ErrorBar dataKey="error" width={4} strokeWidth={2} stroke={theme === 'light' ? '#00000080' : '#ffffff80'} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default LanguageChart;

