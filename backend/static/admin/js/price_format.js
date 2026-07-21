//document.addEventListener('DOMContentLoaded', function() {
//    // پیدا کردن همه فیلدهای قیمت
//    const priceInputs = document.querySelectorAll('input[name="price"], input[name="compare_price"], input[name="cost_price"]');
//
//    priceInputs.forEach(input => {
//        // وقتی کاربر تایپ میکنه
//        input.addEventListener('input', function(e) {
//            let value = this.value.replace(/,/g, '').replace(/٬/g, '').replace(/\s/g, '');
//            if (value && !isNaN(value) && value.length > 0) {
//                let formatted = Number(value).toLocaleString('en-US');
//                this.value = formatted;
//            }
//        });
//
//        // وقتی فوکوس رو از دست میده
//        input.addEventListener('blur', function(e) {
//            let value = this.value.replace(/,/g, '').replace(/٬/g, '').replace(/\s/g, '');
//            if (value && !isNaN(value) && value.length > 0) {
//                let formatted = Number(value).toLocaleString('en-US');
//                this.value = formatted;
//            }
//        });
//
//        // وقتی کلیک میکنه برای ویرایش
//        input.addEventListener('focus', function(e) {
//            let value = this.value.replace(/,/g, '').replace(/٬/g, '').replace(/\s/g, '');
//            this.value = value;
//        });
//    });
//});