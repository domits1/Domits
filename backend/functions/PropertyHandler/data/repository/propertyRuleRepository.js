import { GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { RuleMapping } from "../../util/mapping/rule.js";

export class PropertyRuleRepository {

    constructor(dynamoDbClient, systemManager) {
        this.dynamoDbClient = dynamoDbClient;
        this.systemManager = systemManager
    }

    async getRuleById(id) {
        const params = new GetItemCommand({
            "TableName": "property-rules-develop",
            "Key": {
                "rule": {
                    "S": id
                }
            }
        });
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null;
    }

    async getRulesByPropertyId(id) {
        const params = new QueryCommand({
            "TableName": "property-rule-develop",
            "IndexName": "property_id-index",
            "KeyConditionExpression": "#property_id = :id",
            "ExpressionAttributeNames": {
                "#property_id": "property_id"
            },
            "ExpressionAttributeValues": {
                ":id": {
                    "S": id
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Items ? result.Items.map(item => RuleMapping.mapDatabaseEntryToRule(item)) : null;
    }

    async getRuleByPropertyIdAndRule(id, rule) {
        const params = new GetItemCommand({
            "TableName": "property-rule-develop",
            "Key": {
                "property_id": {
                    "S": id
                },
                "rule": {
                    "S": rule
                }
            }
        })
        const result = await this.dynamoDbClient.send(params);
        return result.Item ? result.Item : null;
    }

    async create(rule) {
        const params = new PutItemCommand({
            "TableName": "property-rule-develop",
            "Item": {
                "property_id": {
                    "S": rule.property_id
                },
                "rule": {
                    "S": rule.rule
                },
                "value": {
                    "BOOL": rule.value
                }
            }
        })
        await this.dynamoDbClient.send(params);
        const result = await this.getRuleByPropertyIdAndRule(rule.property_id, rule.rule);
        return result ? result : null;
    }

}