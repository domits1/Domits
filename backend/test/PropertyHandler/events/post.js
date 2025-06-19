import {getHostAuthToken} from "../../util/getHostAuthToken.js";
import {getPropertyObject} from "./propertyObject.js";

export async function getPostEvent() {
    return {
        httpMethod: "POST",
        headers: {
            Authorization: await getHostAuthToken()
        },
        body: JSON.stringify(getPropertyObject())
    }
}