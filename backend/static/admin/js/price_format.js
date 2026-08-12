document.addEventListener('DOMContentLoaded', function() {
    const priceInputs = document.querySelectorAll('input[name="price"], input[name="compare_price"], input[name="cost_price"]');

    priceInputs.forEach(input => {
        input.addEventListener('input', function(e) {
            let value = this.value.replace(/,/g, '').replace(/٬/g, '').replace(/\s/g, '');
            if (value && !isNaN(value) && value.length > 0) {
                let formatted = Number(value).toLocaleString('en-US');
                this.value = formatted;
            }
        });

        input.addEventListener('blur', function(e) {
            let value = this.value.replace(/,/g, '').replace(/٬/g, '').replace(/\s/g, '');
            if (value && !isNaN(value) && value.length > 0) {
                let formatted = Number(value).toLocaleString('en-US');
                this.value = formatted;
            }
        });

        input.addEventListener('focus', function(e) {
            let value = this.value.replace(/,/g, '').replace(/٬/g, '').replace(/\s/g, '');
            this.value = value;
        });
    });
});