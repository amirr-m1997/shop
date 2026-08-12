/**
 * Live-filter variant size dropdowns when product category changes.
 * Uses /api/products/sizes/for-category/?category=<id> (parent inheritance).
 */
(function () {
    'use strict';

    function getSizeSelects() {
        var group = document.querySelector('#variants-group');
        if (group) {
            return Array.prototype.slice.call(
                group.querySelectorAll('select[name$="-size"]')
            );
        }
        return Array.prototype.slice.call(
            document.querySelectorAll('select[name^="variants-"][name$="-size"]')
        );
    }

    function rebuildSelect(select, sizes, keepValue) {
        var current = keepValue || select.value;
        var hasCurrent = false;

        select.innerHTML = '';

        var blank = document.createElement('option');
        blank.value = '';
        blank.textContent = '---------';
        select.appendChild(blank);

        sizes.forEach(function (size) {
            var opt = document.createElement('option');
            opt.value = String(size.id);
            opt.textContent = size.label || (size.category_name + ' - ' + size.name);
            if (String(size.id) === String(current)) {
                opt.selected = true;
                hasCurrent = true;
            }
            select.appendChild(opt);
        });

        // Keep a previously selected size even if not in the new list
        if (current && !hasCurrent) {
            var orphan = document.createElement('option');
            orphan.value = String(current);
            orphan.textContent = 'سایز فعلی (#' + current + ')';
            orphan.selected = true;
            select.appendChild(orphan);
        }
    }

    function applySizesToAllVariantSelects(sizes) {
        getSizeSelects().forEach(function (select) {
            rebuildSelect(select, sizes, select.value);
        });
    }

    function fetchSizesForCategory(categoryId, callback) {
        var url = '/api/products/sizes/for-category/';
        if (categoryId) {
            url += '?category=' + encodeURIComponent(categoryId);
        }
        fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                callback(data.sizes || []);
            })
            .catch(function () {
                callback(null);
            });
    }

    function initVariantSizeFilter() {
        var categorySelect = document.querySelector('#id_category');
        if (!categorySelect) return;
        if (!document.querySelector('#variants-group') && getSizeSelects().length === 0) {
            return;
        }

        categorySelect.addEventListener('change', function () {
            var categoryId = this.value;
            fetchSizesForCategory(categoryId, function (sizes) {
                if (!sizes) return;
                applySizesToAllVariantSelects(sizes);
            });
        });

        // When Django admin adds a new inline row, repopulate from current category
        document.body.addEventListener('click', function (e) {
            var target = e.target;
            if (!target) return;
            var addLink = target.closest ? target.closest('.add-row a, tr.add-row a') : null;
            if (!addLink && !(target.classList && target.classList.contains('addlink'))) {
                return;
            }
            // Only react inside variants group
            var inVariants = (addLink || target).closest &&
                (addLink || target).closest('#variants-group');
            if (!inVariants) return;

            setTimeout(function () {
                var categoryId = categorySelect.value;
                fetchSizesForCategory(categoryId, function (sizes) {
                    if (!sizes) return;
                    applySizesToAllVariantSelects(sizes);
                });
            }, 80);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVariantSizeFilter);
    } else {
        initVariantSizeFilter();
    }
})();
