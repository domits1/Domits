import { GetItemCommand, PutItemCommand, UpdateItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { LocationMapping } from "../../util/mapping/location.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";

export class PropertyLocationRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }

    async getPropertyLocationById(id) {
        const params = new GetItemCommand({
            "TableName": "property-location-develop",
            "Key": {
                "property_id": {
                    "S": id
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? LocationMapping.mapDatabaseEntryToLocation(result.Item) : null;
    }

    async getFullPropertyLocationById(id) {
        const params = new GetItemCommand({
            "TableName": "property-location-develop",
            "Key": {
                "property_id": {
                    "S": id
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? LocationMapping.mapDatabaseEntryToFullLocation(result.Item) : null;
    }

    async create(location) {
        const params = new PutItemCommand({
            "TableName": "property-location-develop",
            "Item": {
                "property_id": {
                    "S": location.property_id
                },
                "city": {
                    "S": location.city
                },
                "country": {
                    "S": location.country
                },
                "houseNumber": {
                    "N": `${location.houseNumber}`
                },
                "houseNumberExtension": {
                    "S": location.houseNumberExtension
                },
                "postalCode": {
                    "S": location.postalCode
                },
                "street": {
                    "S": location.street
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getPropertyLocationById(location.property_id);
        return result ? result : null;
    }

    async activateProperty(propertyId, country) {
        const params = new UpdateItemCommand({
            "TableName": "property-location-develop",
            "Key": {
                "property_id": { "S": propertyId }
            },
            "ExpressionAttributeNames": {
                "#statusCountry": "status-country"
            },
            "ExpressionAttributeValues": {
                ":statusCountry": {
                    "S": `ACTIVE-${country}`
                }
            },
            "ReturnValues": "ALL_NEW",
            "UpdateExpression": "SET #statusCountry = :statusCountry"
        })
        await this.dynamoDbClient.send(params);
    }

    async getActivePropertiesByCountry(country, lastEvaluatedKey) {
        
        const params = new QueryCommand({
            "TableName": "property-location-develop",
            "IndexName": "status-country-city-index",
            "KeyConditionExpression": "#statusCountry = :statusCountry",
            "ExpressionAttributeNames": {
                '#statusCountry': 'status-country',
            },
            "ExpressionAttributeValues": {
                ":statusCountry": {
                    "S": `ACTIVE-${country}`
                }
            },
            "ScanIndexForward": false,
            "Limit": 12
        });
        if (lastEvaluatedKey?.id !== "null" && lastEvaluatedKey?.city !== "null" ) {
            params.input.ExclusiveStartKey = {
                "property_id": {
                    "S": lastEvaluatedKey.id
                },
                "status-country": { 
                    "S": `ACTIVE-${country}` 
                },
                "city": { 
                    "S": lastEvaluatedKey.city
                }
            }
        }
        const result = await this.dynamoDbClient.send(params);
        if (result.Count < 1) {
            throw new NotFoundException(`No property found.`)
        } else {
            const items = result.Items.map(item => item.property_id.S);
            const lastEvaluatedKey = result.LastEvaluatedKey ? {
                "id": result.LastEvaluatedKey.property_id.S,
                "city": result.LastEvaluatedKey.city.S
            } : null;
            return {
                identifiers: items,
                lastEvaluatedKey: lastEvaluatedKey
            }
        }
    }

}