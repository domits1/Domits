class ParseEvent {
	async handleEvent(event) { // If an queryStringParamter is sent, this will be prioritzed over an event with a body.
		switch (event.httpMethod) {
			case "POST":
				return await this.setEventToRequestBody(event);
			case "GET":
				return await this.setEventToQueryParams(event);
			case "PUT":
				//wip implementation
				break;
			case "DELETE":
				//wip implementation
				break;
			default:
				break;
		}
	}

	async setEventToRequestBody(event){
		try {
			const authToken = event?.headers?.Authorization ?? event?.headers?.authorization;
			if (event?.body === undefined || event?.body === null) {
				throw new Error("Missing request body.");
			}
			if (typeof event?.body === "string") {
				event.body = JSON.parse(event.body)
			}
			const eventBody = event.body
			if (!eventBody || typeof eventBody !== "object" || Array.isArray(eventBody)) {
				throw new Error("Invalid request body.");
			}
			const compiledevent = {
				event : {
					Authorization: authToken,
					...eventBody
				},
			}
			return compiledevent;
		} catch (error) {
			console.error(error);
			throw new Error("Unable to parse your request!");
		}
	}
	
	async setEventToQueryParams(event){
		try {
			const authToken = event?.headers?.Authorization ?? event?.headers?.authorization;
			if (event?.queryStringParameters === undefined || event?.queryStringParameters === null) {
				throw new Error("Missing query parameters.");
			}
			if (typeof event?.queryStringParameters === "string") {
				event.queryStringParameters = JSON.parse(event.queryStringParameters);
			}
			const eventBody = event.queryStringParameters
			if (!eventBody || typeof eventBody !== "object" || Array.isArray(eventBody)) {
				throw new Error("Invalid query parameters.");
			}
			const compiledevent = {
				Authorization: authToken,
				event: eventBody
			}
			return compiledevent;
		} catch (error) {
			console.error(error);
			throw new Error("Unable to parse your request");
		}
	}
}

export default ParseEvent;
