import { ApiGatewayManagementApiClient, PostToConnectionCommand, } from "@aws-sdk/client-apigatewaymanagementapi";
import { getOpsAfter } from "../services/dynamoService.js";
import { getConnectionMeta, getDocState, getSyncIndex } from "../services/redisService.js";
import { loadSnapshot } from "../services/s3Services.js";



export const syncDoc = async (event, body) => {
    console.log("reached syncdoc.js");

    const { docId, lastSeenSyncIndex = 0 } = body;
    const connectionId = event.requestContext.connectionId;
    const currentSyncIndex = await getSyncIndex(docId);
    const meta = await getConnectionMeta(connectionId);
    if (!meta || meta.docId !== docId) {
        return { statusCode: 403 };
    }

    const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
    const api = new ApiGatewayManagementApiClient({ endpoint });


    if (lastSeenSyncIndex === 0) {
        const docState = await getDocState(docId);

        await api.send(
            new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: Buffer.from(JSON.stringify({
                    action: "DOC_STATE",
                    state: docState,
                })),
            })
        );

        return { statusCode: 200 };
    }


    const snapshot = await loadSnapshot(docId);

    if (snapshot && lastSeenSyncIndex < snapshot.syncIndex) {

        const ops = await getOpsAfter(docId, snapshot.syncIndex);

        await api.send(
            new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: Buffer.from(JSON.stringify({
                    action: "SNAPSHOT_SYNC",
                    snapshot: snapshot.state,
                    snapshotSyncIndex: snapshot.syncIndex,
                    ops,
                })),
            })
        );

        return { statusCode: 200 };
    }


    const ops = await getOpsAfter(docId, lastSeenSyncIndex);
    await api.send(
        new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify({
                action: "OP_REPLAY",
                ops,
            })),
        })
    );

    return { statusCode: 200 };
}


