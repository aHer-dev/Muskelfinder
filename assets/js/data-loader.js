const REGION_LABELS = {
    'obere-extremitaet':  'Obere Extremität',
    'untere-extremitaet': 'Untere Extremität',
    'wirbelsaeule':       'Wirbelsäule & Rumpf',
    'kopf-hals':          'Kopf & Hals'
};

const SUBGROUP_LABELS = {
    'schulter':          'Schulter',
    'ellenbogen':        'Ellenbogen',
    'hand':              'Hand & Finger',
    'huefte':            'Hüfte',
    'knie':              'Knie',
    'fuss':              'Fuß & Sprunggelenk',
    'ruecken':           'Rücken',
    'bauch':             'Bauch',
    'beckenboden':       'Beckenboden',
    'mimikmuskulatur':   'Mimikmuskulatur',
    'kaumuskulatur':     'Kaumuskulatur',
    'suprahyoidal':      'Suprahyoidal',
    'infrahyoidal':      'Infrahyoidal',
    'halsmuskulatur':    'Halsmuskulatur',
    'praevertebralis':   'Prävertebral'
};

const MuscleData = (() => {
    const CONFIG_CACHE_KEY = 'muskelfinder_config_cache_v1';
    const PACKAGE_CACHE_PREFIX = 'muskelfinder_data_cache_v1::';
    let loadedMuscles = [];
    let config = null;
    const imageLoadCache = new Map();

    function getBasePath() {
        if (!window.location.hostname.includes('github.io')) return '';
        const parts = window.location.pathname.split('/').filter(Boolean);
        if (parts.length === 0) return '';

        const first = parts[0];
        if (first.endsWith('.html') || ['quizzes', 'assets', 'data'].includes(first)) {
            return '';
        }

        return `/${first}`;
    }

    const basePath = getBasePath();

    function resolveAssetPath(assetPath) {
        return assetPath ? `${basePath}${assetPath}` : '';
    }

    function preloadImage(assetPath, options = {}) {
        const resolvedPath = resolveAssetPath(assetPath);
        if (!resolvedPath) return Promise.resolve('');

        const cached = imageLoadCache.get(resolvedPath);
        if (cached) return cached;

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            let settled = false;

            if ('decoding' in img) img.decoding = 'async';
            if (options.fetchPriority && 'fetchPriority' in img) {
                img.fetchPriority = options.fetchPriority;
            }

            const finish = async () => {
                if (settled) return;
                settled = true;
                try {
                    if (typeof img.decode === 'function') {
                        await img.decode();
                    }
                } catch (error) {
                    // decode() kann bei bereits fertigen oder gecachten Bildern fehlschlagen
                }
                resolve(resolvedPath);
            };

            img.onload = finish;
            img.onerror = () => {
                if (settled) return;
                settled = true;
                imageLoadCache.delete(resolvedPath);
                reject(new Error(`Bild konnte nicht geladen werden: ${resolvedPath}`));
            };
            img.src = resolvedPath;

            if (img.complete) {
                void finish();
            }
        });

        imageLoadCache.set(resolvedPath, promise);
        return promise;
    }

    function preloadImages(assetPaths, options = {}) {
        const paths = Array.isArray(assetPaths) ? assetPaths.filter(Boolean) : [];
        return Promise.allSettled(paths.map(path => preloadImage(path, options)));
    }

    function getImageSortOrder(imagePath) {
        const match = imagePath.match(/_(\d+)(?=\.[^.]+$)/);
        return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    }

    function readCache(key) {
        try {
            const raw = sessionStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            return null;
        }
    }

    function writeCache(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            // Speicher kann je nach Browser oder Private Mode limitiert sein
        }
    }

    function getImages(muscle) {
        const primaryImage = muscle?.Image || "";
        const additionalImages = Array.isArray(muscle?.Images)
            ? muscle.Images.filter(Boolean)
            : [];
        const dedupedImages = [...new Set([primaryImage, ...additionalImages].filter(Boolean))];

        if (dedupedImages.length <= 1) {
            return dedupedImages;
        }

        const [firstImage, ...remainingImages] = dedupedImages;
        return [
            firstImage,
            ...remainingImages.sort((a, b) => {
                const orderDiff = getImageSortOrder(a) - getImageSortOrder(b);
                return orderDiff || a.localeCompare(b);
            })
        ];
    }

    function normalizeMuscle(muscle) {
        const images = getImages(muscle);
        return {
            ...muscle,
            Images: images,
            Image: muscle?.Image || ""
        };
    }

    async function loadConfig() {
        if (config) return config;

        const cachedConfig = readCache(CONFIG_CACHE_KEY);
        if (cachedConfig) {
            config = cachedConfig;
            return config;
        }

        const response = await fetch(basePath + '/data/config.json');
        config = await response.json();
        writeCache(CONFIG_CACHE_KEY, config);
        return config;
    }

    async function loadPackage(dataFile) {
        try {
            const cacheKey = PACKAGE_CACHE_PREFIX + dataFile;
            const cachedData = readCache(cacheKey);
            if (cachedData) {
                return (cachedData.Sheet1 || []).map(normalizeMuscle);
            }

            const response = await fetch(basePath + '/data/' + dataFile);
            if (!response.ok) return [];
            const data = await response.json();
            writeCache(cacheKey, data);
            return (data.Sheet1 || []).map(normalizeMuscle);
        } catch (e) {
            console.warn('Datei nicht gefunden, wird übersprungen:', dataFile);
            return [];
        }
    }

    async function loadSelected(regionIds) {
        if (!config) await loadConfig();
        const selectedRegions = config.regions.filter(region => regionIds.includes(region.id));
        const regionPackages = await Promise.all(
            selectedRegions.map(region => loadPackage(region.dataFile))
        );
        loadedMuscles = regionPackages.flat();
        return loadedMuscles;
    }

    function getAll() {
        return loadedMuscles;
    }

    function getByRegion(regionId) {
        return loadedMuscles.filter(m => m.region === regionId);
    }

    function getBySubgroup(subgroupId) {
        return loadedMuscles.filter(m => m.subgroup === subgroupId);
    }

    function getConfig() {
        return config;
    }

    function getPrimaryImage(muscle) {
        return muscle?.Image || "";
    }

    return {
        loadConfig,
        loadSelected,
        getAll,
        getByRegion,
        getBySubgroup,
        getConfig,
        getImages,
        getPrimaryImage,
        resolveAssetPath,
        preloadImage,
        preloadImages
    };
})();
