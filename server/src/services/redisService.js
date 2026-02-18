import redis from "../config/redis.js"

export const getDocState = async (docId) => {
    const data = await redis.get(`doc:${docId}:state`);
    return data? JSON.parse(data):null;
};

export const setDocState = async (docId, state) => {
    await redis.set(`doc:${docId}:state`,JSON.stringify(state));
}


export const addConnectionToDoc = async (docId, connectionId) => {
    await redis.sadd(`doc:${docId}:connections`,connectionId);
}

export const removeConnectionFromDoc = async (docId, connectionId) => {
    await redis.srem(`doc:${docId}:connections`, connectionId);
}

export const setConnectionMeta = async (connectionId, meta) => {
    await redis.set(`conn:${connectionId}`, JSON.stringify(meta));
}

export const getConnectionMeta = async (connectionId) => {
    const data = await redis.get(`conn:${connectionId}`);
    return data ? JSON.parse(data):null;
}

export const incrementOpCount = async(docId) => {
    return await redis.incr(`doc:${docId}:opCount`);
}

export const resetOpCount = async (docId) => {
    await redis.set(`doc:${docId}:opCount`,0);
}

export const incrementSyncIndex = async (docId) => {
    return await redis.incr(`doc:${docId}:syncIndex`);
};

export const getSyncIndex = async (docId) => {
    const value = await redis.get(`doc:${docId}:syncIndex`);
    return value ? Number(value) : 0;
};
