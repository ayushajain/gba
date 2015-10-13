var ref = new Firebase("https://gba.firebaseio.com/");

ref.once("value", function(snapshot){
    //console.log(atob(snapshot.val()))
});

$("form").on('submit',function(evt){
    evt.preventDefault();
});

//update firebase on close
window.onbeforeunload = function(){
    console.log("wait")
    setTimeout(function(){
        console.log(12332)
    }, 5000)
    refreshStorageListing();
}

setTimeout(function(){
    fileLoadROM();
    fileLoadBIOS();
    IodineGUI.Iodine.setSpeed(1.2)
    console.log(IodineGUI.Iodine);

}, 1000);


function b64toBlob(b64Data, contentType, sliceSize) {
    contentType = contentType || '';
    sliceSize = sliceSize || 512;

    var byteCharacters = atob(b64Data);
    var byteArrays = [];

    for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        var slice = byteCharacters.slice(offset, offset + sliceSize);

        var byteNumbers = new Array(slice.length);
        for (var i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        var byteArray = new Uint8Array(byteNumbers);

        byteArrays.push(byteArray);
    }

    var blob = new Blob(byteArrays, {type: contentType});
    return blob;
}
