var ref = new Firebase("https://gba.firebaseio.com/");


$("form").on('submit', function(evt) {
    evt.preventDefault();
});

setTimeout(function() {
    console.log(Gameboy.Core)
    //$("#control_panel").hide()
    var cw = $('#emulator_target').width() * 160/240;
    $('#emulator_target').css({'height':cw+'px'});
    downloadFile("1986 - Pokemon - Emerald Version (UE).gba", function() {
        console.log(this.response)
        fileLoadROM(this.response);
    });
    fileLoadBIOS();
    Gameboy.Core.setSpeed(1);
    setTimeout(function() {
        $("#play").trigger("click");
        var cw = $('#emulator_target').width() * 160/240;
        $('#emulator_target').css({'height':cw+'px'});

    }, 1000);
}, 1000);


function togglleRomSelector(){
    $('#rominput').click();
}

$(document).on('change','#rominput',function(){
    var input = document.getElementById('rominput');
    console.log("breh")
    if(input.files[0]){
        var fileReader = new FileReader();
        fileReader.onload = function() {
            fileLoadROM(this.result);
            Gameboy.Core.restart();
            setTimeout(function() {
                $("#play").trigger("click");
                var cw = $('#emulator_target').width() * 160/240;
                $('#emulator_target').css({'height':cw+'px'});

            }, 1000);
        };
        fileReader.readAsArrayBuffer(input.files[0]);
    }

});

$(window).resize(function(){
    var cw = $('#emulator_target').width() * 160/240;
    $('#emulator_target').css({'height':cw+'px'});
})


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

    var blob = new Blob(byteArrays, {
        type: contentType
    });
    return blob;
}
