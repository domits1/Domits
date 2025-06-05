import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "eu-north-1" });

const getHostEmailById = async (hostId) => {
    const payload = {
        UserId: hostId
    };

    try {
        const response = await lambdaClient.send(new InvokeCommand({
            FunctionName: "GetUserInfo",
            Payload: JSON.stringify(payload),
        }));

        const payloadString = new TextDecoder("utf-8").decode(response.Payload);
        const result = JSON.parse(payloadString);

        const resultBody = JSON.parse(result.body);

        const hostEmail = resultBody[0].Attributes.find(attr => attr.Name === "email")?.Value

        if (result.statusCode !== 200) {
            throw new Error("Lambda returned non-200 status");
        }

        return (hostEmail);
    } catch (error) {
        console.error("Error calling getHostEmailById Lambda:", error);
        throw new Error("Failed to fetch host email.");
    }
}


export default getHostEmailById;
