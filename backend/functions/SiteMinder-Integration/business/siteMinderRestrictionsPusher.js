import { buildRestrictionsNotif } from "../util/restrictionsMessage.js";
import { newEchoToken } from "../data/siteMinderSoapClient.js";

// Sends restrictions (stop sell, CTA, CTD, min and max stay) per room rate for one hotel to SiteMinder.
export class SiteMinderRestrictionsPusher {
  constructor({ soapClient }) {
    this.soapClient = soapClient;
  }

  async push({ hotelCode, items, now = new Date() }) {
    const echoToken = newEchoToken();
    const body = buildRestrictionsNotif({ hotelCode, requestorId: this.soapClient.pmsCode, items, echoToken, now });
    return this.soapClient.send(body, { echoToken });
  }
}

export default SiteMinderRestrictionsPusher;
