import {getHostAuthToken} from "../../util/getHostAuthToken.js";

export async function getDeleteEvent() {
    return {
        httpMethod: "DELETE",
        headers: {
            Authorization: await getHostAuthToken()
        },
        body: JSON.stringify({
            "property": "42a335b3-e72e-49ee-bc8d-ed61e9bd35e5"
        })
    }
}