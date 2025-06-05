import {
  PutItemCommand,
  DeleteItemCommand,
  QueryCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

export class WishlistRepository {
  constructor(dynamoDbClient) {
    this.dynamoDbClient = dynamoDbClient;
    this.tableName = "guest_favorite";
  }

  async create(item) {
    const params = new PutItemCommand({
      TableName: this.tableName,
      Item: {
        guestId: { S: item.guestId },
        wishlistKey: { S: item.wishlistKey },
        wishlistName: { S: item.wishlistName },
        propertyId: { S: item.propertyId }
      }
    });

    await this.dynamoDbClient.send(params);
    return item;
  }

  async delete({ guestId, wishlistKey, propertyId }) {
    const params = new DeleteItemCommand({
      TableName: this.tableName,
      Key: {
        guestId: { S: guestId },
        wishlistKey: { S: wishlistKey }
      }
    });

    await this.dynamoDbClient.send(params);
    return true;
  }

  async deleteAll({ guestId, wishlistKey }) {
    const query = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "guestId = :g",
      ExpressionAttributeValues: {
        ":g": { S: guestId }
      }
    });

    const result = await this.dynamoDbClient.send(query);
    const itemsToDelete = result.Items.filter(
      (item) => item.wishlistKey.S.startsWith(wishlistKey)
    );

    for (const item of itemsToDelete) {
      await this.dynamoDbClient.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: {
            guestId: item.guestId,
            wishlistKey: item.wishlistKey
          }
        })
      );
    }

    return true;
  }

  async getByKey({ guestId, wishlistKey }) {
    const params = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "guestId = :g",
      ExpressionAttributeValues: {
        ":g": { S: guestId }
      }
    });

    const result = await this.dynamoDbClient.send(params);
    return result.Items.filter(
      (item) => item.wishlistKey.S.startsWith(wishlistKey)
    );
  }

  async getAll(guestId) {
    const params = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "guestId = :g",
      ExpressionAttributeValues: {
        ":g": { S: guestId }
      }
    });

    const result = await this.dynamoDbClient.send(params);
    return result.Items;
  }

  async rename({ guestId, wishlistKey, newName }) {
    const items = await this.getByKey({ guestId, wishlistKey });

    for (const item of items) {
      const oldKey = item.wishlistKey.S;
      const propertyId = item.propertyId.S;
      const newKey = `${newName}#${propertyId}`;

      // Delete old item
      await this.dynamoDbClient.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: {
            guestId: { S: guestId },
            wishlistKey: { S: oldKey }
          }
        })
      );

      // Put new item
      await this.dynamoDbClient.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            guestId: { S: guestId },
            wishlistKey: { S: newKey },
            wishlistName: { S: newName },
            propertyId: { S: propertyId }
          }
        })
      );
    }

    return true;
  }
}
