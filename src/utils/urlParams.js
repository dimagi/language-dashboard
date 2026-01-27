/**
 * Utility functions for managing URL parameters for dashboard filters
 */

/**
 * Update URL parameters without page reload
 * @param {Object} params - Object with parameter keys and values (null/undefined to remove)
 * @param {boolean} replace - Whether to replace current history entry (default: true)
 */
export const updateURLParams = (params, replace = true) => {
    const url = new URL(window.location.href);
    
    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });
    
    const newURL = url.pathname + url.search + url.hash;
    
    if (replace) {
        window.history.replaceState({}, '', newURL);
    } else {
        window.history.pushState({}, '', newURL);
    }
};

/**
 * Get all URL parameters as an object
 * @returns {Object} Object with parameter keys and values
 */
export const getURLParams = () => {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params.entries()) {
        result[key] = value;
    }
    return result;
};

/**
 * Get a specific URL parameter value
 * @param {string} key - Parameter key
 * @param {string} defaultValue - Default value if not found
 * @returns {string|null}
 */
export const getURLParam = (key, defaultValue = null) => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key) || defaultValue;
};

/**
 * Build URL with filter parameters
 * @param {Object} filters - Filter object with metric, reviewer, models, language, group, etc.
 * @param {string} basePath - Base path (e.g., '/q4-2025' or '/round2')
 * @returns {string} Complete URL with query parameters
 */
export const buildFilterURL = (filters, basePath) => {
    const params = new URLSearchParams();
    
    if (filters.metric) params.set('metric', filters.metric);
    if (filters.reviewer) params.set('reviewer', filters.reviewer);
    if (filters.dataSource) params.set('source', filters.dataSource);
    if (filters.language) params.set('lang', filters.language);
    if (filters.group) params.set('group', filters.group);
    
    // Handle models: can be provider groups (comma-separated) or individual models
    if (filters.providers && Array.isArray(filters.providers)) {
        params.set('providers', filters.providers.join(','));
    } else if (filters.providers) {
        params.set('providers', filters.providers);
    }
    
    if (filters.models && Array.isArray(filters.models)) {
        params.set('models', filters.models.join(','));
    } else if (filters.models) {
        params.set('models', filters.models);
    }
    
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
};
