(function () {
    let sendBtn, form;
    
    function blockInput(element) {
        element.readOnly = true;
    }

    document.addEventListener("DOMContentLoaded", function () {
        sendBtn = document.getElementById('sendBtn');
        form = document.getElementById('contactForm');

        form.addEventListener("submit", function(ev) {
            let el;
            for(el of form.getElementsByTagName('input')) {
                blockInput(el);
            }
            for(el of form.getElementsByTagName('textarea')) {
                blockInput(el);
            }
            sendBtn.disabled = true;
            form.classList.add('processing');
        });
    });

    window.unblockSend = function () {
        sendBtn.disabled = false;
    }
})();