import { GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { NotFoundException } from "../../util/exception/NotFoundException.js";
import { PropertyBaseInfoMapping } from "../../util/mapping/propertyBaseInfo.js";

export class PropertyRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }

    async create(property) {
        const params = new PutItemCommand({
            "TableName": "property-develop",
            "Item": {
                "id": {
                    "S": property.id
                },
                "description": {
                    "S": property.description
                },
                "guestCapacity": {
                    "N": `${property.guestCapacity}`
                },
                "hostId": {
                    "S": property.hostId
                },
                "registrationNumber": {
                    "S": property.registrationNumber
                },
                "status": {
                    "S": property.status
                },
                "propertyType": {
                    "S": property.propertyType
                },
                "subtitle": {
                    "S": property.subtitle
                },
                "title": {
                    "S": property.title
                },
                "createdAt": {
                    "N": `${property.createdAt}`
                },
                "updatedAt": {
                    "N": '0'
                },
                "status-propertyType": {
                    "S": `${property.status}-${property.propertyType}`
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getPropertyById(property.id);
        return result ? result : null;
    }

    async activateProperty(propertyId, type) {
        const params = new UpdateItemCommand({
            "TableName": "property-develop",
            "Key": {
                "id": { "S": propertyId }
            },
            "ExpressionAttributeNames": {
                "#status": "status",
                "#statusPropertyType": "status-propertyType"
            },
            "ExpressionAttributeValues": {
                ":status": {
                    "S": "ACTIVE"
                },
                ":statusPropertyType": {
                    "S": `ACTIVE-${type}`
                }
            },
            "ReturnValues": "ALL_NEW",
            "UpdateExpression": "SET #status = :status, #statusPropertyType = :statusPropertyType"
        })
        await this.dynamoDbClient.send(params);
    }

    async getActivePropertiesByType(type) {
        const params = new QueryCommand({
            "TableName": "property-develop",
            "IndexName": "status-propertyType-createdAt-index",
            "KeyConditionExpression": "#statusPropertyType = :statusPropertyType",
            "ExpressionAttributeNames": {
                '#statusPropertyType': 'status-propertyType',
            },
            "ExpressionAttributeValues": {
                ":statusPropertyType": {
                    "S": `ACTIVE-${type}`
                }
            },
            "ScanIndexForward": false,
            "Limit": 12
        });
        const result = await this.dynamoDbClient.send(params);
        if (result.Count < 1) {
            throw new NotFoundException(`No active property found for type ${type}.`)
        } else {
            const items = result.Items;
            return items.map(item => {
                return item.id.S
            });
        }
    }

    async getActiveProperties(lastEvaluatedKey) {
        const params = new QueryCommand({
            "TableName": "property-develop",
            "IndexName": "status-createdAt-index",
            "KeyConditionExpression": "#status = :status",
            "ExpressionAttributeNames": {
                "#status": "status"
            },
            "ExpressionAttributeValues": {
                ":status": {
                    "S": "ACTIVE"
                }
            },
            "ScanIndexForward": false,
            "Limit": 12
        });
        if (lastEvaluatedKey?.createdAt && lastEvaluatedKey?.id) {
            params.input.ExclusiveStartKey = {
                "status": {
                    "S": "ACTIVE"
                },
                "createdAt": {
                    "N": `${lastEvaluatedKey.createdAt}`
                },
                "id": {
                    "S": lastEvaluatedKey.id
                }
            }
        }
        const result = await this.dynamoDbClient.send(params);
        if (result.Count < 1) {
            throw new NotFoundException(`No property found.`)
        } else {
            const items = result.Items.map(item => item.id.S);
            const lastEvaluatedKey = result.LastEvaluatedKey ? {
                "status": result.LastEvaluatedKey.status.S,
                "createdAt": parseInt(result.LastEvaluatedKey.createdAt.N),
                "id": result.LastEvaluatedKey.id.S
            } : null;
            return {
                identifiers: items,
                lastEvaluatedKey: lastEvaluatedKey
            }
        }
    }

    async getPropertiesByHostId(hostId) {
        const params = new QueryCommand({
            "TableName": "property-develop",
            "IndexName": "hostId-status-index",
            "KeyConditionExpression": "#hostId = :hostId",
            "ExpressionAttributeNames": {
                "#hostId": "hostId"
            },
            "ExpressionAttributeValues": {
                ":hostId": {
                    "S": hostId
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        if (result.Count < 1) {
            throw new NotFoundException(`No property found.`)
        } else {
            const items = result.Items;
            return items.map(item => {
                return item.id.S
            })
        }
    }

    async getActivePropertiesByHostId(hostId) {
        const params = new QueryCommand({
            "TableName": "property-develop",
            "IndexName": "hostId-status-index",
            "KeyConditionExpression": "#hostId = :hostId AND #status = :status",
            "ExpressionAttributeNames": {
                "#hostId": "hostId",
                "#status": "status"
            },
            "ExpressionAttributeValues": {
                ":hostId": {
                    "S": hostId
                },
                ":status": {
                    "S": "ACTIVE"
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        if (result.Count < 1) {
            throw new NotFoundException(`No property found.`)
        } else {
            const items = result.Items;
            return items.map(item => {
                return item.id.S
            })
        }
    }

    async getPropertyById(id) {
        const params = new GetItemCommand({
            "TableName": "property-develop",
            "Key": {"id": {"S": id}}
        });
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? PropertyBaseInfoMapping.mapDatabaseEntryToPropertyBaseInfo(result.Item) : null;
    }

}