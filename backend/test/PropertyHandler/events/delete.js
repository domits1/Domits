import {getHostAuthToken} from "../../util/getHostAuthToken.js";

export async function getDeleteEvent() {
    return {
        httpMethod: "DELETE",
        headers: {
            Authorization: await getHostAuthToken()
        },
        body: JSON.stringify({
            "property": "3763b443-6a49-476f-a7fa-5c39288cc21c"
        })
    }
}