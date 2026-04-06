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
    let loadedMuscles = [];
    let config = null;
    const isGitHub = window.location.hostname.includes("github.io");
    const basePath = isGitHub ? "/Muskelfinder" : "";

    function getImageSortOrder(imagePath) {
        const match = imagePath.match(/_(\d+)(?=\.[^.]+$)/);
        return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
    }

    function getImages(muscle) {
        const rawImages = Array.isArray(muscle?.Images)
            ? muscle.Images.filter(Boolean)
            : (muscle?.Image ? [muscle.Image] : []);

        return [...new Set(rawImages)].sort((a, b) => {
            const orderDiff = getImageSortOrder(a) - getImageSortOrder(b);
            return orderDiff || a.localeCompare(b);
        });
    }

    function normalizeMuscle(muscle) {
        const images = getImages(muscle);
        return {
            ...muscle,
            Images: images,
            Image: images[0] || ""
        };
    }

    async function loadConfig() {
        const response = await fetch(basePath + '/data/config.json');
        config = await response.json();
        return config;
    }

    async function loadPackage(dataFile) {
        try {
            const response = await fetch(basePath + '/data/' + dataFile);
            if (!response.ok) return [];
            const data = await response.json();
            return (data.Sheet1 || []).map(normalizeMuscle);
        } catch (e) {
            console.warn('Datei nicht gefunden, wird übersprungen:', dataFile);
            return [];
        }
    }

    async function loadSelected(regionIds) {
        if (!config) await loadConfig();
        loadedMuscles = [];
        for (const region of config.regions) {
            if (regionIds.includes(region.id)) {
                const muscles = await loadPackage(region.dataFile);
                loadedMuscles.push(...muscles);
            }
        }
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
        return getImages(muscle)[0] || "";
    }

    return {
        loadConfig,
        loadSelected,
        getAll,
        getByRegion,
        getBySubgroup,
        getConfig,
        getImages,
        getPrimaryImage
    };
})();
