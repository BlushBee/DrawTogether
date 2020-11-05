function getMousePosition(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(event.clientX - rect.left);
    const y = Math.floor(event.clientY - rect.top);

    return [x, y];
}

function convertUint8ArrayToJson(uInt8Array) {
    // console.log("convertUint8ArrayToJson()");

    var obj = msgpack5({ forceFloat64: true }).decode(uInt8Array);
    var json = JSON.stringify(obj);

    return json;
}

function convertUint8ArrayToObject(uInt8Array) {
    // console.log("convertUint8ArrayToObject()");

    return msgpack5({ forceFloat64: true }).decode(uInt8Array);
}