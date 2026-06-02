const cache = new Map();

/**
 * Simple zero-dependency in-memory cache middleware
 * @param {number} duration - TTL in seconds
 */
export const cacheMiddleware = (duration = 300) => (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
        return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
    const cachedItem = cache.get(key);
    const now = Date.now();

    if (cachedItem && cachedItem.expiresAt > now) {
        return res.json(cachedItem.body);
    } else if (cachedItem) {
        cache.delete(key);
    }

    // Intercept res.json to store the response in cache
    const originalJson = res.json;
    res.json = function (body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            cache.set(key, {
                body,
                expiresAt: Date.now() + (duration * 1000)
            });
        }
        return originalJson.call(this, body);
    };
    next();
};

export const clearCache = (pattern) => {
    if (!pattern) {
        cache.clear();
        return;
    }
    
    for (const key of cache.keys()) {
        if (key.includes(pattern)) {
            cache.delete(key);
        }
    }
};

export default cache;

