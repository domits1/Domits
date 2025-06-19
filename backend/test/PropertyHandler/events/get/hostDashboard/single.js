import {getHostAuthToken} from "../../../../util/getHostAuthToken.js";

export async function getHostDashboardSingleEvent() {
    return {
        httpMethod: "GET",
        resource: "/property/hostDashboard/{subResource}",
        pathParameters: {subResource: "single"},
        queryStringParameters: {property: "3763b443-6a49-476f-a7fa-5c39288cc21c"},
        headers: {
            Authorization: await getHostAuthToken()
        }
    }
}