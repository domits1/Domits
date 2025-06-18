import GeneralModel from "./model/generalModel.js";
import IdentifierModel from "./model/identifierModel.js";
import GetParamsModel from "./model/getParamsModel.js";
import AuthManager from "../auth/authManager.js";
import sendEmail from './sendEmail.js';
import Forbidden from "../util/exception/Forbidden.js";
import TypeException from "../util/exception/TypeException.js";
import ReservationRepository from "../data/reservationRepository.js";
import StripeRepository from "../data/stripeRepository.js";
import CognitoRepository from "../data/cognitoRepository.js";
import PropertyRepository from "../data/propertyRepository.js";
import getHostEmailById from './getHostEmailById.js';

class BookingService {
	constructor() {
		this.reservationRepository = new ReservationRepository();
		this.stripeRepository = new StripeRepository();
		this.cognitoRepository = new CognitoRepository();
		this.propertyRepository = new PropertyRepository();
		this.authManager = new AuthManager();
		this.getParamsModel = new GetParamsModel();
	}

	// -----------
	// /bookings POST
	// -----------

	async create(event) {
		//await this.verifyEventDataTypes(event);
		const authenticatedUser = await this.authManager.authenticateUser(event.Authorization);
		const userEmail = authenticatedUser.email
		const fetchedProperty = await this.propertyRepository.getPropertyById(event.identifiers.property_Id);
		const hostEmail = await getHostEmailById(fetchedProperty.hostId);

		const bookingInfo = {
			guests: event.general.guests,
			propertyName: fetchedProperty.title,
			arriveDate: event.general.arrivalDate,
			departureDate: event.general.departureDate
		};

		await sendEmail(userEmail, hostEmail, bookingInfo);

		return await this.reservationRepository.addBookingToTable(event, authenticatedUser.sub, fetchedProperty.hostId);

	}

	async confirmPayment(bookingId) {
		const booking = await this.reservationRepository.getBookingById(bookingId);
		if (booking.status === "Paid") {
			return true;
		}
		const payment = await this.stripeRepository.getPaymentByBookingId(booking.id);
		const paymentIntent = await this.stripeRepository.getPaymentIntentByPaymentId(payment.stripePaymentId);
		if (paymentIntent.status === "succeeded") {
			await this.reservationRepository.updateBookingStatus(booking.id, "Paid");
			return true;
		} else {
			return false;
		}
	}

	// -----------
	// /bookings GET
	// -----------

	async read(event) {
		let authToken;
		await this.verifyQueryDataTypes(event);
		switch (event.event.readType) {
			case "property": {
				await this.authManager.authenticateUser(event.Authorization);
				return await this.reservationRepository.readByPropertyId(event.event.property_Id);
			}
			case "guest": {
				await this.authManager.authenticateUser(event.Authorization);
				return await this.reservationRepository.readByGuestId(event.event.guest_Id);
			}

			case "createdAt": {
				return await this.reservationRepository.readByDate(event.event.createdAt, event.event.property_Id);
			}
			case "paymentId": { 
				await this.authManager.authenticateUser(event.Authorization);
				return await this.reservationRepository.readByPaymentId(event.event.paymentID);
			}
			case "hostId": { 
				authToken = await this.authManager.authenticateUser(event.Authorization);
				return await this.reservationRepository.readByHostId(authToken.sub);
			}
			case "departureDate":{
				return await this.reservationRepository.readByDepartureDate(event.event.departureDate, event.event.property_Id);
			}
			case "getId":{
				authToken = await this.authManager.authenticateUser(event.Authorization);
				return {
					response: authToken.sub
				}
			}
			case "getPayment":
				{
				const user = await this.authManager.authenticateUser(event.Authorization);
				const booking = await this.reservationRepository.getBookingById(event.event.bookingId);
				if (booking.guestId !== user.sub) {
					throw new Forbidden("Only the guest of this booking may view payment information.")
				}
				const payment = await this.stripeRepository.getPaymentByBookingId(event.event.bookingId);
				return {
					statusCode: 200,
					response: payment.stripeClientSecret
				}
			}
			default:
				{
					throw new TypeException("Unable to determine what read type to use.");
				}
			}
		}


	// -----------
	// verify Booking POST request
	// -----------

	async verifyEventDataTypes(event) {
		try {
			if (event?.identifiers && event?.tax && event?.general) {
				IdentifierModel.verifyIdentifierData(event);
				GeneralModel.verifyGeneralData(event);
			}
		} catch (error) {
			console.error(error);
			throw new Forbidden("Unable to verify data! Check your request or contact support!");
		}
	}

	// -----------
	// verify Booking GET request
	// -----------

	async verifyQueryDataTypes(params) {
		try {
			//await this.getParamsModel.verifyGetParams(params);
		} catch (error) {
			console.error(error);
			throw new Forbidden("Unable to verify data! Check your request or contact support!");
		}
	}
}


export default BookingService;