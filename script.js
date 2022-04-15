const qs = path => document.querySelector(path);

var fileName = 'ex_subtitles_' + Date.now();

const showResult = (message, success=true) => {
    const p = document.createElement('p');
    p.style.color = success ? 'green' : 'red';
    p.innerHTML = message;
    qs('#resultContainer').appendChild(p);
    setTimeout(() => qs('#resultContainer').removeChild(p), 10000);
}

const getAutoMode = () => {
    const elements = document.getElementsByName('autoMode');
    for(const { checked, value } of elements) {
        if(checked) { return value; }
    }
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

const setDisplayOfBottomButtons = autoMode => {
    qs('#bottomButtons').classList.toggle('hidden', !!autoMode);
}

function updateCheckboxConfig(reviseAutoMode = false) {
    const autoMode = getAutoMode();
    if(reviseAutoMode) { setDisplayOfBottomButtons(autoMode); }
    localStorage.setItem('srtCheckboxConfig', JSON.stringify({
        checkboxTimeCodes: qs('#checkboxTimeCodes').checked,
        checkboxOtherLineBreaks: qs('#checkboxOtherLineBreaks').checked,
        checkboxMultipleSpaces: qs('#checkboxMultipleSpaces').checked,
        skipFileCheck: qs('#skipFileCheck').checked,
        addHeader: qs('#addHeader').checked,
        autoMode: autoMode
    }));    
}

function applySavedConfig() {
    const checkboxConfig = localStorage.getItem('srtCheckboxConfig');
    if(checkboxConfig) {
        const {checkboxTimeCodes, checkboxOtherLineBreaks, checkboxMultipleSpaces,
            autoMode, skipFileCheck, addHeader} = JSON.parse(checkboxConfig);
        qs('#checkboxTimeCodes').checked = checkboxTimeCodes;
        qs('#checkboxOtherLineBreaks').checked = checkboxOtherLineBreaks;
        qs('#checkboxMultipleSpaces').checked = checkboxMultipleSpaces;
        qs('#skipFileCheck').checked = skipFileCheck;
        qs('#addHeader').checked = addHeader;

        const elements = document.getElementsByName('autoMode');
        for(const el of elements) {
            if(el.value === autoMode) { el.checked = true; }
        }
        setDisplayOfBottomButtons(autoMode);
    }
}

function restoreDefaultSettings() {
    if(confirm('Are you sure you want to restore the default settings?')) {
        localStorage.removeItem('srtCheckboxConfig');
        window.location.reload();
    }
}

const onPaste = () => {
    fileName = 'ex_subtitles_' + Date.now() + '.txt';
    const autoMode = getAutoMode();
    if (autoMode) {
        setTimeout(() => {
            autoMode === '2' ? processAndDownloadFile() : processAndCopyToClipboard();
        }, 10);
    }
}

function readUploadedFile(file, utf8=true) {
    return new Promise((res, rej) => {
        if (qs('#skipFileCheck').checked || (file.name.match(/\.(srt|txt)$/) && file.size < 10485760)) {
            const reader = new FileReader();
            reader.readAsText(file, utf8 ? 'UTF-8' : 'CP1251');
            reader.onloadend = e => {
                let result = e.target.result;
                if (utf8 && result.match(/�/)) {
                    res(readUploadedFile(file, false));
                    console.log(file.name + ': the file encoding is not utf-8! Trying CP1251...');
                } else {
                    const fileNameTemp = file.name.replace(/\.(srt|txt)$/, '');
                    const header = qs('#addHeader').checked ? fileNameTemp.replace(/_+/g, '\ ').toUpperCase() + '\n' : '';
                    qs('#textarea1').value = header + result;
                    fileName = fileNameTemp + '_ex_subtitles' + '.txt';
                    console.log('The file ' + file.name + ' was read successfully.');
                    res();
                }
            }
            reader.onerror = event => {
                console.error(reader.error);
                showResult(reader.error, false);
                rej();
                reader.abort();
            };
        } else {
            const warning = `The file ${file.name} was not processed: the extension is not .srt or .txt and/or the file is too big.`;
            console.warn(warning);
            showResult(warning, false);
            rej();
        }
    });
}

const readSingleUploadedFileAndDoAutoAction = file => {
    readUploadedFile(file).then(() => {
        const autoMode = getAutoMode();
        if(autoMode) {
            autoMode==='2' ? processAndDownloadFile() : processAndCopyToClipboard();
        }
    }).catch(() => {});
}

function onFileInputChange(inputDomElement) {
    const files = inputDomElement.files;
    if(files.length === 1) {
        readSingleUploadedFileAndDoAutoAction(files[0]);
    } else if(files.length > 1) {
        processAndDownloadMultipleFiles(files);
    }
}

function dropFile(event) {
    event.preventDefault();
    const dt = event.dataTransfer;
    if(!dt || !dt.files || !dt.files.length) {
        showResult('Error: you can drag-and-drop only .srt or .txt valid files.', false);
    } else if(dt.files.length > 1) {
        processAndDownloadMultipleFiles(dt.files);
    } else {
        readSingleUploadedFileAndDoAutoAction(dt.files[0]);
    }
    dragEffect(false);
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

function closeOrOpenSettings() {
    qs('#checkBoxDiv').classList.toggle('hidden');
    qs('#closeSettings').classList.toggle('hidden');
}

function processAndDownloadMultipleFiles(files) {
    if (confirm('Are you sure to upload multiple files? In this case, they will be processed and resulting files will be transfered to download. Take notice that your browser may ask your permission to download multiple files, and in this case the action will be possible only if you confirm.')) {
        const checkIfLast = index => {
            if (index === files.length - 1) {
                const text = 'The operation with multiple files was completed.';
                console.log(text);
                showResult(`<strong>${text}</strong>`);
                qs('#textarea1').value = '';
            }
        }
        let temp = new Promise(res => { res() });
        for (const[index, file] of [].entries.call(files)) {
            temp = temp.then(() => {
                return readUploadedFile(file).then(() => {
                    processAndDownloadFile();
                    checkIfLast(index);
                }).catch(() => checkIfLast(index));
            });
        }
    }
}

function dragEffect(change = true) {
    qs('#textarea1').style.backgroundColor = change ? '#ccc' : '';
}
