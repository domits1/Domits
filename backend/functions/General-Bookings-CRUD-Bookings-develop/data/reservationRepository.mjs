import { DynamoDBClient, PutItemCommand, QueryCommand, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { randomUUID } from "crypto";
import LambdaRepository from "./lambdaRepository.mjs"
import CreateDate from "../business/model/createDate.mjs"
import NotFoundException from "../util/exception/NotFoundException.mjs"

const client = new DynamoDBClient({ region: "eu-north-1" });

class ReservationRepository {
    // ---------
    // Booking Create (auth)
    // ---------
    async addBookingToTable(requestBody, userId, hostId) {
        const date = CreateDate.createUnixTime();
        const id = randomUUID()
        const params = new PutItemCommand({
            "TableName": "booking-develop",
            "Item": {
                id: { S: id },
                arrivalDate: { N: new Date(requestBody.general.arrivalDate).getTime().toString() },
                createdAt: { N: date.toString() },
                departureDate: { N: new Date(requestBody.general.departureDate).getTime().toString() },
                guestId: { S: userId },
                hostId: { S: hostId },
                guests: { N: requestBody.general.guests.toString() },
                latePayment: { BOOL: false },
                paymentId: { S: randomUUID() },
                property_id: { S: requestBody.identifiers.property_Id },
                status: { S: "Awaiting Payment" }
            },
        })
        try {
            const response = await client.send(params);
            return {
                message: "Booking successfully added.",
                statusCode: 201,
                response: response,
                hostId: hostId,
                bookingId: id
            };
        } catch (error) {
            console.error(error)
            throw new Error("Failed to save reservation.");
        }
    }
    // ---------
    // Read bookings by propertyID (auth)
    // ---------
    async readByPropertyId(property_Id) {
        const input = {
            ExpressionAttributeValues: {
                ":partitionKey": { S: property_Id }
            },
            TableName: "booking-develop",
            IndexName: "property_id-index",
            KeyConditionExpression: "property_id = :partitionKey"
        }
        try {
            const command = new QueryCommand(input);
            const response = await client.send(command);
            return response;
        } catch (error) {
            console.error(error)
            throw new Error("Unable to search for bookings.");
        }
    }
    // ---------
    // Read bookings by guest_ID (auth)
    // ---------
    async readByGuestId(guest_Id) {
        const input = {
            ExpressionAttributeValues: {
                ":partitionKey": { S: guest_Id }
            },
            TableName: "booking-develop",
            IndexName: "guestId-index",
            KeyConditionExpression: "guestId = :partitionKey"
        }

        try {
            const command = new QueryCommand(input);
            const response = await client.send(command);
            return {
                message: ("Received bookings: "),
                response: response,
                statusCode: 200
            };
        } catch (error) {
            console.error(error)
            throw new Error("Unable to search for bookings.");
        }
    }
    // ---------
    // Read bookings by date created at + property_Id (auth-less)
    // ---------
    async readByDate(createdAt, property_id) { //only returns arrivaldate and departureDate
        // console.log("Reading by date: ", createdAt, " and propertyID: ", property_id);
        const input = {
            TableName: "booking-develop",
            IndexName: "property_id-createdAt-index",
            KeyConditionExpression: "property_id = :partitionKey AND createdAt = :sortKey",
            ProjectionExpression: "arrivalDate, departureDate",
            ExpressionAttributeValues: {
                ":partitionKey": { S: property_id },
                ":sortKey": { N: createdAt.toString() }
            },
        }
        try {
            const command = new QueryCommand(input);
            const response = await client.send(command);
            return {
                message: ("Received bookings: "),
                response: response.Items,
                statusCode: 200
            };
        } catch (error) {
            console.error(error)
        }
    }
    // ---------
    // Read bookings by payment_Id (auth)
    // ---------

    async readByPaymentId(paymentID) {
        // console.log(`Querying on paymentID: ${paymentID}`);

        const input = {
            TableName: "booking-develop",
            IndexName: "paymentID-index",
            KeyConditionExpression: "paymentId = :partitionKey",
            ExpressionAttributeValues: {
                ":partitionKey": { S: paymentID }
            }
        };
        try {
            const command = new QueryCommand(input);
            const response = await client.send(command);
            return {
                message: ("Booking returned: "),
                response: response.Items,
                statusCode: 200
            };
        } catch (error) {
            console.error(error)
            throw new Error("Unable to search for bookings.");
        }
    }

    // ---------
    // Read bookings by HostID (auth, depends on property-crud lambdax/)
    // ---------
    async readByHostId(host_Id) {
        this.lambdaRepository = new LambdaRepository();
        const propertiesOutput = await this.lambdaRepository.getPropertiesFromHostId(host_Id);

        const properties = propertiesOutput.id.map((_, i) => ({
            id: propertiesOutput.id[i],
            title: propertiesOutput.title[i],
            rate: propertiesOutput.rate[i]
        }));
        try {
            const combined = await Promise.all(
                properties.map(async (property) => {
                    const result = await this.readByPropertyId(property.id.toString());
                    let items = [];
                    if (Array.isArray(result.Items)) {
                        items = result.Items.map((rawItem) => unmarshall(rawItem));
                    }

                    return { ...property, items };
                })
            )
            return {
                message: ("Booking returned: "),
                response: combined,
                statusCode: 200
            };
        } catch (error) {
            console.error(error)
            throw new Error("Unable to search for bookings.");
        }
    }



    // ---------
    // Read bookings by departureDate + property_Id (auth-less) (this is for the guests)
    // ---------
    async readByDepartureDate(departureDate, property_Id) {

        const departConverted = CreateDate.modifyUnixTime(departureDate)
        const input = {
            TableName: "booking-develop",
            IndexName: "property_id-departureDate-index",
            KeyConditionExpression: "property_id = :partitionKey AND departureDate > :sortKey",
            ProjectionExpression: "arrivalDate, departureDate",
            ExpressionAttributeValues: {
                ":partitionKey": { S: property_Id },
                ":sortKey": { N: departConverted.toString() }
            },
        }
        try {
            const command = new QueryCommand(input);
            const response = await client.send(command);
            if (response.Items.length < 1) {
                return {
                    message: "No bookings found",
                    statusCode: 204
                }
            }
            return {
                message: ("Booking returned: "),
                response: response.Items.map(item => { return { arrivalDate: parseFloat(item.arrivalDate.N), departureDate: parseFloat(item.departureDate.N) } }),
                statusCode: 200
            };
        } catch (error) {
            console.error(error)
            throw new Error("Unable to search for bookings.");
        }
    }

    async getBookingById(id) {
        const params = new GetItemCommand({
            "TableName": "booking-develop",
            "Key": { "id": { "S": id } }
        });
        const response = await client.send(params);
        if (response.Item) {
            return unmarshall(response.Item);
        } else {
            throw new NotFoundException("Booking not found.");
        }
    }

    async updateBookingStatus(id, status) {
        const params = new UpdateItemCommand({
            "TableName": "booking-develop",
            "Key": {
                "id": { "S": id }
            },
            "ExpressionAttributeNames": {
                "#status": "status"
            },
            "ExpressionAttributeValues": {
                ":status": {
                    "S": status
                }
            },
            "ReturnValues": "ALL_NEW",
            "UpdateExpression": "SET #status = :status"
        })
        const response = await client.send(params);
        if (!response.Attributes.status.S === status) {
            throw new Error("Something went wrong while updating booking status.");
        }
    }
}

export default ReservationRepository;
