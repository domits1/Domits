import {getHostAuthToken} from "../../../../util/getHostAuthToken.js";

export async function getHostDashboardAllEvent() {
    return {
        httpMethod: "GET",
        resource: "/property/hostDashboard/{subResource}",
        pathParameters: {subResource: "all"},
        headers: {
            Authorization: await getHostAuthToken()
        }
    }
}