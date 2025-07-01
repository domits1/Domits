import {getHostAuthToken} from "../../../../util/getHostAuthToken.js";

export async function getHostDashboardSingleEvent() {
    return {
        httpMethod: "GET",
        resource: "/property/hostDashboard/{subResource}",
        pathParameters: {subResource: "single"},
        queryStringParameters: {property: "42a335b3-e72e-49ee-bc8d-ed61e9bd35e5"},
        headers: {
            Authorization: await getHostAuthToken()
        }
    }
}