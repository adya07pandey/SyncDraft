let socket = null;

export const connectSocket = (onMessage, onOpen) => {
  socket = new WebSocket("wss://6njzkg9tne.execute-api.ap-south-1.amazonaws.com/dev");

  socket.onopen = () => {
    console.log("connected");
    if (onOpen) onOpen();
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  socket.onclose = () => {
    console.log("Disconnected");
  };

  return socket;
};


export const sendMessage = (data) => {
    if(socket && socket.readyState === WebSocket.OPEN){
        socket.send(JSON.stringify(data));
    }
} 