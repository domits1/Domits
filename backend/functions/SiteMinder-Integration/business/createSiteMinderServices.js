import { randomUUID } from "node:crypto";
import IntegrationAccountRepository from "../.shared/integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../.shared/integrations/repositories/integrationPropertyRepository.js";
import IntegrationRoomTypeRepository from "../.shared/integrations/repositories/integrationRoomTypeRepository.js";
import IntegrationRatePlanRepository from "../.shared/integrations/repositories/integrationRatePlanRepository.js";
import ChannexExternalBookingImportRepository from "../.shared/channelManagement/repositories/channexExternalBookingImportRepository.js";
import { SiteMinderRestClient } from "../data/siteMinderRestClient.js";
import { SiteMinderSoapClient } from "../data/siteMinderSoapClient.js";
import { SiteMinderSecretRepository } from "../data/siteMinderSecretRepository.js";
import { readSiteMinderConfig } from "../util/siteMinderConfig.js";
import { SiteMinderAvailabilityPusher } from "./siteMinderAvailabilityPusher.js";
import { SiteMinderRestrictionsPusher } from "./siteMinderRestrictionsPusher.js";
import { SiteMinderRatesPusher } from "./siteMinderRatesPusher.js";
import { SiteMinderMappingService } from "./siteMinderMappingService.js";
import { SiteMinderInventoryService } from "./siteMinderInventoryService.js";

export const createSiteMinderServices = async ({ env = process.env, secretRepository } = {}) => {
  const config = readSiteMinderConfig(env);
  const secrets = secretRepository || new SiteMinderSecretRepository({ secretName: config.secretName });
  const { username, password } = await secrets.getCredentials();
  const login = { pmsCode: config.pmsCode, username, password, ...(config.baseUrl ? { baseUrl: config.baseUrl } : {}) };

  const tables = {
    accounts: new IntegrationAccountRepository(),
    props: new IntegrationPropertyRepository(),
    roomTypes: new IntegrationRoomTypeRepository(),
    ratePlans: new IntegrationRatePlanRepository(),
  };
  const soapClient = new SiteMinderSoapClient(login);

  return {
    mapping: new SiteMinderMappingService({
      ...tables,
      restClient: new SiteMinderRestClient(login),
      propertyLookup: new ChannexExternalBookingImportRepository(),
      pmsCode: config.pmsCode,
      credentialsRef: config.secretName,
      newId: randomUUID,
    }),
    inventory: new SiteMinderInventoryService({
      ...tables,
      availabilityPusher: new SiteMinderAvailabilityPusher({ soapClient }),
      restrictionsPusher: new SiteMinderRestrictionsPusher({ soapClient }),
      ratesPusher: new SiteMinderRatesPusher({ soapClient }),
      currency: config.currency,
    }),
  };
};

export default createSiteMinderServices;
