import { applyOperation } from "../handlers/applyOperation.js";
import { joinDoc } from "../handlers/joinDoc.js";
import { syncDoc } from "../handlers/syncDoc.js";

export const handleMessage = async (event) => {
    const body = JSON.parse(event.body);
    const action = body.action;

    switch (action){
        case "JOIN_DOC":
            return joinDoc(event, body);

        case "SEND_OP":
            return applyOperation(event,body);
        
        case "SYNC_STATE":
            return syncDoc(event, body);

        default:
            return {statusCode:400};
    }
}