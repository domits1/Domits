import { buildRestrictionsNotif } from "../util/restrictionsMessage.js";
import { newEchoToken } from "../data/siteMinderSoapClient.js";

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
