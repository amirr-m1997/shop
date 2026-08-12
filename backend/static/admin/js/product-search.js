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
        dropdown.className = 'admin-product-search-results';
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
            empty.className = 'admin-product-search-empty';
            empty.textContent = 'محصولی یافت نشد';
            dropdown.appendChild(empty);
            dropdown.style.display = 'block';
            return;
        }

        results.forEach(function (item, idx) {
            var row = document.createElement('div');
            row.dataset.index = idx;
            row.className = 'admin-product-search-row';

            row.onmouseenter = function () {
                setActive(idx);
            };

            row.onclick = function () {
                window.location.href = '/admin/products/product/' + item.id + '/change/';
            };

            var img = document.createElement('img');
            img.src = item.image || '/static/admin/img/placeholder.png';
            img.alt = item.name;
            img.className = 'admin-product-search-image';
            img.onerror = function () {
                img.src = '/static/admin/img/placeholder.png';
            };
            row.appendChild(img);

            var info = document.createElement('div');
            info.className = 'admin-product-search-info';

            var name = document.createElement('div');
            name.className = 'admin-product-search-name';
            name.textContent = item.name;
            info.appendChild(name);

            var meta = document.createElement('div');
            meta.className = 'admin-product-search-meta';

            var skuSpan = document.createElement('span');
            skuSpan.textContent = item.sku ? 'SKU: ' + item.sku : '';
            meta.appendChild(skuSpan);

            if (item.price) {
                var priceSpan = document.createElement('span');
                priceSpan.className = 'admin-product-search-price';
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
            el.classList.remove('is-active');
        });
        if (items[idx]) {
            items[idx].classList.add('is-active');
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
