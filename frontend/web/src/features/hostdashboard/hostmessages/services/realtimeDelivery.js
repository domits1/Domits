import AWS from "aws-sdk";

const ddb = new AWS.DynamoDB.DocumentClient();

const WS_ENDPOINT = process.env.WS_ENDPOINT;
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE;

const ws = WS_ENDPOINT
  ? new AWS.ApiGatewayManagementApi({ endpoint: WS_ENDPOINT })
  : null;

export const pushToUser = async (userId, payload) => {
  if (!userId) return;
  if (!CONNECTIONS_TABLE) {
    return;
  }
  if (!ws) {
    return;
  }

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
    console.warn("Failed to query websocket connections", { userId, err: e });
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
          console.warn("Failed to deliver realtime message", { userId, connectionId, err });
        }
      }
    })
  );
};
