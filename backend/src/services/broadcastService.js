import {  ApiGatewayManagementApiClient,  PostToConnectionCommand,} from "@aws-sdk/client-apigatewaymanagementapi";
import redis from "../config/redis.js";


export const broadcastToDoc = async (event, connections, message,docId) => {
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;

  const api = new ApiGatewayManagementApiClient({endpoint,});

  for (const connId of connections){
    try{

      await api.send(
        new PostToConnectionCommand({
          ConnectionId: connId,
          Data: Buffer.from(JSON.stringify(message)),
        })
      );

    }catch (err){

      if(err?.$metadata?.httpStatusCode === 410){

        console.log("Stale connection detected. Removing:", connId);
        await redis.srem(`doc:${docId}:connections`, connId);
        await redis.del(`conn:${connId}`);

      }else{
        console.error("Broadcast failed:", connId, err);
      }
    }
    
  }
};

