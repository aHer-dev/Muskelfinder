const PackageSelector = (() => {
    const STORAGE_KEY = 'muskelfinder_selected_packages';
    const DEFAULT_SELECTION = ['obere-extremitaet'];

    function getSaved() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : DEFAULT_SELECTION;
            const normalized = Array.isArray(parsed)
                ? parsed.filter(id => typeof id === 'string' && id.trim() !== '')
                : DEFAULT_SELECTION;
            return normalized.length > 0 ? normalized : DEFAULT_SELECTION;
        } catch (error) {
            return DEFAULT_SELECTION;
        }
    }

    function save(regionIds) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(regionIds));
    }

    async function render(containerId, onSelectionChange) {
        const config = await MuscleData.loadConfig();
        const saved = getSaved();
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = config.regions.map(region => `
            <div class="package-region">
                <label class="package-main">
                    <input type="checkbox" 
                           data-region="${region.id}" 
                           ${saved.includes(region.id) ? 'checked' : ''}>
                    <span>${region.icon} ${region.name}</span>
                </label>
            </div>
        `).join('');

        container.querySelectorAll('input[data-region]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                const selected = [...container.querySelectorAll('input[data-region]:checked')]
                    .map(cb => cb.dataset.region);
                save(selected);
                if (onSelectionChange) onSelectionChange(selected);
            });
        });

        // Initial laden
        if (onSelectionChange) onSelectionChange(saved);
    }

    return { render, getSaved };
})();
