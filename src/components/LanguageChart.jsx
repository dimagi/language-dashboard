import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ErrorBar, Cell } from 'recharts';
import { Link, Copy, Check } from 'lucide-react';
import _ from 'lodash';

const CustomTooltip = ({ active, payload, label, theme }) => {
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
                    Score: <span style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#60a5fa' }}>{data.value.toFixed(2)}</span>
                </p>
                <p style={{ fontSize: '0.75rem', color: secondaryText }}>Std Dev: {data.error.toFixed(2)}</p>
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
            if (currentFilters.metric && currentFilters.metric !== 'clarity') {
                params.set('metric', currentFilters.metric);
            }
            if (currentFilters.dataSource && currentFilters.dataSource === 'secondary') {
                params.set('source', 'secondary');
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
    const chartData = data.models
        .filter(m => visibleModels.has(m.id))
        .map(model => ({
            name: model.name,
            value: model.metrics[metric].mean,
            error: model.metrics[metric].stdDev,
            count: model.metrics[metric].count,
            color: model.color,
            id: model.id
        }));

    // Do NOT re-sort here. Respect the order from data.models which is already sorted by MODEL_ORDER.
    const sortedData = chartData;
    const textColor = theme === 'light' ? '#475569' : '#94a3b8';
    const gridColor = theme === 'light' ? '#e2e8f0' : '#334155';

    // Calculate N (sample size)
    // It might vary per model, so we can show a range or the max.
    // Usually it's consistent. Let's check if they are all the same.
    const counts = sortedData.map(d => d.count);
    const minN = _.min(counts);
    const maxN = _.max(counts);
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
                            domain={[1, 7]}
                            tick={{ fill: textColor, fontSize: 12 }}
                            tickCount={7}
                            allowDataOverflow={true}
                        />
                        <Tooltip
                            content={<CustomTooltip theme={theme} />}
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
