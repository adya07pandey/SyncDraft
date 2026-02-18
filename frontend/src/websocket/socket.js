let socket = null;

export const connectSocket = (onMessage, onOpen) => {
  const WS_URL = import.meta.env.VITE_WS_URL;

  socket = new WebSocket(WS_URL);

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