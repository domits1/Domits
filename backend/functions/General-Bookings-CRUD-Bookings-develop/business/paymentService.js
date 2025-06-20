import stripeRepository from "../data/stripeRepository.js"
import NotFoundException from "../util/exception/NotFoundException.js";
class PaymentService{

    constructor(){this.stripeRepository = new stripeRepository();}

    async create(hostId, bookingId, propertyId, dates){
        if (!hostId || !bookingId || !propertyId || !dates) {
            throw new NotFoundException("Missing required parameters: hostId, bookingId, propertyId, or dates.");
        }

        const account_Id = await this.stripeRepository.getStripeAccountId(hostId);
        // console.log("Succesfully got user Stripe Account ID:", account_Id);

        const paymentData = await this.stripeRepository.createPaymentIntent(account_Id, propertyId, dates);
        // console.log(paymentData);

        const checkoutsession = await this.stripeRepository.addPaymentToTable(bookingId, paymentData);
        // console.log(checkoutsession);
        return {
            stripeClientSecret: paymentData.stripeClientSecret,
            bookingId: bookingId,
            stripeCheckoutSession: checkoutsession,
        }
    }
}
export default PaymentService;