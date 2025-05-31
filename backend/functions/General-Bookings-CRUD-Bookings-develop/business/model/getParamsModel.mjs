class GetParamsModel {
	async verifyGetParams(params) {
		try {
			switch (params.readType) {
				case "property":
					await this.verifyPropertyData(params);
					break;
				case "guest":
					await this.verifyGuestData(params);
					break;
				case "createdAt":
					await this.verifyCreatedAtData(params);
					break;
				case "paymentId":
					await this.verifyPaymentData(params);
					break;
			}
		} catch (error) {
			console.error(error);
			throw new Error("Unable to verify your ReadType!")
		}

	}

	async verifyPropertyData(params) {
		if (typeof params.property_Id !== 'string') {
			throw new Error(`Invalid type for property_id. Expected a string but received a ${typeof(params.property_Id)}`);
		}
	}

	async verifyGuestData(params) {
		if (typeof params.guest_Id !== 'string') {
			throw new Error(`Invalid type for guest_Id. Expected a string but received a ${typeof(params.guest_Id)}`);
		}
	}

	async verifyCreatedAtData(params) {
		if (typeof params.createdAt !== 'string') {
			throw new Error(`Invalid type for createdAt. Expected a string but received a ${typeof(params.createdAt)}`); // must return number but is string for now. Try parsing in the future
		}
		if (typeof params.property_Id !== 'string') {
			throw new Error(`Invalid type for property_Id. Expected a string but received a ${typeof(params.property_Id)}`);
		}

	}

	async verifyPaymentData(params) {
		if (typeof params.paymentID !== 'string') {
			throw new Error(`Invalid type for paymentID. Expected a string but received a ${typeof(params.paymentID)}`);
		}
	}
}
export default GetParamsModel;