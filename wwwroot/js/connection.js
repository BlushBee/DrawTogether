﻿const connection = new signalR.HubConnectionBuilder()
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

//todo update server side to send it as one object
connection.on("setupRoom", async (roomName, description, playerCount, inviteLink, history, version) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory = [];
    window.isInRoom = true;

    document.getElementById("roomName").innerText = roomName;
    document.getElementById("roomInputName").value = roomName;
    document.getElementById("playerCount").innerText = playerCount;
    document.getElementById("inviteUrl").innerText = " Room invite link: " + window.location.protocol + "//" + document.location.host + document.location.pathname + "?invite=" + inviteLink;
  
    document.getElementById("chatRoomInfo").innerHTML = 'Welcome to #' + roomName + '<br>Info: ' + description;
    footer.innerHTML += ' | Version: ' + version;

    setBackgroundColor(canvas, context, "white");

    var obj = convertUint8ArrayToObject(history);
    await obj.forEach(async function (item) {
        drawingHistory.push(item);
        await setStroke(item.stroke[0] + canvasOffsetX, item.stroke[1] + canvasOffsetY, item.stroke[2]+ canvasOffsetX, item.stroke[3] + canvasOffsetY, item.size, arrayToRGB(item.color));
    });
});

// note -> in preparation to rewrite using this as player info
connection.on("playerInfo", (player) => {
    var obj = convertUint8ArrayToObject(player);
    // 0 = client id = connid , update later
    // 1 = session id
    // 2 = name
    playerName = obj[2];
    document.getElementById("playerName").innerText = playerName;
});

connection.on("recieveChatRoomMessage", async (chatMessage) => {
    var obj = convertUint8ArrayToObject(chatMessage);
    createChatRoomMessage(obj.from, obj.message, obj.type);
});

connection.on("undoDrawAction", async (stroke) => {
    var obj = convertUint8ArrayToObject(stroke);

    console.log("undoDrawAction() " + obj);
    await undoDrawAction(obj[0], obj[1]);
});

connection.on("setClearPlayerName", async () => {
    contextOverlay.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
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

// update from remote players
connection.on("updateRoomPlayersDrawAction", async (drawAction) => {
    var obj = convertUint8ArrayToObject(drawAction);
    drawingHistory.push(obj);
    if (document.querySelector('#showPlayerName').checked) {
        var x = obj.stroke[2] + Math.floor((canvasOffsetX - (context.measureText(obj.connId).width / 2)));
        var y = obj.stroke[3] + Math.floor((canvasOffsetY - 20));
        await drawPlayerName(canvasOverlay, contextOverlay, x, y, obj.connId);
    }
    await setStroke(obj.stroke[0]+ canvasOffsetX, obj.stroke[1] + canvasOffsetY, obj.stroke[2] + canvasOffsetX, obj.stroke[3] + canvasOffsetY, obj.size, arrayToRGB(obj.color));
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





