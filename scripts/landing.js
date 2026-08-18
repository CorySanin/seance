document.addEventListener("DOMContentLoaded", function () {
    const themeSelect = document.getElementById('themeSelect');
    const embedTxt = document.getElementById('embedTxt');
    const copyBtn = document.getElementById('copyBtn');
    const checkmarkArea = document.getElementById('checkmarkArea');
    const checkmarks = ['✅️', '✅️', '✅️', '✅️', '☑️', '✔️', '👍️', '📋️'];

    if ([themeSelect, embedTxt, copyBtn, checkmarkArea].some(el => !el)) {
        return;
    }

    function generateEmbed() {
        embedTxt.value = `\
<iframe width="720" height="600" src=\
"${window.location.origin}${window.location.pathname}?dark=${themeSelect.value}" \
frameBorder="0" style="max-width:100%"></iframe>\
`;
    }

    themeSelect.addEventListener('change', generateEmbed);

    copyBtn.addEventListener('click', async _ => {
        await navigator.clipboard.writeText(embedTxt.value);
        const checkmark = document.createTextNode(checkmarks[Math.floor(Math.random() * checkmarks.length)]);
        checkmarkArea.prepend(checkmark);
        setTimeout(() => {
            checkmarkArea.removeChild(checkmark);
        }, 2000);
    });

    if (window.getSelection) {
        embedTxt.addEventListener('focus', _ => embedTxt.select());
    }

    generateEmbed();
});
