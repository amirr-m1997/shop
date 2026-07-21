/**
 * Auto-fill main_category based on selected category's root ancestor.
 * Also filter category dropdown when main_category changes.
 */
(function() {
    'use strict';

    const CATEGORY_MAP = {
        'مردانه': 'مردانه',
        'زنانه': 'زنانه',
        'بچگانه': 'بچگانه',
        'اکسسوری': 'اکسسوری',
    };

    const rootCache = {};

    function getRootCategoryName(categoryId, callback) {
        if (!categoryId) { callback(''); return; }
        if (rootCache[categoryId]) { callback(rootCache[categoryId]); return; }

        fetch('/api/products/categories/' + categoryId + '/')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var current = data;
                var walk = function(cat) {
                    if (cat.parent) {
                        fetch('/api/products/categories/' + cat.parent + '/')
                            .then(function(r) { return r.json(); })
                            .then(function(parent) { walk(parent); })
                            .catch(function() { callback(''); });
                    } else {
                        var name = cat.name;
                        var mapped = CATEGORY_MAP[name] || name;
                        rootCache[categoryId] = mapped;
                        callback(mapped);
                    }
                };
                walk(current);
            })
            .catch(function() { callback(''); });
    }

    function populateCategorySelect(categorySelect, rootData, currentCatId) {
        categorySelect.innerHTML = '';

        function addOption(cat, indent) {
            var newOpt = document.createElement('option');
            newOpt.value = cat.id;
            newOpt.text = '\u2014'.repeat(indent) + ' ' + cat.name;
            if (String(cat.id) === String(currentCatId)) {
                newOpt.selected = true;
            }
            categorySelect.appendChild(newOpt);

            if (cat.children) {
                cat.children.forEach(function(child) {
                    addOption(child, indent + 1);
                });
            }
        }

        addOption(rootData, 0);
    }

    function autoFillMainCategory() {
        var categorySelect = document.querySelector('#id_category');
        var mainCategorySelect = document.querySelector('#id_main_category');

        if (!categorySelect || !mainCategorySelect) return;

        // Store current category value on load
        var currentCatId = categorySelect.value;

        // Direction 1: Category changed -> auto-fill main_category
        categorySelect.addEventListener('change', function() {
            var categoryId = this.value;
            if (!categoryId) return;

            getRootCategoryName(categoryId, function(rootName) {
                if (rootName) {
                    for (var i = 0; i < mainCategorySelect.options.length; i++) {
                        if (mainCategorySelect.options[i].value === rootName) {
                            mainCategorySelect.selectedIndex = i;
                            mainCategorySelect.dispatchEvent(new Event('change'));
                            break;
                        }
                    }
                }
            });
        });

        // Direction 2: main_category changed -> filter category dropdown
        var cachedCategories = {};

        mainCategorySelect.addEventListener('change', function() {
            var selectedMain = this.value;

            if (!selectedMain) {
                // No main_category selected - reload page to get all categories
                // (simpler than caching all categories)
                location.reload();
                return;
            }

            // Check cache
            if (cachedCategories[selectedMain]) {
                populateCategorySelect(categorySelect, cachedCategories[selectedMain], currentCatId);
                return;
            }

            // Fetch filtered categories from API
            fetch('/api/products/categories/by-root/?root=' + encodeURIComponent(selectedMain))
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    cachedCategories[selectedMain] = data;
                    populateCategorySelect(categorySelect, data, currentCatId);
                })
                .catch(function() {});
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoFillMainCategory);
    } else {
        autoFillMainCategory();
    }
})();
