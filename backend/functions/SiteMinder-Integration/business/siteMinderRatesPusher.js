import { buildRatesNotif } from "../util/ratesMessage.js";
import { newEchoToken } from "../data/siteMinderSoapClient.js";

export class SiteMinderRatesPusher {
  constructor({ soapClient }) {
    this.soapClient = soapClient;
  }

  async push({ hotelCode, items, now = new Date() }) {
    const echoToken = newEchoToken();
    const body = buildRatesNotif({ hotelCode, requestorId: this.soapClient.pmsCode, items, echoToken, now });
    return this.soapClient.send(body, { echoToken });
  }
}

export default SiteMinderRatesPusher;
