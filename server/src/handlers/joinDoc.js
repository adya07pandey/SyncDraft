import { addConnectionToDoc, getDocState, setConnectionMeta, setDocState, getSyncIndex } from "../services/redisService.js";
import CRDTDocument from "../crdt/CRDTDocument.js"

export const joinDoc = async (event,body) => {
    console.log("joinddoc");
    const {docId, userId} = body;
    const connectionId = event.requestContext.connectionId;
    const currentSyncIndex = await getSyncIndex(docId);

    await setConnectionMeta(connectionId,{docId,userId});

    await addConnectionToDoc(docId,connectionId);

    let docState = await getDocState(docId);

    if(!docState){
        const crdt = new CRDTDocument();
        docState = {
            nodes: Array.from(crdt.nodes.entries()),
            head:crdt.head,
        };

        await setDocState(docId, docState);
    }

    return {
        statusCode:200,
        body:JSON.stringify({
            action:"DOC_STATE",
            docId,
            state:docState,
            syncIndex:currentSyncIndex,
        })
    }
}