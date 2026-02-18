import { broadcastToDoc } from "../services/broadcastService.js";
import { saveOperation } from "../services/dynamoService.js";
import { getConnectionMeta, getDocState, incrementOpCount, incrementSyncIndex, resetOpCount, setDocState} from "../services/redisService.js";
import CRDTDocument from "../crdt/CRDTDocument.js";
import { saveSnapshot } from "../services/s3Services.js";
import redis from "../config/redis.js";

const SNAPSHOT_INTERVAL = 100;



export const applyOperation = async (event, body) => {

    const { docId, op} = body;
    const connectionId = event.requestContext.connectionId;

    const meta = await getConnectionMeta(connectionId);

    if (!meta || meta.docId !== docId) {
        return { statusCode: 403 };
    }

    const stored = await getDocState(docId);
    const crdt = new CRDTDocument();
    const connections = await redis.smembers(`doc:${docId}:connections`);
   

    if (!stored) return

    // console.log("Redis state:", stored);
    // console.log("Op saved:", op);
    // console.log("Connections:", connections);


    if (stored && stored.nodes) {
        for (const [id, node] of stored.nodes) {
            crdt.nodes.set(id, node);
        }
        crdt.head = stored.head;
    }

    if (op.type === "insert") {
        crdt.insert(op);
    } else if (op.type === "delete") {
        crdt.delete(op.targetId);
    }

    const newState = {
        nodes: Array.from(crdt.nodes.entries()),
        head: crdt.head,        
    };

    await setDocState(docId, newState);



    const syncIndex = await incrementSyncIndex(docId);
    await saveOperation(docId, op,syncIndex);

    const count = await incrementOpCount(docId);

    if (count >= SNAPSHOT_INTERVAL) {
        await saveSnapshot(docId, {
            syncIndex,
            state: newState,
            createdAt: Date.now(),
        });

        await resetOpCount(docId);
    }


    await broadcastToDoc(
        event,
        connections.filter(id => id !== connectionId),
        {
            action: "REMOTE_OP",
            op,
            syncIndex,
        },
        docId,
    );
    return { statusCode: 200 };
};
