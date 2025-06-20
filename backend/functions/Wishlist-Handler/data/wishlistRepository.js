import { PutItemCommand, DeleteItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";

export class WishlistRepository {
  constructor(dynamoDbClient) {
    this.dynamoDbClient = dynamoDbClient;
    this.tableName = "guest_favorite";
  }

  // Create or overwrite an item in the wishlist table
  async create(item) {
    const dynamoItem = {
      guestId: { S: item.guestId },
      wishlistKey: { S: item.wishlistKey },
      wishlistName: { S: item.wishlistName },
    };

    if (item.propertyId) {
      dynamoItem.propertyId = { S: item.propertyId };
    }

    if (item.isPlaceholder !== undefined) {
      dynamoItem.isPlaceholder = { BOOL: item.isPlaceholder };
    }

    const params = new PutItemCommand({
      TableName: this.tableName,
      Item: dynamoItem,
    });

    await this.dynamoDbClient.send(params);
    return item;
  }

  // Delete a single wishlist item
  async delete({ guestId, wishlistKey }) {
    const params = new DeleteItemCommand({
      TableName: this.tableName,
      Key: {
        guestId: { S: guestId },
        wishlistKey: { S: wishlistKey },
      },
    });

    await this.dynamoDbClient.send(params);
    return true;
  }

  // Delete all items from a specific wishlist
  async deleteAll({ guestId, wishlistName }) {
    const query = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "guestId = :g",
      ExpressionAttributeValues: {
        ":g": { S: guestId },
      },
    });

    const result = await this.dynamoDbClient.send(query);

    const itemsToDelete = result.Items.filter((item) => item.wishlistName.S === wishlistName);

    for (const item of itemsToDelete) {
      await this.dynamoDbClient.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: {
            guestId: item.guestId,
            wishlistKey: item.wishlistKey,
          },
        })
      );
    }

    return true;
  }

  // Get all items for a specific wishlist
  async getByKey({ guestId, wishlistKey }) {
    const params = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "guestId = :g",
      ExpressionAttributeValues: {
        ":g": { S: guestId },
      },
    });

    const result = await this.dynamoDbClient.send(params);

    return result.Items.filter((item) => item.wishlistKey.S.startsWith(wishlistKey));
  }

  // Get all wishlist items for a guest
  async getAll(guestId) {
    const params = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "guestId = :g",
      ExpressionAttributeValues: {
        ":g": { S: guestId },
      },
    });

    const result = await this.dynamoDbClient.send(params);
    return result.Items;
  }

  // Rename all items in a wishlist
  async rename({ guestId, oldName, newName }) {
    const result = await this.getAll(guestId);
    const toRename = result.filter((item) => item.wishlistName.S === oldName);

    for (const item of toRename) {
      const propertyId = item.propertyId?.S || "__placeholder__";
      const oldKey = item.wishlistKey.S;
      const newKey = `${newName}#${propertyId}`;

      // Delete old item
      await this.dynamoDbClient.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: {
            guestId: { S: guestId },
            wishlistKey: { S: oldKey },
          },
        })
      );

      // Put new item with updated name
      const newItem = {
        guestId: { S: guestId },
        wishlistKey: { S: newKey },
        wishlistName: { S: newName },
      };

      if (item.propertyId) {
        newItem.propertyId = { S: propertyId };
      }
      if (item.isPlaceholder) {
        newItem.isPlaceholder = { BOOL: item.isPlaceholder.BOOL };
      }

      await this.dynamoDbClient.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: newItem,
        })
      );
    }

    return true;
  }
}
