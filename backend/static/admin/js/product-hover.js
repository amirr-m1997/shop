(function() {
    'use strict';

    var previewEl = null;

    function createPreview() {
        previewEl = document.createElement('img');
        previewEl.className = 'product-thumb-preview';
        document.body.appendChild(previewEl);
    }

    function showPreview(e) {
        var src = e.target.getAttribute('data-preview');
        if (!src) return;
        if (!previewEl) createPreview();

        previewEl.src = src;
        previewEl.style.display = 'block';
        movePreview(e);
    }

    function movePreview(e) {
        if (!previewEl) return;
        var x = e.clientX + 15;
        var y = e.clientY + 15;

        // Keep within viewport
        var rect = previewEl.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            x = e.clientX - rect.width - 15;
        }
        if (y + rect.height > window.innerHeight) {
            y = e.clientY - rect.height - 15;
        }

        previewEl.style.left = x + 'px';
        previewEl.style.top = y + 'px';
    }

    function hidePreview() {
        if (previewEl) {
            previewEl.style.display = 'none';
        }
    }

    document.addEventListener('mouseover', function(e) {
        if (e.target.classList.contains('product-thumb')) {
            showPreview(e);
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (e.target.classList.contains('product-thumb')) {
            movePreview(e);
        }
    });

    document.addEventListener('mouseout', function(e) {
        if (e.target.classList.contains('product-thumb')) {
            hidePreview();
        }
    });
})();
