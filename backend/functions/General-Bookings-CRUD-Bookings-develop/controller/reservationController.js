import BookingService from "../business/bookingService.js"
import PaymentService from "../business/paymentService.js"

import responsejson from "../util/const/responseheader.json" with { type: 'json' };
const responseHeaderJSON = responsejson

class ReservationController {

    constructor() {
        this.bookingService = new BookingService();
        this.paymentSerivce = new PaymentService();
    }
    // -----------
    // POST
    // -----------

    async create(event){
        try{
            const returnInfo = await this.bookingService.create(event.event);
            if (returnInfo.isInquiry) {
                return {
                    statusCode: 201,
                    headers: responseHeaderJSON,
                    response: { bookingId: returnInfo.bookingId, status: "Inquiry" },
                };
            }
            const paymentData = await this.paymentSerivce.create(returnInfo.hostId, returnInfo.bookingId, returnInfo.propertyId, returnInfo.dates);
            return {
                statusCode: returnInfo.statusCode,
                headers: responseHeaderJSON,
                response: paymentData,
            }
        } catch (error) {
            console.error(error);
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaderJSON,
                message: error.message || "Something went wrong, please contact support."
            }
        }
    }

    // -----------
    // PATCH
    // -----------
    async patch(event) {
        try {
            const cancelBookingId = this.getCancelBookingId(event);
            if (cancelBookingId) {
                return this.cancelBooking(cancelBookingId);
            }

            if (event?.body === undefined || event?.body === null) {
                throw new Error("Missing request body.");
            }
            const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
            const authToken = event?.headers?.Authorization ?? event?.headers?.authorization;

            if (body?.action === "accept-inquiry" || body?.action === "decline-inquiry") {
                if (!body?.bookingId) throw new Error("Missing bookingId.");
                if (body.action === "decline-inquiry") {
                    const result = await this.bookingService.declineInquiry(body.bookingId, authToken);
                    return { statusCode: 200, headers: responseHeaderJSON, response: result };
                }
                const result = await this.bookingService.acceptInquiry(body.bookingId, authToken);
                try {
                    const paymentData = await this.paymentSerivce.create(result.hostId, result.bookingId, result.propertyId, result.dates);
                    return { statusCode: 200, headers: responseHeaderJSON, response: { ...result, stripeClientSecret: paymentData.stripeClientSecret } };
                } catch (stripeError) {
                    console.error("Stripe payment intent creation failed after accept:", stripeError);
                    return { statusCode: 200, headers: responseHeaderJSON, response: result };
                }
            }

            if (!body?.paymentid) {
                throw new Error("Missing paymentid.");
            }
            let confirmed;
            if (body?.failedpayment){
                confirmed = await this.bookingService.failPayment(body.paymentid);
            }
            else {
                confirmed = await this.bookingService.confirmPayment(body.paymentid);
            }
            return {
                statusCode: 200,
                headers: responseHeaderJSON,
                response: {
                    paymentConfirmed: confirmed
                }
            }
        } catch (error) {
            console.error(error)
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaderJSON,
                response: error.message || "Something went wrong, please contact support."
            }
        }
    }

    getCancelBookingId(event) {
        const pathBookingId = event?.pathParameters?.id ?? event?.pathParameters?.bookingId;
        const path = event?.rawPath || event?.path || event?.resource || "";
        const pathParts = path.split("/").filter(Boolean);
        const bookingsIndex = pathParts.findIndex((part) => part === "bookings");
        const routeBookingId = bookingsIndex >= 0 ? pathParts[bookingsIndex + 1] : "";
        const routeAction = bookingsIndex >= 0 ? pathParts[bookingsIndex + 2] : "";

        if (pathBookingId && (routeAction === "cancel" || path.endsWith("/cancel"))) {
            return pathBookingId;
        }

        if (routeBookingId && routeAction === "cancel") {
            return routeBookingId;
        }

        return "";
    }

    cancelBooking(bookingId) {
        return {
            statusCode: 501,
            headers: responseHeaderJSON,
            response: {
                bookingId,
                message: "Cancel booking route is available. Cancellation security and database update are not implemented yet.",
            },
        };
    }

    // -----------
    // GET    
    // -----------

    async read(event){
        try { 
            const returnInfo = await this.bookingService.read(event);
            return {
                statusCode: returnInfo.statusCode || 209,
                headers: responseHeaderJSON,
                response: returnInfo.response,
            }
        } catch (error) {
            console.error(error)
            return {
                statusCode: error.statusCode || 500,
                headers: responseHeaderJSON,
                message: error.message || "Something went wrong, please contact support.",
                response: error.response || ""
            }
        }
    }
}
export default ReservationController;
