import MessageService from "../business/messageService.js";

export default class AutomatedMessageController {
  constructor(messageService = new MessageService()) {
    this.messageService = messageService;
  }

  async send(event) {
    return this.messageService.sendAutomatedDomitsMessage(event?.detail || {});
  }
}
