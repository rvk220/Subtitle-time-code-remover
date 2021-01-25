const qs = path => document.querySelector(path);

const showResult = (message, success=true) => {
    qs('#resultContainer').innerHTML = `<p style="color:${success ? 'green' : 'red'}">${message}</p>`;
    setTimeout(() => qs('#resultContainer').innerHTML = '', 5000);
}

const processReplacement = () => {
    let changesMade = false;
    const regex = /(\n*)(\d+)(\n*)\d\d:\d\d:\d\d,\d\d\d(\s*)-->(\s*)\d\d:\d\d:\d\d,\d\d\d(\n*)/g;
    if(qs('#checkboxTimeCodes').checked && qs('#textarea1').value.match(regex)) {
        qs('#textarea1').value = qs('#textarea1').value.replace(regex, '\n').trim();
        changesMade = true;
    }
    if(qs('#checkboxOtherLineBreaks').checked && qs('#textarea1').value.match(/\n\n/)) {
        qs('#textarea1').value = qs('#textarea1').value.replace(/\n+/g, '\n');
        if(!changesMade) {changesMade = true;}
    }
    if(qs('#checkboxMultipleSpaces').checked && qs('#textarea1').value.match(/\ \ /)) {
        qs('#textarea1').value = qs('#textarea1').value.replace(/\ +/g, '\ ');
        if(!changesMade) {changesMade = true;}
    }
    if(qs('#checkboxUnderscores').checked && qs('#textarea1').value.match(/_/)) {
        qs('#textarea1').value = qs('#textarea1').value.replace(/_+/g, '\ ');
        if(!changesMade) {changesMade = true;}
    }
    return changesMade;
}

const copyToClipboard = () => {
    qs('#textarea1').select();
    document.execCommand("copy");
}

function processOnly() {
    if(!qs('#textarea1').value) {
        showResult('The input is empty, so nothing was done.', false);
    } else {
        const isChanged = processReplacement();
        qs('#textarea1').select();
        showResult((() => {
            if (isChanged) {
                return 'The subtitle text was successfully processed.';
            } else {
                return 'The input text already corresponds to the preset criteria, so nothing was changed.';
            }
        })(), isChanged);
    }
}

function processAndCopyToClipboard() {
    if(!qs('#textarea1').value) {
        showResult('The input is empty, so nothing was done.', false);
    } else {
        const isChanged = processReplacement();
        copyToClipboard();
        showResult((() => {
            if(isChanged) {
                return 'The subtitle text was successfully processed and copied to clipboard.';
            } else {
                return 'The input text already corresponds to the preset criteria, so it was only copied to clipboard without any changes. ';
            }
        })(), isChanged);
    }
}

function updateCheckboxConfig() {
    localStorage.setItem('srtCheckboxConfig', JSON.stringify({
        checkboxTimeCodes: qs('#checkboxTimeCodes').checked,
        checkboxOtherLineBreaks: qs('#checkboxOtherLineBreaks').checked,
        checkboxMultipleSpaces: qs('#checkboxMultipleSpaces').checked,
        checkboxUnderscores: qs('#checkboxUnderscores').checked
    }));    
}

function applySavedConfig() {
    const checkboxConfig = localStorage.getItem('srtCheckboxConfig');
    if(checkboxConfig) {
        const {checkboxTimeCodes, checkboxOtherLineBreaks, checkboxMultipleSpaces, checkboxUnderscores} = JSON.parse(checkboxConfig);
        qs('#checkboxTimeCodes').checked = checkboxTimeCodes;
        qs('#checkboxOtherLineBreaks').checked = checkboxOtherLineBreaks;
        qs('#checkboxMultipleSpaces').checked = checkboxMultipleSpaces;
        qs('#checkboxUnderscores').checked = checkboxUnderscores;
    }
}

function onFileInputChange(inputDomElement, utf8=true) {
    const file = inputDomElement.files[0];
    const reader = new FileReader();
    reader.readAsText(file, utf8 ? 'UTF-8' : 'CP1251');
    reader.onload = () => {
        let result = reader.result;
        if(utf8 && result.match(/�/)) {
            onFileInputChange(inputDomElement, false);
            console.log('The file encoding is not utf-8! Trying CP1251...');
        } else {
            qs('#textarea1').value = file.name.replace(/.srt|.txt/, '').toUpperCase() + '\n' + result;
        }
    }
}