import stripeRepository from "../data/stripeRepository.js"
import NotFoundException from "../util/exception/NotFoundException.js";
class PaymentService{

    constructor(){this.stripeRepository = new stripeRepository();}

    async create(hostId, bookingId, propertyId, dates){
        if (!hostId || !bookingId || !propertyId || !dates) {
            throw new NotFoundException("Missing required parameters: hostId, bookingId, propertyId, or dates.");
        }
        
        const account_Id = await this.stripeRepository.getStripeAccountId(hostId);
        
        const paymentData = await this.stripeRepository.createPaymentIntent(account_Id, propertyId, dates);

        return {
            stripeClientSecret: paymentData.stripeClientSecret,
            bookingId: bookingId,
        }
    }
}
export default PaymentService;