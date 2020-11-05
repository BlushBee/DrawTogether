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

        var playerCount = document.getElementById('playerCount').innerText;
        document.getElementById('playerCount').innerText = playerCount;
    }

    var chatRoom = document.getElementById("chatRoomMessages");
    chatRoom.appendChild(divFrom);
    chatRoom.scrollTop = chatRoom.scrollHeight - chatRoom.clientHeight;
}

async function sendChatRoomMessage() {
    if (connection.state === signalR.HubConnectionState.Connected) {
        var message = document.getElementById('chatRoomInputMessage').value;
        await connection.invoke("SendMessageToRoom", connId, message);
    }
}
