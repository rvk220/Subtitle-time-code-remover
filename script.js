const qs = path => document.querySelector(path);

var fileName = 'ex_subtitles_' + Date.now();
const setFileNameOnPaste = () => fileName = 'ex_subtitles_' + Date.now() + '.txt';

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
    if(qs('#checkboxOtherLineBreaks').checked && qs('#textarea1').value.match(/\n+/)) {
        qs('#textarea1').value = qs('#textarea1').value.replace(/\n+/g, '\n');
        // /\n+|(\n(\s+)\n)/g
        if(!changesMade) {changesMade = true;}
    }
    if(qs('#checkboxMultipleSpaces').checked && qs('#textarea1').value.match(/\ \ /)) {
        qs('#textarea1').value = qs('#textarea1').value.replace(/\ +/g, '\ ');
        if(!changesMade) {changesMade = true;}
    }
    return changesMade;
}

const copyToClipboard = () => {
    qs('#textarea1').select();
    document.execCommand("copy");
    qs('#textarea1').blur();
}

function processOnly() {
    if(!qs('#textarea1').value) {
        showResult('The input is empty, so nothing was done.', false);
    } else {
        const isChanged = processReplacement();
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
        })(), true);
    }
}

function updateCheckboxConfig() {
    localStorage.setItem('srtCheckboxConfig', JSON.stringify({
        checkboxTimeCodes: qs('#checkboxTimeCodes').checked,
        checkboxOtherLineBreaks: qs('#checkboxOtherLineBreaks').checked,
        checkboxMultipleSpaces: qs('#checkboxMultipleSpaces').checked,
        skipFileCheck: qs('#skipFileCheck').checked,
        addHeader: qs('#addHeader').checked
    }));    
}

function applySavedConfig() {
    const checkboxConfig = localStorage.getItem('srtCheckboxConfig');
    if(checkboxConfig) {
        const {checkboxTimeCodes, checkboxOtherLineBreaks, checkboxMultipleSpaces, skipFileCheck, addHeader} = JSON.parse(checkboxConfig);
        qs('#checkboxTimeCodes').checked = checkboxTimeCodes;
        qs('#checkboxOtherLineBreaks').checked = checkboxOtherLineBreaks;
        qs('#checkboxMultipleSpaces').checked = checkboxMultipleSpaces;
        qs('#skipFileCheck').checked = skipFileCheck
        qs('#addHeader').checked = addHeader
    }
}

function processFile(file, utf8=true) {
    //console.log(file.size, file.name, file.name.match(/\.(srt|txt)$/))
    if (qs('#skipFileCheck').checked || (file.name.match(/\.(srt|txt)$/) && file.size < 10485760)) {
        const reader = new FileReader();
        reader.readAsText(file, utf8 ? 'UTF-8' : 'CP1251');
        reader.onload = () => {
            let result = reader.result;
            if (utf8 && result.match(/�/)) {
                processFile(file, false);
                console.log('The file encoding is not utf-8! Trying CP1251...');
            } else {
                const fileNameTemp = file.name.replace(/\.(srt|txt)$/, '');
                const header = qs('#addHeader').checked ? fileNameTemp.replace(/_+/g, '\ ').toUpperCase() + '\n' : '';
                qs('#textarea1').value = header + result;
                fileName = fileNameTemp + '_ex_subtitles' + '.txt';
            }
        }
    } else {
        showResult('Error: the file extension is not .srt or .txt, or the file is too big.', false);
    }
}

function onFileInputChange(inputDomElement) {
    file = inputDomElement.files[0];
    if(file) {
        processFile(file);
    }    
}

function dropFile(event) {
    event.preventDefault();
    const dt = event.dataTransfer;
    if(!dt || !dt.files || dt.files.length !== 1) {
        showResult('Error: you can drag-and-drop only one .srt or .txt valid file.', false);
    } else {
        processFile(dt.files[0]);
    }
}

function processAndDownloadFile() {
    const isChanged = processReplacement();
    if(qs('#textarea1').value) {
        const blob = new Blob([qs('#textarea1').value], {type: 'text/plain;charset=utf-8;'});
        const a = document.createElement('a');
        a.download = fileName;
        a.href = window.URL.createObjectURL(blob);
        showResult((() => {
            a.click();
            if (isChanged) {
                return 'The subtitle text was successfully processed and forwarded to download.';
            } else {
                return 'The input text already corresponds to the preset criteria, so nothing was changed. The original text was forwarded to download.';
            }
        })(), true)
    } else {
        showResult('The input is empty, so nothing was done.', false);
    }
}
