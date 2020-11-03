//var localDrawingHistory = [];
//var remoteDrawingHistory = []; // offload history to client + add identifier user name -> alias (to hide logged in user)
var drawingHistory = []; // combines local and remote to test if this performs better
var roomPlayers = []; // keep track of players in room in preparation of adding ban / kick / mute or remove player drawing from room
var playerClientId;
var playerName;
var playerSessionId;
var enableShowRemoteDrawingHistory = true; // todo when enabled hide remote people drawing but keep history
var isInRoom = false;
var strokeStartFrom = [0, 0];
var strokeEndAt = [0, 0];
var undoCollectionId = 0;
var setUndoCollectionId = true;
var selectedSize = 4;
var selectedColor = "rgb(0,0,0)";
var footer;
var canvas;
var canvasOverlay;
var context;
var contextOverlay;
var canvasOffsetX = 0; // these are for scrolling canvas offsets
var canvasOffsetY = 0;
var inviteLink;
var container = document.getElementById("container");
var canvasWrapper = document.getElementById("canvasWrapper");
var chatRoomOffsetY = 150;
var footerOffsetY = 120;

$(window).on('load',
    function () {
        canvas = createCanvas("canvas");
        context = canvas.getContext("2d");

        canvasOverlay = createCanvas("canvasOverlay");
        contextOverlay = canvasOverlay.getContext("2d");
        //canvasOverlay.style.cursor = "url('images/cursor.png') 18 18, auto";

        canvasOverlay.addEventListener("mousedown", function (e) {
            startDraw(e);

        });
        canvasOverlay.addEventListener("mousemove", function (e) {
            startWhileDraw(e);
        });

        canvasOverlay.addEventListener("mouseup", async function () {
            drawEnd();
        });

        //todo add support for touch + tablet
        //canvasOverlay.addEventListener("pointerdown", async function (e) {
        //    startDraw(e);
        //});
        //canvasOverlay.addEventListener("pointermove", async function (e) {
        //    startWhileDraw(e);
        //});
        //canvasOverlay.addEventListener("pointerup", async function (e) {
        //    drawEnd();
        //});

        //canvasOverlay.addEventListener("touchstart", async function (e) {
        //    startDraw(e);
        //});
        //canvasOverlay.addEventListener("touchmove", async function (e) {
        //    startWhileDraw(e);
        //});
        //canvasOverlay.addEventListener("touchend", async function (e) {
        //    drawEnd();
        //});

        canvasWrapper.appendChild(canvas);
        canvasWrapper.appendChild(canvasOverlay);

        resizeCanvas(canvas);
        resizeCanvas(canvasOverlay);

        footer = createFooter(120);
        container.appendChild(footer);

        resizeChatRoom(chatRoomOffsetY);
        resizeFooter(footerOffsetY);

        //redraw(localDrawingHistory);
        //redraw(remoteDrawingHistory);
        redraw(drawingHistory);
    });

window.addEventListener("resize", function () {
    resizeCanvas(canvas);
    resizeCanvas(canvasOverlay);
    resizeChatRoom(chatRoomOffsetY);
    resizeFooter(footerOffsetY);
    //redraw(localDrawingHistory);
    //redraw(remoteDrawingHistory);
    redraw(drawingHistory);
});

document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.key === 'z') {
        undo();
    }
});

$("#roomInputName").on('keyup', function (e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
        joinRoom();
    }
});

$("#chatRoomInputMessage").focus(function () {
    $(this).val("");
});

$("#chatRoomInputMessage").focusout(function () {
    $(this).attr("placeholder", "Type here to send a message to the room");
});

$("#chatRoomInputMessage").on('keyup', function (e) {
    if ($(this) != undefined && $(this) != null && $(this) !== "") {
        if (e.key === 'Enter' || e.keyCode === 13) {
            var message = document.getElementById('chatRoomInputMessage').value;
            if (message.trim().length) {
                sendChatRoomMessage();
                $(this).val("");
            }
        }
    }
});


$("#roomInputPassword").on('keyup', function (e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
        joinRoom();
    }
});


function createCanvas(id) {

    // console.log(`createCanvas(${id})`);

    var canvas = document.createElement('canvas');
    canvas.style.border = "2px solid #000";
    canvas.setAttribute("id", id);

    return canvas;
}


function startDraw(e) {
    if (isInRoom) {
        if (setUndoCollectionId) {
            undoCollectionId += 1;
        }
        setUndoCollectionId = false;
        if (e.buttons === 1) {
            strokeStartFrom = getMousePosition(canvasOverlay, e);
            canvasOffsetX = Math.floor((canvasOffsetX + (strokeStartFrom[0] - strokeEndAt[0])));
            canvasOffsetY = Math.floor((canvasOffsetY + (strokeStartFrom[1] - strokeEndAt[1])));
            updatePlayerDrawAction();
            strokeEndAt = strokeStartFrom;
        }
    }
}


function startWhileDraw(e) {
    if (isInRoom) {
        strokeStartFrom = getMousePosition(canvasOverlay, e);
        if (e.buttons === 1) {
            updatePlayerDrawAction();
        }
        else if (e.buttons === 4) { // middle button
            canvasOffsetX = Math.floor((canvasOffsetX + (strokeStartFrom[0] - strokeEndAt[0])));
            canvasOffsetY = Math.floor((canvasOffsetY + (strokeStartFrom[1] - strokeEndAt[1])));
            context.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
            //contextOverlay.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height); // no need to clear the overlay as we aren't drawing
            //redraw(remoteDrawingHistory);
            //redraw(localDrawingHistory);
            redraw(drawingHistory);
        }
        strokeEndAt = strokeStartFrom;
    }
}


async function drawEnd() {
    if (isInRoom) {
        setUndoCollectionId = true;
        await connection.invoke("setClearPlayerName", connId);
    }
}



async function updatePlayerDrawAction() {
   var color = rgbColorToByteArray(selectedColor);
    var action = [
        strokeEndAt[0] - canvasOffsetX,
        strokeEndAt[1] - canvasOffsetY,
        strokeStartFrom[0] - canvasOffsetX,
        strokeStartFrom[1] - canvasOffsetY
    ];
    var stroke = { connId: connId, id: undoCollectionId, size: selectedSize, stroke: action, color: color};

    //pass the local offset to stroke
    setStroke(stroke.stroke[0] + canvasOffsetX, stroke.stroke[1] + canvasOffsetY, stroke.stroke[2] + canvasOffsetX, stroke.stroke[3] + canvasOffsetY, selectedSize, selectedColor);
    //localDrawingHistory.push(stroke);
    drawingHistory.push(stroke);
    //redraw(drawingHistory);

    //var bytes = msgpack5({ forceFloat64: true }).encode(stroke);
    //console.log(bytes);
    if (connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke("SetDrawAction", connId, JSON.stringify(stroke));
    }
}

function rgbColorToByteArray(rgb) {
    var color = rgb.substring(4, rgb.length-1)
        .replace(/ /g, '')
        .split(',');
    return [parseInt(color[0]), parseInt(color[1]), parseInt(color[2])];

}

function byteArrayToRGB(byte) {
    return `rgb(${byte[0]},${byte[1]},${byte[2]})`;


}
function setStroke(x1, y1, x2, y2, size, color) {
    context.lineCap = "round";
    context.lineWidth = size;
    context.strokeStyle = color;

    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
}


function drawPlayerName(canvas, context, x, y, name) {
    //console.log("drawPlayerName()");

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "14px Arial";
    context.fillText(name, x, y);
}


async function undo() {
    undoCollectionId = 0;
    drawingHistory.forEach(function (item) {
        if (item.id > undoCollectionId && item.connId === connId) {
            undoCollectionId = item.id;
        }
    });

    drawingHistory = drawingHistory.filter(item => !(item.id === undoCollectionId && item.connId === connId));

    //localDrawingHistory.forEach(function (item) {
    //    if (item.id > undoCollectionId) {
    //        undoCollectionId = item.id;
    //    }
    //});

    //localDrawingHistory = localDrawingHistory.filter(item => !(item.id === undoCollectionId));
    context.clearRect(0, 0, canvas.width, canvas.height);

    //redraw(remoteDrawingHistory);
    //redraw(localDrawingHistory);
    redraw(drawingHistory);

    if (connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke("UndoDrawAction", connId, undoCollectionId);
    }
}



var oldRoomName;
var oldRoomPassword;
async function joinRoom() {

    var roomInputName = document.getElementById("roomInputName").value;
    var roomInputPassword = document.getElementById("roomInputPassword").value;

    if ((roomInputName !== oldRoomName || roomInputPassword !== oldRoomPassword)) {
        oldRoomName = roomInputName;
        oldRoomPassword = roomInputPassword;
        document.getElementById('roomName').innerText = roomInputName;
        window.history.pushState({ page: "another" }, "another page", window.location);

        canvasOffsetX = 0;
        canvasOffsetY = 0;

        var url = window.location.protocol + "//" + document.location.host + document.location.pathname + "?room=" + document.getElementById("roomInputName").value;
        window.history.pushState('page2', 'Title', url);

        //todo we could do this in one call -> return entire room info instead of just player count in room?
        await connection.invoke("UpdateClientRoomOnConnect", connId, roomInputName, roomInputPassword);
    }
}


function redraw(drawHistory) {
    //console.log("redraw()");
    drawHistory.forEach(function (item) {
        //var hexColor = rgbToHex(item.color[0], item.color[1], item.color[2]);
        setStroke(item.stroke[0] + canvasOffsetX, item.stroke[1] + canvasOffsetY, item.stroke[2] + canvasOffsetX, item.stroke[3] + canvasOffsetY, item.size, byteArrayToRGB(item.color));
    });
}

function resizeCanvas(canvas) {
    // console.log("resizeCanvas()");
    //context.canvas.width = 1280;
    //context.canvas.height = 720;

    canvas.width = Math.floor(innerWidth - 440);
    canvas.height = Math.floor((innerHeight - 150));
    context.clearRect(0, 0, canvas.width, canvas.height);
}


function ResetCanvas(context) {

    context.clearRect(0, 0, canvas.width, canvas.height);
}

//note when resizing an element that has been created previously you can notice the resizing on load of page *that's why i opted ro create the elements instead and then resize)
// needs to be done properly when have time
function resizeChatRoom(offsetY) {
    // console.log("resizeChatRoom()");

    const chatRoom = document.getElementById("chatRoom");
    chatRoom.style.height = Math.floor(innerHeight - offsetY) + "px";
}

function createFooter(footerOffsetY) {
    // console.log("createFooter()");

    const footer = document.createElement('div');
    footer.id = "footer";
    footer.innerHTML = 'Website: <a href="https://blog.blushyface.com/" target="_blank">blushyface.com</a> | Feedback & suggestions: <a href="https://blushyface.com/discord/" target="_blank"> Discord</a> | Hosted @ ' + document.location.host;
    footer.style.marginTop = Math.floor(innerHeight - footerOffsetY) + "px";

    return footer;
}

function resizeFooter(offsetY) {
    console.log("resizeFooter()");
    footer.style.marginTop = Math.floor(innerHeight - offsetY) + "px";
}




function createChatRoomMessage(from, message, type) {
    var divFrom = document.createElement('div');
    divFrom.id = "chatMessage";

    if (from !== "") {
        divFrom.innerHTML = from + ": " + message;
    } else {
        divFrom.innerHTML = message;
    }
   

    if (type === 2 || type === 3) {
        divFrom.style.color = "grey";
    }
    var chatRoom = document.getElementById("chatRoomMessages");
    chatRoom.appendChild(divFrom);

    chatRoom.scrollTop = chatRoom.scrollHeight - chatRoom.clientHeight;
}


function saveRoomDrawingAsImage() {
    console.log("saveRoomDrawing()");

    let download = document.createElement('a');
    download.setAttribute('download', `${document.getElementById("roomInputName").value}.png`);
    canvas.toBlob(function (blob) {
        let url = URL.createObjectURL(blob);
        download.setAttribute('href', url);
        download.click();
    });
}


async function saveRoomDrawingAsJson() {
    // console.log("saveRoomDrawingAsFile()");

    if (connection.state === signalR.HubConnectionState.Connected) {
        var room = document.getElementById('roomName').innerText;
        await connection.invoke("SaveDrawingAsJson", connId, room);
    }
}

function getMousePosition(canvas, event) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(event.clientX - rect.left);
    const y = Math.floor(event.clientY - rect.top);

    return [x, y];
}


function setColor(color) {
    selectedColor = color;
}

function setStrokeSize(size) {
    selectedSize = size;
}


function undoDrawAction(connId, strokeId) {
    if (Array.isArray(drawingHistory) && drawingHistory.length) {
        drawingHistory = drawingHistory.filter(item => !(item.connId === connId && item.id === strokeId));
       // remoteDrawingHistory = remoteDrawingHistory.filter(item => !(item.connId === connId && item.id === strokeId));
        context.clearRect(0, 0, canvas.width, canvas.height);

        //redraw(remoteDrawingHistory);
        //redraw(localDrawingHistory);
        redraw(drawingHistory);
    }
}

async function resetRoom() {
    ResetCanvas(context);
    //remoteDrawingHistory = [];
    //localDrawingHistory = [];
    drawingHistory = [];

    if (connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke("ResetRoom", connId);
    }
}

async function sendChatRoomMessage() {
    if (connection.state === signalR.HubConnectionState.Connected) {
        var message = document.getElementById('chatRoomInputMessage').value;
        await connection.invoke("SendMessageToRoom", connId, message);
    }
}

// due to reducing data packet size we are now receiving data as a uInt8 array but we need to convert it.
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
