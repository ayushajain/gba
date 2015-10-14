"use strict";
/*     ___
      / __\___  _ __ ___
     / /  / _ \| '__/ _ \
    / /__| (_) | | |  __/
    \____/\___/|_|  \___|
 */

var Gameboy = {
    "Core":null,
    "Blitter":null,
    "timerID": null,
    "mixerInput":null,
    "defaults":{
        "sound":true,
        "emulatorSpeed": 10,
        "volume":1,
        "skipBoot":true,
        "toggleSmoothScaling":true,
        "toggleDynamicSpeed":false,
        "keyZones":[
            //Use this to control the key mapping:
            //A:
            [88, 74],
            //B:
            [90, 81, 89],
            //Select:
            [16],
            //Start:
            [13],
            //Right:
            [39],
            //Left:
            [37],
            //Up:
            [38],
            //Down:
            [40],
            //R:
            [50],
            //L:
            [49]
        ]
    }
};
window.onload = function () {
    //Initialize Core:
    Gameboy.Core = new GameBoyAdvanceEmulator();
    //Initialize the timer:
    registerTimerHandler();
    //Initialize the graphics:
    registerBlitterHandler();
    //Initialize the audio:
    registerAudioHandler();
    //Register the save handler callbacks:
    registerSaveHandlers();
    //Register the GUI controls.
    registerGUIEvents();
    //Register GUI settings.
    registerGUISettings();
}
function registerTimerHandler() {
    var rate = 4;  //default 4
    Gameboy.Core.setIntervalRate(rate | 0);
    setInterval(function () {
        //Check to see if web view is not hidden, if hidden don't run due to JS timers being inaccurate on page hide:
        if (!document.hidden && !document.msHidden && !document.mozHidden && !document.webkitHidden) {
            if (document.getElementById("play").style.display == "none") {
                Gameboy.Core.play();
            }
            Gameboy.Core.timerCallback(+(new Date()).getTime());
        }
        else {
            Gameboy.Core.pause();
        }
    }, rate | 0);
}
function registerBlitterHandler() {
    Gameboy.Blitter = new GlueCodeGfx();
    Gameboy.Blitter.attachCanvas(document.getElementById("emulator_target"));
    Gameboy.Core.attachGraphicsFrameHandler(function (buffer) {Gameboy.Blitter.copyBuffer(buffer);});
}
function registerAudioHandler() {
    var Mixer = new GlueCodeMixer();
    Gameboy.mixerInput = new GlueCodeMixerInput(Mixer);
    Gameboy.Core.attachAudioHandler(Gameboy.mixerInput);
}
function registerGUIEvents() {
    addEvent("keydown", document, keyDown);
    addEvent("keyup", document, keyUpPreprocess);
    // addEvent("change", document.getElementById("rom_load"), fileLoadROM);
    // addEvent("change", document.getElementById("bios_load"), fileLoadBIOS);
    addEvent("click", document.getElementById("play"), function (e) {
        Gameboy.Core.play();
        this.style.display = "none";
        document.getElementById("pause").style.display = "inline";
        if (e.preventDefault) {
             e.preventDefault();
        }
    });
    addEvent("click", document.getElementById("pause"), function (e) {
        Gameboy.Core.pause();
        this.style.display = "none";
        document.getElementById("play").style.display = "inline";
        if (e.preventDefault) {
             e.preventDefault();
        }
    });
    addEvent("click", document.getElementById("restart"), function (e) {
        Gameboy.Core.restart();
        if (e.preventDefault) {
             e.preventDefault();
        }
    });
    addEvent("click", document.getElementById("sound"), function () {
        if (this.checked) {
            Gameboy.Core.enableAudio();
        }
        else {
            Gameboy.Core.disableAudio();
        }
    });
    addEvent("click", document.getElementById("skip_boot"), function () {
             Gameboy.Core.toggleSkipBootROM(this.checked);
    });
    addEvent("click", document.getElementById("toggleSmoothScaling"), function () {
             if (Gameboy.Blitter) {
                Gameboy.Blitter.setSmoothScaling(this.checked);
             }
    });
    addEvent("click", document.getElementById("toggleDynamicSpeed"), function () {
             Gameboy.Core.toggleDynamicSpeed(this.checked);
    });
    //restructure import methods/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    addEvent("change", document.getElementById("import"), function (e) {
             if (typeof this.files != "undefined") {
                try {
                    if (this.files.length >= 1) {
                        console.log(this.files)
                        writeRedTemporaryText("Reading the local file \"" + this.files[0].name + "\" for importing.");
                        try {
                            //Gecko 1.9.2+ (Standard Method)
                            var binaryHandle = new FileReader();
                            binaryHandle.onload = function () {
                                if (this.readyState == 2) {
                                    writeRedTemporaryText("file imported.");
                                    try {
                                        import_save(this.result);
                                    }
                                    catch (error) {
                                        writeRedTemporaryText(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                                    }
                                }
                                else {
                                    writeRedTemporaryText("importing file, please wait...");
                                }
                            }
                            binaryHandle.readAsBinaryString(this.files[this.files.length - 1]);
                        }
                        catch (error) {
                            //Gecko 1.9.0, 1.9.1 (Non-Standard Method)
                            var romImageString = this.files[this.files.length - 1].getAsBinary();
                            try {
                                import_save(romImageString);
                            }
                            catch (error) {
                                writeRedTemporaryText(error.message + " file: " + error.fileName + " line: " + error.lineNumber);
                            }
                        }
                    }
                    else {
                        writeRedTemporaryText("Incorrect number of files selected for local loading.");
                    }
                }
                catch (error) {
                    writeRedTemporaryText("Could not load in a locally stored ROM file.");
                }
             }
             else {
                writeRedTemporaryText("could not find the handle on the file to open.");
             }
             if (e.preventDefault) {
                e.preventDefault();
             }
    });
    addEvent("click", document.getElementById("export"), refreshStorageListing);
    //addEvent("unload", window, ExportSave);
    Gameboy.Core.attachSpeedHandler(function (speed) {
        var speedDOM = document.getElementById("speed");
        speedDOM.textContent = "Speed: " + speed.toFixed(2) + "%";
    });
    addEvent("change", document.getElementById("volume"), volChangeFunc);
    addEvent("input", document.getElementById("volume"), volChangeFunc);
}
function registerGUISettings() {
    document.getElementById("sound").checked = Gameboy.defaults.sound;
    if (Gameboy.defaults.sound) {
        Gameboy.Core.enableAudio();
    }
    try {
        var volControl = document.getElementById("volume");
        volControl.min = 0;
        volControl.max = 100;
        volControl.step = 1;
        volControl.value = Gameboy.defaults.volume * 100;
    }
    catch (e) {}
    Gameboy.mixerInput.setVolume(Gameboy.defaults.volume);
    document.getElementById("skip_boot").checked = Gameboy.defaults.skipBoot;
    Gameboy.Core.toggleSkipBootROM(Gameboy.defaults.skipBoot);
    document.getElementById("toggleSmoothScaling").checked = Gameboy.defaults.toggleSmoothScaling;
    Gameboy.Blitter.setSmoothScaling(Gameboy.defaults.toggleSmoothScaling);
    document.getElementById("toggleDynamicSpeed").checked = Gameboy.defaults.toggleDynamicSpeed;
    Gameboy.Core.toggleDynamicSpeed(Gameboy.defaults.toggleDynamicSpeed);
}
function resetPlayButton() {
    document.getElementById("pause").style.display = "none";
    document.getElementById("play").style.display = "inline";
}
function stepVolume(delta) {
    var volume = document.getElementById("volume").value / 100;
    volume = Math.min(Math.max(volume + delta, 0), 1);
    Gameboy.mixerInput.setVolume(volume);
    document.getElementById("volume").value = Math.round(volume * 100);
}
function volChangeFunc() {
    Gameboy.mixerInput.setVolume(Math.min(Math.max(parseInt(this.value), 0), 100) * 0.01);
};
function writeRedTemporaryText(textString) {
    if (Gameboy.timerID) {
        clearTimeout(Gameboy.timerID);
    }
    document.getElementById("tempMessage").style.display = "block";
    document.getElementById("tempMessage").textContent = textString;
    Gameboy.timerID = setTimeout(clearTempString, 5000);
}
function clearTempString() {
    document.getElementById("tempMessage").style.display = "none";
}
//Some wrappers and extensions for non-DOM3 browsers:
function addEvent(sEvent, oElement, fListener) {
    try {
        oElement.addEventListener(sEvent, fListener, false);
    }
    catch (error) {
        oElement.attachEvent("on" + sEvent, fListener);    //Pity for IE.
    }
}
function removeEvent(sEvent, oElement, fListener) {
    try {
        oElement.removeEventListener(sEvent, fListener, false);
    }
    catch (error) {
        oElement.detachEvent("on" + sEvent, fListener);    //Pity for IE.
    }
}


/*   __
    / _\ __ ___   _____  ___
    \ \ / _` \ \ / / _ \/ __|
    _\ \ (_| |\ V /  __/\__ \
    \__/\__,_| \_/ \___||___/
 */
//TODO: delete uneccessay import methods
function ImportSaveCallback(name) {
    try {
        var save = findValue("SAVE_" + name);
        if (save != null) {
            writeRedTemporaryText("Loaded save.");
            return base64ToArray(save);    //convert this to array
        }
    }
    catch (error) {
        writeRedTemporaryText("Could not read save: " + error.message);
    }
    return null;
}
//TODO: delete file export methods or restructure
function ExportSave() {
    Gameboy.Core.exportSave();
}
function ExportSaveCallback(name, save) {
    if (name != "") {
        try {
            setValue("SAVE_" + name, arrayToBase64(save));
        }
        catch (error) {
            writeRedTemporaryText("Could not store save: " + error.message);
        }
    }
}
function registerSaveHandlers() {
    Gameboy.Core.attachSaveExportHandler(ExportSaveCallback);
    Gameboy.Core.attachSaveImportHandler(ImportSaveCallback);
}

//TODO: switch from blob to direct binary storage in firebase
function import_save(blobData) {
    blobData = decodeBlob(blobData);
    if (blobData && blobData.blobs) {
        if (blobData.blobs.length > 0) {
            for (var index = 0; index < blobData.blobs.length; ++index) {
                writeRedTemporaryText("Importing blob \"" + blobData.blobs[index].blobID + "\"");
                if (blobData.blobs[index].blobContent) {
                    setValue(blobData.blobs[index].blobID, JSON.parse(blobData.blobs[index].blobContent));
                }
                else if (blobData.blobs[index].blobID) {
                    writeRedTemporaryText("Save file imported had blob \"" + blobData.blobs[index].blobID + "\" with no blob data interpretable.");
                }
                else {
                    writeRedTemporaryText("Blob chunk information missing completely.");
                }
            }
        }
        else {
            writeRedTemporaryText("Could not decode the imported file.");
        }
    }
    else {
        writeRedTemporaryText("Could not decode the imported file.");
    }
}

//TODO: remove uneccessary file conversion methods
function generateBlob(keyName, encodedData) {
    //Append the file format prefix:
    var saveString = "EMULATOR_DATA";
    var consoleID = "GameBoyAdvance";
    //Figure out the length:
    var totalLength = (saveString.length + 4 + (1 + consoleID.length)) + ((1 + keyName.length) + (4 + encodedData.length));
    //Append the total length in bytes:
    saveString += to_little_endian_word(totalLength);
    //Append the console ID text's length:
    saveString += to_byte(consoleID.length);
    //Append the console ID text:
    saveString += consoleID;
    //Append the blob ID:
    saveString += to_byte(keyName.length);
    saveString += keyName;
    //Now append the save data:
    saveString += to_little_endian_word(encodedData.length);
    saveString += encodedData;
    return saveString;
}
function generateMultiBlob(blobPairs) {
    var consoleID = "GameBoyAdvance";
    //Figure out the initial length:
    var totalLength = 13 + 4 + 1 + consoleID.length;
    //Append the console ID text's length:
    var saveString = to_byte(consoleID.length);
    //Append the console ID text:
    saveString += consoleID;
    var keyName = "";
    var encodedData = "";
    //Now append all the blobs:
    for (var index = 0; index < blobPairs.length; ++index) {
        keyName = blobPairs[index][0];
        encodedData = blobPairs[index][1];
        //Append the blob ID:
        saveString += to_byte(keyName.length);
        saveString += keyName;
        //Now append the save data:
        saveString += to_little_endian_word(encodedData.length);
        saveString += encodedData;
        //Update the total length:
        totalLength += 1 + keyName.length + 4 + encodedData.length;
    }
    //Now add the prefix:
    saveString = "EMULATOR_DATA" + to_little_endian_word(totalLength) + saveString;
    return saveString;
}
function decodeBlob(blobData) {
    console.log(blobData)
    /*Format is as follows:
     - 13 byte string "EMULATOR_DATA"
     - 4 byte total size (including these 4 bytes).
     - 1 byte Console type ID length
     - Console type ID text of 8 bit size
     blobs {
     - 1 byte blob ID length
     - blob ID text (Used to say what the data is (SRAM/freeze state/etc...))
     - 4 byte blob length
     - blob length of 32 bit size
     }
     */
    var length = blobData.length;
    var blobProperties = {};
    blobProperties.consoleID = null;
    var blobsCount = -1;
    blobProperties.blobs = [];
    if (length > 17) {
        if (blobData.substring(0, 13) == "EMULATOR_DATA") {
            var length = Math.min(((blobData.charCodeAt(16) & 0xFF) << 24) | ((blobData.charCodeAt(15) & 0xFF) << 16) | ((blobData.charCodeAt(14) & 0xFF) << 8) | (blobData.charCodeAt(13) & 0xFF), length);
            var consoleIDLength = blobData.charCodeAt(17) & 0xFF;
            if (length > 17 + consoleIDLength) {
                blobProperties.consoleID = blobData.substring(18, 18 + consoleIDLength);
                var blobIDLength = 0;
                var blobLength = 0;
                for (var index = 18 + consoleIDLength; index < length;) {
                    blobIDLength = blobData.charCodeAt(index++) & 0xFF;
                    if (index + blobIDLength < length) {
                        blobProperties.blobs[++blobsCount] = {};
                        blobProperties.blobs[blobsCount].blobID = blobData.substring(index, index + blobIDLength);
                        index += blobIDLength;
                        if (index + 4 < length) {
                            blobLength = ((blobData.charCodeAt(index + 3) & 0xFF) << 24) | ((blobData.charCodeAt(index + 2) & 0xFF) << 16) | ((blobData.charCodeAt(index + 1) & 0xFF) << 8) | (blobData.charCodeAt(index) & 0xFF);
                            index += 4;
                            if (index + blobLength <= length) {
                                blobProperties.blobs[blobsCount].blobContent =  blobData.substring(index, index + blobLength);
                                index += blobLength;
                            }
                            else {
                                writeRedTemporaryText("Blob length check failed, blob determined to be incomplete.");
                                break;
                            }
                        }
                        else {
                            writeRedTemporaryText("Blob was incomplete, bailing out.");
                            break;
                        }
                    }
                    else {
                        writeRedTemporaryText("Blob was incomplete, bailing out.");
                        break;
                    }
                }
            }
        }
    }
    return blobProperties;
}

//TODO: switch to binary storage (not base 64 encode)
function refreshStorageListing() {
    ExportSave();
    var keys = getLocalStorageKeys();
    var blobPairs = [];
    for (var index = 0; index < keys.length; ++index) {
        blobPairs[index] = [keys[index], JSON.stringify(findValue(keys[index]))];
    }

    var file =  base64(generateMultiBlob(blobPairs));
    ref.set(file)
    console.log("exported")

    //"data:application/octet-stream;base64," +
    //push save data to aws //////////////////////////////////////////////////////////////////////////////////////////////////
    //this.download = "gameboy_advance_saves_" + ((new Date()).getTime()) + ".export";

}
function checkStorageLength() {
    try {
        return window.localStorage.length;
    }
    catch (error) {
        //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
        return window.globalStorage[location.hostname].length;
    }
}
function getLocalStorageKeys() {
    var storageLength = checkStorageLength();
    var keysFound = [];
    var index = 0;
    var nextKey = null;
    while (index < storageLength) {
        nextKey = findKey(index++);
        if (nextKey !== null && nextKey.length > 0) {
            if (nextKey.substring(0,5) == "SAVE_") {
                keysFound.push(nextKey);
            }
        }
        else {
            break;
        }
    }
    return keysFound;
}
function findKey(keyNum) {
    try {
        //return window.localStorage.key(keyNum);
    }
    catch (error) {
        //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
        //return window.globalStorage[location.hostname].key(keyNum);
    }
    return null;
}
function to_little_endian_word(str) {
    return to_little_endian_hword(str) + to_little_endian_hword(str >> 16);
}
function to_little_endian_hword(str) {
    return to_byte(str) + to_byte(str >> 8);
}
function to_byte(str) {
    return String.fromCharCode(str & 0xFF);
}
//Wrapper for localStorage getItem, so that data can be retrieved in various types.
function findValue(key) {
    try {
        if (window.localStorage.getItem(key) != null) {
            return JSON.parse(window.localStorage.getItem(key));
        }
    }
    catch (error) {
        //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
        if (window.globalStorage[location.hostname].getItem(key) != null) {
            return JSON.parse(window.globalStorage[location.hostname].getItem(key));
        }
    }
    return null;
}
//Wrapper for localStorage setItem, so that data can be set in various types.
function setValue(key, value) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    }
    catch (error) {
        //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
        window.globalStorage[location.hostname].setItem(key, JSON.stringify(value));
    }
}
//Wrapper for localStorage removeItem, so that data can be set in various types.
function deleteValue(key) {
    try {
        window.localStorage.removeItem(key);
    }
    catch (error) {
        //An older Gecko 1.8.1/1.9.0 method of storage (Deprecated due to the obvious security hole):
        window.globalStorage[location.hostname].removeItem(key);
    }
}

/*     __    ___
      /__\  /___\/\/\
     / \// //  //    \
    / _  \/ \_// /\/\ \
    \/ \_/\___/\/    \/
 */

function attachBIOS(BIOS) {
    resetPlayButton();
    try {
        Gameboy.Core.attachBIOS(new Uint8Array(BIOS));
    }
    catch (error) {
        Gameboy.Core.attachBIOS(BIOS);
    }
}
function attachROM(ROM) {
    resetPlayButton();
    try {
        Gameboy.Core.attachROM(new Uint8Array(ROM));
    }
    catch (error) {
        Gameboy.Core.attachROM(ROM);
    }
}
function fileLoadShimCode(files, ROMHandler, isBIOS) {


    if (typeof files != "undefined") {
        if (files.length >= 1) {
            //Gecko 1.9.2+ (Standard Method)

            try {
                var binaryHandle = new FileReader();
                binaryHandle.onloadend = function () {
                    ROMHandler(this.result);
                }
                if(isBIOS){
                    downloadFile("gba_bios.bin", function(){
                        ROMHandler(this.response)
                    })

                }else{
                    downloadFile("1986 - Pokemon - Emerald Version (UE).gba", function(){
                        ROMHandler(this.response)
                    })
                    //binaryHandle.readAsArrayBuffer(files[files.length - 1]);
                }
            }
            catch (error) {
                try {
                    var result = files[files.length - 1].getAsBinary();
                    var resultConverted = [];
                    for (var index = 0; index < result.length; ++index) {
                        resultConverted[index] = result.charCodeAt(index) & 0xFF;
                    }
                    ROMHandler(resultConverted);
                }
                catch (error) {
                    alert("Could not load the processed ROM file!");
                }
            }
        }
    }
}
function fileLoadBIOS() {
    fileLoadShimCode("BIOS", attachBIOS, true);
}

function fileLoadROM() {
    fileLoadShimCode("asdsad", attachROM, false);
}
function downloadFile(fileName, registrationHandler) {
    var ajax = new XMLHttpRequest();
    ajax.onload = registrationHandler;
    ajax.open("GET", "./" + fileName, true);
    ajax.responseType = "arraybuffer";
    ajax.overrideMimeType("text/plain; charset=x-user-defined");
    ajax.send(null);
}
function processDownload(parentObj, attachHandler) {
    try {
        attachHandler(new Uint8Array(parentObj.response));
    }
    catch (error) {
        var data = parentObj.responseText;
        var length = data.length;
        var dataArray = [];
        for (var index = 0; index < length; index++) {
            dataArray[index] = data.charCodeAt(index) & 0xFF;
        }
        attachHandler(dataArray);
    }
}

function blobToFile(theBlob, fileName){
    //A Blob() is almost a File() - it's just missing the two properties below which we will add
    theBlob.lastModifiedDate = new Date();
    theBlob.name = fileName;
    return theBlob;
}

/* ___                 _     _
  / _ \_ __ __ _ _ __ | |__ (_) ___ ___
 / /_\/ '__/ _` | '_ \| '_ \| |/ __/ __|
/ /_\\| | | (_| | |_) | | | | | (__\__ \
\____/|_|  \__,_| .__/|_| |_|_|\___|___/
      |_|
 */
function GlueCodeGfx() {
    this.didRAF = false;                      //Set when rAF has been used.
    this.graphicsFound = 0;                   //Do we have graphics output sink found yet?
    this.offscreenWidth = 240;                //Width of the GBA screen.
    this.offscreenHeight = 160;               //Height of the GBA screen.
    this.doSmoothing = true;
    //Cache some frame buffer lengths:
    var offscreenRGBCount = this.offscreenWidth * this.offscreenHeight * 3;
    this.swizzledFrameFree = [getUint8Array(offscreenRGBCount), getUint8Array(offscreenRGBCount)];
    this.swizzledFrameReady = [];
    this.initializeGraphicsBuffer();          //Pre-set the swizzled buffer for first frame.
}
GlueCodeGfx.prototype.attachCanvas = function (canvas) {
    this.canvas = canvas;
    this.graphicsFound = this.initializeCanvasTarget();
    this.setSmoothScaling(this.doSmoothing);
}
GlueCodeGfx.prototype.detachCanvas = function () {
    this.canvas = null;
}
GlueCodeGfx.prototype.recomputeDimension = function () {
    //Cache some dimension info:
    this.canvasLastWidth = this.canvas.clientWidth;
    this.canvasLastHeight = this.canvas.clientHeight;
    if (window.mozRequestAnimationFrame || (navigator.userAgent.toLowerCase().indexOf("gecko") != -1 && navigator.userAgent.toLowerCase().indexOf("like gecko") == -1)) {    //Sniff out firefox for selecting this path.
        //Set target as unscaled:
        this.onscreenWidth = this.canvas.width = this.offscreenWidth;
        this.onscreenHeight = this.canvas.height = this.offscreenHeight;
    }
    else {
        //Set target canvas as scaled:
        this.onscreenWidth = this.canvas.width = this.canvas.clientWidth;
        this.onscreenHeight = this.canvas.height = this.canvas.clientHeight;
    }
}
GlueCodeGfx.prototype.initializeCanvasTarget = function () {
    try {
        //Obtain dimensional information:
        this.recomputeDimension();
        //Get handles on the canvases:
        this.canvasOffscreen = document.createElement("canvas");
        this.canvasOffscreen.width = this.offscreenWidth;
        this.canvasOffscreen.height = this.offscreenHeight;
        this.drawContextOffscreen = this.canvasOffscreen.getContext("2d");
        this.drawContextOnscreen = this.canvas.getContext("2d");
        //Get a CanvasPixelArray buffer:
        this.canvasBuffer = this.getBuffer(this.drawContextOffscreen, this.offscreenWidth, this.offscreenHeight);
        //Initialize Alpha Channel:
        this.initializeAlpha(this.canvasBuffer.data);
        //Draw swizzled buffer out as a test:
        this.requestDraw();
        this.checkRAF();
        //Success:
        return true;
    }
    catch (error) {
        //Failure:
        return false;
    }
}
GlueCodeGfx.prototype.setSmoothScaling = function (doSmoothing) {
    this.doSmoothing = doSmoothing;
    if (this.graphicsFound) {
        this.canvas.setAttribute("style", (this.canvas.getAttribute("style") || "") + "; image-rendering: " + ((doSmoothing) ? "auto" : "-webkit-optimize-contrast") + ";" +
            "image-rendering: " + ((doSmoothing) ? "optimizeQuality" : "-o-crisp-edges") + ";" +
            "image-rendering: " + ((doSmoothing) ? "optimizeQuality" : "-moz-crisp-edges") + ";" +
            "-ms-interpolation-mode: " + ((doSmoothing) ? "bicubic" : "nearest-neighbor") + ";");
        this.drawContextOnscreen.mozImageSmoothingEnabled = doSmoothing;
        this.drawContextOnscreen.webkitImageSmoothingEnabled = doSmoothing;
        this.drawContextOnscreen.imageSmoothingEnabled = doSmoothing;
    }
}
GlueCodeGfx.prototype.initializeAlpha = function (canvasData) {
    var length = canvasData.length;
    for (var indexGFXIterate = 3; indexGFXIterate < length; indexGFXIterate += 4) {
        canvasData[indexGFXIterate] = 0xFF;
    }
}
GlueCodeGfx.prototype.getBuffer = function (canvasContext, width, height) {
    //Get a CanvasPixelArray buffer:
    var buffer = null;
    try {
        buffer = this.drawContextOffscreen.createImageData(width, height);
    }
    catch (error) {
        buffer = this.drawContextOffscreen.getImageData(0, 0, width, height);
    }
    return buffer;
}
GlueCodeGfx.prototype.copyBuffer = function (buffer) {
    if (this.graphicsFound) {
        if (this.swizzledFrameFree.length == 0) {
            if (this.didRAF) {
                this.requestDrawSingle();
            }
            else {
                this.swizzledFrameFree.push(this.swizzledFrameReady.shift());
            }
        }
        var swizzledFrame = this.swizzledFrameFree.shift();
        var length = swizzledFrame.length;
        if (buffer.buffer) {
            swizzledFrame.set(buffer);
        }
        else {
            for (var bufferIndex = 0; bufferIndex < length; ++bufferIndex) {
                swizzledFrame[bufferIndex] = buffer[bufferIndex];
            }
        }
        this.swizzledFrameReady.push(swizzledFrame);
        if (!window.requestAnimationFrame) {
            this.requestDraw();
        }
        else if (!this.didRAF) {
            //Prime RAF draw:
            var parentObj = this;
            window.requestAnimationFrame(function () {
                if (parentObj.canvas) {
                    parentObj.requestRAFDraw();
                }
            });
        }
    }
}
GlueCodeGfx.prototype.requestRAFDraw = function () {
    this.didRAF = true;
    this.requestDraw();
}
GlueCodeGfx.prototype.requestDrawSingle = function () {
    if (this.swizzledFrameReady.length > 0) {
        var canvasData = this.canvasBuffer.data;
        var bufferIndex = 0;
        var swizzledFrame = this.swizzledFrameReady.shift();
        var length = canvasData.length;
        for (var canvasIndex = 0; canvasIndex < length; ++canvasIndex) {
            canvasData[canvasIndex++] = swizzledFrame[bufferIndex++];
            canvasData[canvasIndex++] = swizzledFrame[bufferIndex++];
            canvasData[canvasIndex++] = swizzledFrame[bufferIndex++];
        }
        this.swizzledFrameFree.push(swizzledFrame);
        this.graphicsBlit();
    }
}
GlueCodeGfx.prototype.requestDraw = function () {
    this.requestDrawSingle();
    if (this.didRAF) {
        var parentObj = this;
        window.requestAnimationFrame(function () {
            if (parentObj.canvas) {
                parentObj.requestDraw();
            }
        });
    }
}
GlueCodeGfx.prototype.graphicsBlit = function () {
    if (this.canvasLastWidth != this.canvas.clientWidth || this.canvasLastHeight != this.canvas.clientHeight) {
        this.recomputeDimension();
        this.setSmoothScaling(this.doSmoothing);
    }
    if (this.offscreenWidth == this.onscreenWidth && this.offscreenHeight == this.onscreenHeight) {
        //Canvas does not need to scale, draw directly to final:
        this.drawContextOnscreen.putImageData(this.canvasBuffer, 0, 0);
    }
    else {
        //Canvas needs to scale, draw to offscreen first:
        this.drawContextOffscreen.putImageData(this.canvasBuffer, 0, 0);
        //Scale offscreen canvas image onto the final:
        this.drawContextOnscreen.drawImage(this.canvasOffscreen, 0, 0, this.onscreenWidth, this.onscreenHeight);
    }
}
GlueCodeGfx.prototype.initializeGraphicsBuffer = function () {
    //Initialize the first frame to a white screen:
    var swizzledFrame = this.swizzledFrameFree.shift();
    var length = swizzledFrame.length;
    for (var bufferIndex = 0; bufferIndex < length; ++bufferIndex) {
        swizzledFrame[bufferIndex] = 0xF8;
    }
    this.swizzledFrameReady.push(swizzledFrame);
}
GlueCodeGfx.prototype.checkRAF = function () {
    window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
}

/*    __                              _
      \ \  ___  _   _ _ __   __ _  __| |
       \ \/ _ \| | | | '_ \ / _` |/ _` |
    /\_/ / (_) | |_| | |_) | (_| | (_| |
    \___/ \___/ \__, | .__/ \__,_|\__,_|
                |___/|_|
 */
function keyDown(e) {
    var keyCode = e.keyCode | 0;
    for (var keyMapIndex = 0; (keyMapIndex | 0) < 10; keyMapIndex = ((keyMapIndex | 0) + 1) | 0) {
        var keysMapped = Gameboy.defaults.keyZones[keyMapIndex | 0];
        var keysTotal = keysMapped.length | 0;
        for (var matchingIndex = 0; (matchingIndex | 0) < (keysTotal | 0); matchingIndex = ((matchingIndex | 0) + 1) | 0) {
            if ((keysMapped[matchingIndex | 0] | 0) == (keyCode | 0)) {
                Gameboy.Core.keyDown(keyMapIndex | 0);
                if (e.preventDefault) {
                    e.preventDefault();
                }
            }
        }
    }
}
function keyUp(keyCode) {
    keyCode = keyCode | 0;
    for (var keyMapIndex = 0; (keyMapIndex | 0) < 10; keyMapIndex = ((keyMapIndex | 0) + 1) | 0) {
        var keysMapped = Gameboy.defaults.keyZones[keyMapIndex | 0];
        var keysTotal = keysMapped.length | 0;
        for (var matchingIndex = 0; (matchingIndex | 0) < (keysTotal | 0); matchingIndex = ((matchingIndex | 0) + 1) | 0) {
            if ((keysMapped[matchingIndex | 0] | 0) == (keyCode | 0)) {
                Gameboy.Core.keyUp(keyMapIndex | 0);
            }
        }
    }
}
function keyUpPreprocess(e) {
    var keyCode = e.keyCode | 0;
    switch (keyCode | 0) {
        case 68:
            stepVolume(-0.04);
            break;
        case 82:
            stepVolume(0.04);
            break;
        case 51:
            Gameboy.Core.incrementSpeed(0.10);
            break;
        case 52:
            Gameboy.Core.incrementSpeed(-0.10);
            break;
        default:
            //Control keys / other
            keyUp(keyCode);
    }
}

/*     _             _ _
      /_\  _   _  __| (_) ___
     //_\\| | | |/ _` | |/ _ \
    /  _  \ |_| | (_| | | (_) \
    \_/ \_/\__,_|\__,_|_|\___/
 */

function GlueCodeMixer() {
    var parentObj = this;
    this.audio = new XAudioServer(2, this.sampleRate, 0, this.bufferAmount, null, function () {
        //Web Audio API Should fire this, moz audio api will NOT:
        if (parentObj.heartBeat) {
            clearInterval(parentObj.heartBeat);
            parentObj.heartBeat = null;
        }
        parentObj.checkAudio();
     }, 1, function () {
        //Disable audio in the callback here:
        parentObj.disableAudio();
    });
    this.outputUnits = [];
    this.outputUnitsValid = [];
    this.heartBeat = setInterval(function(){
        //Moz Audio API needs this:
        parentObj.checkAudio();
    }, 16);
    this.initializeBuffer();
}
GlueCodeMixer.prototype.sampleRate = 44100;
GlueCodeMixer.prototype.bufferAmount = 44100;
GlueCodeMixer.prototype.channelCount = 2;
GlueCodeMixer.prototype.initializeBuffer = function () {
    this.buffer = new AudioSimpleBuffer(this.channelCount,
                                         this.bufferAmount);
}
GlueCodeMixer.prototype.appendInput = function (inUnit) {
    if (this.audio) {
        for (var index = 0; index < this.outputUnits.length; index++) {
            if (!this.outputUnits[index]) {
                break;
            }
        }
        this.outputUnits[index] = inUnit;
        this.outputUnitsValid.push(inUnit);
        inUnit.registerStackPosition(index);
    }
    else if (typeof inUnit.errorCallback == "function") {
        inUnit.errorCallback();
    }
}
GlueCodeMixer.prototype.unregister = function (stackPosition) {
    this.outputUnits[stackPosition] = null;
    this.outputUnitsValid = [];
    for (var index = 0, length = this.outputUnits.length; index < length; ++index) {
        if (this.outputUnits[index]) {
            this.outputUnitsValid.push(this.outputUnits);
        }
    }
}
GlueCodeMixer.prototype.checkAudio = function () {
    if (this.audio) {
        var inputCount = this.outputUnitsValid.length;
        for (var inputIndex = 0, output = 0; inputIndex < inputCount; ++inputIndex) {
            this.outputUnitsValid[inputIndex].prepareShift();
        }
        for (var count = 0, requested = this.findLowestBufferCount(); count < requested; ++count) {
            for (var inputIndex = 0, output = 0; inputIndex < inputCount; ++inputIndex) {
                output += this.outputUnitsValid[inputIndex].shift();
            }
            this.buffer.push(output);
        }
        var bufferLength = this.buffer.count();
        this.audio.writeAudioNoCallback(this.buffer.buffer, bufferLength);
        this.buffer.reset();
    }
}
GlueCodeMixer.prototype.findLowestBufferCount = function () {
    var count = 0;
    for (var inputIndex = 0, inputCount = this.outputUnitsValid.length; inputIndex < inputCount; ++inputIndex) {
        var tempCount = this.outputUnitsValid[inputIndex].buffer.remainingBuffer();
        if (tempCount > 0) {
            if (count > 0) {
                count = Math.min(count, tempCount);
            }
            else {
                count = tempCount;
            }
        }
    }
    return Math.min(count, this.channelCount * this.bufferAmount);
}
GlueCodeMixer.prototype.disableAudio = function () {
    this.audio = null;
}
function GlueCodeMixerInput(mixer) {
    this.mixer = mixer;
    this.volume = 1;
}
GlueCodeMixerInput.prototype.initialize = function (channelCount, sampleRate, bufferAmount, errorCallback) {
    this.channelCount = channelCount;
    this.sampleRate = sampleRate;
    this.bufferAmount = bufferAmount;
    this.errorCallback = errorCallback;
    var oldBuffer = this.buffer;
    this.buffer = new AudioBufferWrapper(this.channelCount,
                                         this.mixer.channelCount,
                                         this.bufferAmount,
                                         this.sampleRate,
                                         this.mixer.sampleRate);
    if (oldBuffer) {
        //If re-using same mixer input node, copy old buffer contents into the new buffer:
        this.buffer.copyOld(oldBuffer);
    }
}
GlueCodeMixerInput.prototype.register = function () {
    this.mixer.appendInput(this);
}
GlueCodeMixerInput.prototype.setVolume = function (volume) {
    this.volume = Math.min(Math.max(volume, 0), 1);
}
GlueCodeMixerInput.prototype.prepareShift = function () {
    this.buffer.resampleRefill();
}
GlueCodeMixerInput.prototype.shift = function () {
    return this.buffer.shift() * this.volume;
}
GlueCodeMixerInput.prototype.push = function (buffer, upTo) {
    this.buffer.push(buffer, upTo);
    this.mixer.checkAudio();
}
GlueCodeMixerInput.prototype.remainingBuffer = function () {
    return this.buffer.remainingBuffer() + (Math.floor((this.mixer.audio.remainingBuffer() * this.sampleRate / this.mixer.sampleRate) / this.mixer.channelCount) * this.mixer.channelCount);
}
GlueCodeMixerInput.prototype.registerStackPosition = function (stackPosition) {
    this.stackPosition = stackPosition;
}
GlueCodeMixerInput.prototype.unregister = function () {
    this.mixer.unregister(this.stackPosition);
}
GlueCodeMixerInput.prototype.setBufferSpace = function (bufferAmount) {
    this.buffer.setBufferSpace(bufferAmount);
}
function AudioBufferWrapper(channelCount,
                            mixerChannelCount,
                            bufferAmount,
                            sampleRate,
                            mixerSampleRate) {
    this.channelCount = channelCount;
    this.mixerChannelCount = mixerChannelCount;
    this.bufferAmount = bufferAmount;
    this.sampleRate = sampleRate;
    this.mixerSampleRate = mixerSampleRate;
    this.initialize();
}
AudioBufferWrapper.prototype.initialize = function () {
    this.inBufferSize = this.bufferAmount * this.mixerChannelCount;
    this.inBuffer = getFloat32Array(this.inBufferSize);
    this.outBufferSize = (Math.ceil(this.inBufferSize * this.mixerSampleRate / this.sampleRate / this.mixerChannelCount) * this.mixerChannelCount) + this.mixerChannelCount;
    this.outBuffer = getFloat32Array(this.outBufferSize);
    this.resampler = new Resampler(this.sampleRate, this.mixerSampleRate, this.mixerChannelCount, this.outBufferSize, true);
    this.inputOffset = 0;
    this.resampleBufferStart = 0;
    this.resampleBufferEnd = 0;
}
AudioBufferWrapper.prototype.copyOld = function (oldBuffer) {
    this.resampleRefill();
    while (oldBuffer.resampleBufferStart != oldBuffer.resampleBufferEnd) {
        this.outBuffer[this.resampleBufferEnd++] = oldBuffer.outBuffer[oldBuffer.resampleBufferStart++];
        if (this.resampleBufferEnd == this.outBufferSize) {
            this.resampleBufferEnd = 0;
        }
        if (this.resampleBufferStart == this.resampleBufferEnd) {
            this.resampleBufferStart += this.mixerChannelCount;
            if (this.resampleBufferStart == this.outBufferSize) {
                this.resampleBufferStart = 0;
            }
        }
        if (oldBuffer.resampleBufferStart == oldBuffer.outBufferSize) {
            oldBuffer.resampleBufferStart = 0;
        }
    }
}
AudioBufferWrapper.prototype.push = function (buffer, upTo) {
    var length  = Math.min(buffer.length, upTo);
    if (this.channelCount < this.mixerChannelCount) {
        for (var bufferCounter = 0; bufferCounter < length && this.inputOffset < this.inBufferSize;) {
            for (var index = this.channelCount; index < this.mixerChannelCount; ++index) {
                this.inBuffer[this.inputOffset++] = buffer[bufferCounter];
            }
            for (index = 0; index < this.channelCount && bufferCounter < length; ++index) {
                this.inBuffer[this.inputOffset++] = buffer[bufferCounter++];
            }
        }
    }
    else if (this.channelCount == this.mixerChannelCount) {
        for (var bufferCounter = 0; bufferCounter < length && this.inputOffset < this.inBufferSize;) {
            this.inBuffer[this.inputOffset++] = buffer[bufferCounter++];
        }
    }
    else {
        for (var bufferCounter = 0; bufferCounter < length && this.inputOffset < this.inBufferSize;) {
            for (index = 0; index < this.mixerChannelCount && bufferCounter < length; ++index) {
                this.inBuffer[this.inputOffset++] = buffer[bufferCounter++];
            }
            bufferCounter += this.channelCount - this.mixerChannelCount;
        }
    }
}
AudioBufferWrapper.prototype.shift = function () {
    var output = 0;
    if (this.resampleBufferStart != this.resampleBufferEnd) {
        output = this.outBuffer[this.resampleBufferStart++];
        if (this.resampleBufferStart == this.outBufferSize) {
            this.resampleBufferStart = 0;
        }
    }
    return output;
}
AudioBufferWrapper.prototype.resampleRefill = function () {
    if (this.inputOffset > 0) {
        //Resample a chunk of audio:
        var resampleLength = this.resampler.resampler(this.inBuffer, this.inputOffset);
        var resampledResult = this.resampler.outputBuffer;
        for (var index2 = 0; index2 < resampleLength;) {
            this.outBuffer[this.resampleBufferEnd++] = resampledResult[index2++];
            if (this.resampleBufferEnd == this.outBufferSize) {
                this.resampleBufferEnd = 0;
            }
            if (this.resampleBufferStart == this.resampleBufferEnd) {
                this.resampleBufferStart += this.mixerChannelCount;
                if (this.resampleBufferStart == this.outBufferSize) {
                    this.resampleBufferStart = 0;
                }
            }
        }
        this.inputOffset = 0;
    }
}
AudioBufferWrapper.prototype.setBufferSpace = function (bufferAmount) {
    while (this.inputOffset < bufferAmount && this.inputOffset < this.inBufferSize) {
        this.inBuffer[this.inputOffset++] = 0;
    }
}
AudioBufferWrapper.prototype.remainingBuffer = function () {
    return (Math.floor((this.resampledSamplesLeft() * this.resampler.ratioWeight) / this.mixerChannelCount) * this.mixerChannelCount) + this.inputOffset;
}
AudioBufferWrapper.prototype.resampledSamplesLeft = function () {
    return ((this.resampleBufferStart <= this.resampleBufferEnd) ? 0 : this.outBufferSize) + this.resampleBufferEnd - this.resampleBufferStart;
}
function AudioSimpleBuffer(channelCount, bufferAmount) {
    this.channelCount = channelCount;
    this.bufferAmount = bufferAmount;
    this.outBufferSize = this.channelCount * this.bufferAmount;
    this.stackLength = 0;
    this.buffer = getFloat32Array(this.outBufferSize);
}
AudioSimpleBuffer.prototype.push = function (data) {
    if (this.stackLength < this.outBufferSize) {
        this.buffer[this.stackLength++] = data;
    }
}
AudioSimpleBuffer.prototype.count = function () {
    return this.stackLength;
}
AudioSimpleBuffer.prototype.reset = function () {
    this.stackLength = 0;
}
