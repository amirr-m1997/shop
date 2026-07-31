(function () {
    'use strict';

    var searchInput = document.getElementById('searchbar');
    if (!searchInput) return;

    var debounceTimer = null;
    var dropdown = null;
    var activeIndex = -1;

    function createDropdown() {
        dropdown = document.createElement('div');
        dropdown.id = 'admin-product-search-results';
        dropdown.style.cssText =
            'position:absolute;top:100%;right:0;left:0;z-index:1000;' +
            'background:#fff;border:1px solid #ddd;border-radius:4px;' +
            'margin-top:4px;max-height:320px;overflow-y:auto;' +
            'box-shadow:0 4px 12px rgba(0,0,0,.15);display:none;';
        searchInput.parentElement.style.position = 'relative';
        searchInput.parentElement.appendChild(dropdown);
    }

    function debounce(fn, delay) {
        return function () {
            var args = arguments;
            var ctx = this;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                fn.apply(ctx, args);
            }, delay);
        };
    }

    function fetchResults(query) {
        if (query.length < 2) {
            dropdown.style.display = 'none';
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', '/api/products/admin-search/?q=' + encodeURIComponent(query), true);
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        xhr.onload = function () {
            if (xhr.status === 200) {
                var data = JSON.parse(xhr.responseText);
                renderResults(data);
            }
        };

        xhr.send();
    }

    function renderResults(results) {
        dropdown.innerHTML = '';

        if (!results.length) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding:10px 14px;color:#999;font-size:13px;';
            empty.textContent = 'محصولی یافت نشد';
            dropdown.appendChild(empty);
            dropdown.style.display = 'block';
            return;
        }

        results.forEach(function (item, idx) {
            var row = document.createElement('div');
            row.dataset.index = idx;
            row.style.cssText =
                'display:flex;align-items:center;gap:10px;padding:8px 14px;' +
                'cursor:pointer;border-bottom:1px solid #f0f0f0;font-size:13px;' +
                'transition:background .15s;';

            row.onmouseenter = function () {
                setActive(idx);
            };

            row.onclick = function () {
                window.location.href = '/admin/products/product/' + item.id + '/change/';
            };

            var img = document.createElement('img');
            img.src = item.image || '/static/admin/img/placeholder.png';
            img.alt = item.name;
            img.style.cssText = 'width:36px;height:36px;object-fit:cover;border-radius:3px;background:#f5f5f5;';
            img.onerror = function () {
                img.src = '/static/admin/img/placeholder.png';
            };
            row.appendChild(img);

            var info = document.createElement('div');
            info.style.cssText = 'flex:1;min-width:0;';

            var name = document.createElement('div');
            name.style.cssText = 'font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            name.textContent = item.name;
            info.appendChild(name);

            var meta = document.createElement('div');
            meta.style.cssText = 'font-size:11px;color:#888;';

            var skuSpan = document.createElement('span');
            skuSpan.textContent = item.sku ? 'SKU: ' + item.sku : '';
            meta.appendChild(skuSpan);

            if (item.price) {
                var priceSpan = document.createElement('span');
                priceSpan.style.cssText = 'margin-right:8px;';
                var num = parseInt(item.price);
                priceSpan.textContent = num ? num.toLocaleString('fa-IR') + ' تومان' : '';
                meta.appendChild(priceSpan);
            }

            info.appendChild(meta);
            row.appendChild(info);
            dropdown.appendChild(row);
        });

        activeIndex = -1;
        dropdown.style.display = 'block';
    }

    function setActive(idx) {
        var items = dropdown.querySelectorAll('div[data-index]');
        items.forEach(function (el) {
            el.style.background = '';
        });
        if (items[idx]) {
            items[idx].style.background = '#f0f7ff';
            activeIndex = idx;
        }
    }

    function navigateActive(dir) {
        var items = dropdown.querySelectorAll('div[data-index]');
        if (!items.length) return;

        var next = activeIndex + dir;
        if (next < 0) next = items.length - 1;
        if (next >= items.length) next = 0;
        setActive(next);
        items[next].scrollIntoView({ block: 'nearest' });
    }

    var debouncedSearch = debounce(function () {
        fetchResults(searchInput.value.trim());
    }, 1000);

    searchInput.addEventListener('input', function () {
        debouncedSearch();
    });

    searchInput.addEventListener('keydown', function (e) {
        if (dropdown && dropdown.style.display !== 'none') {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                navigateActive(1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                navigateActive(-1);
            } else if (e.key === 'Enter' && activeIndex >= 0) {
                e.preventDefault();
                var items = dropdown.querySelectorAll('div[data-index]');
                if (items[activeIndex]) {
                    items[activeIndex].click();
                }
            } else if (e.key === 'Escape') {
                dropdown.style.display = 'none';
            }
        }
    });

    document.addEventListener('click', function (e) {
        if (dropdown && !searchInput.parentElement.contains(e.target)) {
            dropdown.style.display = 'none';
        }
    });

    searchInput.addEventListener('focus', function () {
        if (dropdown && dropdown.children.length) {
            dropdown.style.display = 'block';
        }
    });

    createDropdown();
})();
