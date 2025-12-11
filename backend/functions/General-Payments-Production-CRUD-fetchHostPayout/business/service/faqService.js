import AuthManager from "../../auth/authManager.js";
import FaqRepository from "../../data/FaqRepository.js";

import { NotFoundException } from "../../util/exception/NotFoundException.js";

export default class FaqService {
  constructor() {
    this.authManager = new AuthManager();
    this.faqRepository = new FaqRepository();
  }

  async getFinanceFaqs() {
    const faqs = await this.faqRepository.getFinanceFaqs();

    if (!faqs) {
      throw new NotFoundException("No finance FAQs found");
    }

    return {
        statusCode: 200,
        message: "Finance FAQs fetched successfully",
        details: { faqs },
    };
  }

}