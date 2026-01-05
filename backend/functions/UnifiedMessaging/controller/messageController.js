import MessageService from "../business/messageService.js";

class MessageController {
  constructor() {
    this.messageService = new MessageService();
  }

  async sendMessage(event) {
    const body = JSON.parse(event.body);

    return await this.messageService.sendMessage(body);
  }

  async getThreads(event) {
    const userId = event.queryStringParameters?.userId;
    return await this.messageService.getThreads(userId);
  }

  async getMessages(event) {
    const threadId = event.queryStringParameters?.threadId;
    return await this.messageService.getMessages(threadId);
  }
}

export default MessageController;
