import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const TABLE = process.env.OPERATIONS_TABLE;


export const saveOperation = async (docId, op,syncIndex) => {
  await dynamo.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        docId,
        syncIndex,
        opId: op.id,
        op,
        createdAt: Date.now(),
      },
    })
  );
};

export const getOpsAfter = async (docId, lastSeenSyncIndex) => {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "docId = :d AND syncIndex > :s",
      ExpressionAttributeValues: {
        ":d": docId,
        ":s": lastSeenSyncIndex,
      },
      ScanIndexForward: true,
    })
  );

  return res.Items?.map((item) => ({
    syncIndex: item.syncIndex,
    op: item.op,
  })) || [];
};
