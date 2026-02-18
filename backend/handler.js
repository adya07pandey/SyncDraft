import { handleConnect } from "./src/webSocket/connect.js";
import { handleDisconnect } from "./src/webSocket/disconnect.js";
import { handleMessage } from "./src/webSocket/message.js";

export const main = async (event) => {
  const routeKey = event.requestContext.routeKey;

  if (routeKey === "$connect") {
    return handleConnect(event);
  }

  if (routeKey === "$disconnect") {
    return handleDisconnect(event);
  }

  return handleMessage(event);
};

// serverless logs -f websocketHandler --tail
