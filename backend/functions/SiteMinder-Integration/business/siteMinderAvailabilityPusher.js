import { buildAvailabilityNotif } from "../util/availabilityMessage.js";
import { newEchoToken } from "../data/siteMinderSoapClient.js";

// Sends availability (rooms for sale per room type and date range) for one hotel to SiteMinder.
export class SiteMinderAvailabilityPusher {
  constructor({ soapClient }) {
    this.soapClient = soapClient;
  }

  async push({ hotelCode, items, now = new Date() }) {
    const echoToken = newEchoToken();
    const body = buildAvailabilityNotif({ hotelCode, requestorId: this.soapClient.pmsCode, items, echoToken, now });
    return this.soapClient.send(body, { echoToken });
  }
}

export default SiteMinderAvailabilityPusher;
