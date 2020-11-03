


const connection = new signalR.HubConnectionBuilder()
    .withUrl("/drawhub")
    .withHubProtocol(new signalR.protocols.msgpack.MessagePackHubProtocol())
    .configureLogging(signalR.LogLevel.Information)
    .withAutomaticReconnect([0, 0, 10000])
    .build();

var connId;
async function start() {
    try {
        await connection.start();
        console.assert(connection.state === signalR.HubConnectionState.Connected);

        try {

            await connection.invoke('getConnectionId')
                .then(function (id) {
                    connId = id;
                });

            // console.log(connId);
            // await connection.invoke("PingPong");

            const params = new URLSearchParams(window.location.search);

            const invite = params.get('invite');
            if (invite != undefined) {
                inviteLink = invite;
                await connection.invoke("JoinRoomWithInviteUrl", connId, inviteLink);
            }
            else {
                const room = params.get('room');
                if (room != undefined) {
                    document.getElementById("roomInputName").value = room;
                }
                joinRoom();
            }
        } catch (err) {
            console.error(err);
        }
        console.log("Connected.");
    } catch (err) {
        console.assert(connection.state === signalR.HubConnectionState.Disconnected);
        console.log(err);
        setTimeout(() => start(), 5000);
    }
};

connection.onreconnecting(async error => {
    console.assert(connection.state === signalR.HubConnectionState.Reconnecting);
    console.log(`Connection lost due to error "${error}". Reconnecting.`);
});

connection.onclose(async error => {
    console.assert(connection.state === window.signalR.HubConnectionState.Disconnected);
    console.log(`Connection closed due to error "${error}". Try refreshing this page to restart the connection.`);
});

connection.on("pingpong", async (message) => {
    console.log(`"pingpong: ${convertUint8ArrayToJson(message)}"`);
});

connection.on("undoDrawAction", async (stroke) => {
    var obj = convertUint8ArrayToObject(stroke);

    console.log("undoDrawAction() " + obj);
    await undoDrawAction(obj[0], obj[1]);
});

connection.on("setClearPlayerName", async () => {
    contextOverlay.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
});

connection.on("recieveChatRoomMessage", async (chatMessage) => {
    var obj = convertUint8ArrayToObject(chatMessage);
    createChatRoomMessage(obj.from, obj.message);
});

connection.on("recieveMessage", async (message) => {
    var obj = convertUint8ArrayToObject(message);
    document.getElementById('roomMessage').innerText = obj.message;

    // to do add message types
    if (obj.message === "Wrong password") {
        context.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('roomName').innerText = "-";
        document.getElementById('playerCount').innerText = "-";
        document.getElementById('playerName').innerText = "not connected";
        window.isInRoom = false;
    }
});


connection.on("updatePlayerCount", async (count) => {
    var obj = convertUint8ArrayToObject(count);
    document.getElementById('playerCount').innerText = obj;
});


//todo update server side to send it as one object
connection.on("setupRoom", async (roomName, description, playerCount, inviteLink, history, version) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    //localDrawingHistory = [];
    //remoteDrawingHistory = [];
    drawingHistory = [];
    window.isInRoom = true;

    document.getElementById("roomName").innerText = roomName;
    document.getElementById("roomInputName").value = roomName;
    document.getElementById("playerCount").innerText = playerCount;
    document.getElementById("inviteUrl").innerText = " Room invite link: " + window.location.protocol + "//" + document.location.host + document.location.pathname + "?invite=" + inviteLink;
    document.getElementById("playerName").innerText = connId;
    document.getElementById("chatRoomInfo").innerHTML = 'Welcome to #' + roomName + '<br>Info: ' + description;
    footer.innerHTML += ' | Version: ' + version;

    var obj = convertUint8ArrayToObject(history);
    await obj.forEach(async function (item) {
       // window.remoteDrawingHistory.push(item);
       drawingHistory.push(item);
        var hexColor =  rgbToHex(item.color[0],item.color[1],item.color[2]);
        await setStroke(item.stroke[0] + canvasOffsetX, item.stroke[1] + canvasOffsetY, item.stroke[2]+ canvasOffsetX, item.stroke[3] + canvasOffsetY, item.size, hexColor);
    });
});

// update from remote players
connection.on("updateRoomPlayersDrawAction", async (drawAction) => {
    var obj = convertUint8ArrayToObject(drawAction);
    drawingHistory.push(obj);
    //remoteDrawingHistory.push(obj);

    if (document.querySelector('#showPlayerName').checked) {
        var x = obj.stroke[2] + Math.floor((canvasOffsetX - (context.measureText(obj.connId).width / 2)));
        var y = obj.stroke[3] + Math.floor((canvasOffsetY - 20));
        await drawPlayerName(canvasOverlay, contextOverlay, x, y, obj.connId);
    }
   var hexColor = rgbToHex(obj.color[0],obj.color[1],obj.color[2]);
    await setStroke(obj.stroke[0]+ canvasOffsetX, obj.stroke[1] + canvasOffsetY, obj.stroke[2] + canvasOffsetX, obj.stroke[3] + canvasOffsetY, obj.size, hexColor);
});


connection.on("resetRoom", () => {
    ResetCanvas(context);
});

connection.on("saveDrawingAsJson", (message) => {
    var obj = convertUint8ArrayToObject(message);
    console.log(obj.message + " " + window.location.protocol + "//" + document.location.host + obj.additionalInfo);
});


// Start the connection.
start();





