# QR-PNG [![NPM](https://nodei.co/npm/qrpng.png)](https://nodei.co/npm/qrpng/)

This is a very simple QR-Code generator that outputs a PNG-Buffer. It's written in pure JavaScript.

## Usage

```
    import qrcode from 'qrpng;

    const uint8array = qrcode('my text for the code');
    document.getElementById('qrimg').src = 'image/png;base64,' + btoa(String.fromCharCode.apply(null, uint8array));
```

It has only one function:

    function generate(content[, scale])

scale is the pixel extent of a QR-Code data pixel.

## Install

    npm install qrpng

## License

This uses "QRCode for JavaScript" which Kazuhiko Arase thankfully MIT licensed. This modules is also licensed under MIT license.
