export const handleConnect = async (event) => {

    const connectionId = event.requestContext.connectionId;

    console.log("Client connected:", connectionId);

    return { statusCode: 200 };
};
