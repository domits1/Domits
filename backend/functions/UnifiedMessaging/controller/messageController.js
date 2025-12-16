import MessageService from "../business/messageService.js";

class MessageController {
    constructor() {
        this.messageService = new MessageService();
    }

    async sendMessage(event) {
        const body = JSON.parse(event.body);
        // Extract userId from event.requestContext.authorizer or similar if available, 
        // otherwise assume it's passed in body for now (needs auth implementation later)
        // For now, let's assume we get userId from the body or context
        return await this.messageService.sendMessage(body);
    }

    async getThreads(event) {
        const userId = event.queryStringParameters?.userId; // Placeholder for auth
        return await this.messageService.getThreads(userId);
    }

    async getMessages(event) {
        const threadId = event.queryStringParameters?.threadId;
        return await this.messageService.getMessages(threadId);
    }
}

export default MessageController;

