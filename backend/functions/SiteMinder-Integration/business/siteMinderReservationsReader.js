import {
  buildReservationFailure,
  buildReservationsConfirmation,
  buildReservationsRead,
  readReservations,
} from "../util/reservationsMessage.js";
import { newEchoToken } from "../data/siteMinderSoapClient.js";

export class SiteMinderReservationsReader {
  constructor({ soapClient }) {
    this.soapClient = soapClient;
  }

  async readUndelivered({ now = new Date() } = {}) {
    const echoToken = newEchoToken();
    const body = buildReservationsRead({ requestorId: this.soapClient.pmsCode, echoToken, now });
    const { xml } = await this.soapClient.send(body, { echoToken });
    return readReservations(xml);
  }

  async confirm(reservations, { now = new Date() } = {}) {
    if (reservations.length === 0) {
      return null;
    }
    const echoToken = newEchoToken();
    return this.soapClient.send(buildReservationsConfirmation({ reservations, echoToken, now }), { echoToken });
  }

  async reportFailure(reservation, error, { now = new Date() } = {}) {
    const echoToken = newEchoToken();
    return this.soapClient.send(buildReservationFailure({ reservation, error, echoToken, now }), { echoToken });
  }
}

export default SiteMinderReservationsReader;
