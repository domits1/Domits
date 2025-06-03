import stripeRepository from "../data/stripeRepository.js"

class PaymentService{

    constructor(){this.stripeRepository = new stripeRepository();}

    async create(userId, bookingId){
        const account_id = await this.stripeRepository.getStripeAccountId(userId);
        console.log("Succesfully got user Stripe Account ID:", account_id);
        const paymentData = await this.stripeRepository.createPaymentIntent(account_id);
        console.log(paymentData);
        const checkoutsession = await this.stripeRepository.addPaymentToTable(bookingId, paymentData);
        console.log(checkoutsession);
        return {
            stripeClientSecret: paymentData.stripeClientSecret,
            bookingId: bookingId,
            stripeCheckoutSession: checkoutsession,
        }
    }
}
export default PaymentService;