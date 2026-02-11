import FaqRepository from "../../data/faqRepository.js";

import { NotFoundException } from "../../util/exception/NotFoundException.js";

export default class FaqService {
  constructor() {
    this.faqRepository = new FaqRepository();
  }

  async getFinanceFaqs() {
    const faqs = await this.faqRepository.getFinanceFaqs();

    if (!faqs || faqs.length === 0) {
      throw new NotFoundException("No finance FAQs found");
    }

    return {
        statusCode: 200,
        message: "Finance FAQs fetched successfully",
        details: { faqs },
    };
  }

}