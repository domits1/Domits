import AWS from "aws-sdk";

const ddb = new AWS.DynamoDB.DocumentClient();

const WS_ENDPOINT = process.env.WS_ENDPOINT; // https://opehkmyi44.execute-api.eu-north-1.amazonaws.com/production
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE; // General-Messaging-Production-WebSocketConnections

const ws = WS_ENDPOINT
  ? new AWS.ApiGatewayManagementApi({ endpoint: WS_ENDPOINT })
  : null;

export const pushToUser = async (userId, payload) => {
  if (!userId) return;
  if (!CONNECTIONS_TABLE) {
    console.log("[realtime] missing CONNECTIONS_TABLE env var");
    return;
  }
  if (!ws) {
    console.log("[realtime] missing/invalid WS_ENDPOINT env var");
    return;
  }

  // Assumes: PK = userId, SK = connectionId
  // (This matches the typical design for "connections" table.)
  let items = [];
  try {
    const res = await ddb
      .query({
        TableName: CONNECTIONS_TABLE,
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: { ":u": userId },
      })
      .promise();

    items = res?.Items || [];
  } catch (e) {
    console.log("[realtime] connections query failed:", e?.message || e);
    return;
  }

  if (!items.length) return;

  const data = JSON.stringify(payload);

  await Promise.all(
    items.map(async (c) => {
      const connectionId = c?.connectionId;
      if (!connectionId) return;

      try {
        await ws.postToConnection({ ConnectionId: connectionId, Data: data }).promise();
      } catch (err) {
        // stale connection -> cleanup
        if (err?.statusCode === 410) {
          try {
            await ddb
              .delete({
                TableName: CONNECTIONS_TABLE,
                Key: { userId, connectionId },
              })
              .promise();
          } catch {}
        } else {
          console.log("[realtime] postToConnection failed:", err?.message || err);
        }
      }
    })
  );
};
