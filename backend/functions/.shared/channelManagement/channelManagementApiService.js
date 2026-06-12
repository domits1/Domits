import IntegrationAccountRepository from "../integrations/repositories/integrationAccountRepository.js";
import IntegrationPropertyRepository from "../integrations/repositories/integrationPropertyRepository.js";
import IntegrationRatePlanRepository from "../integrations/repositories/integrationRatePlanRepository.js";
import IntegrationRoomTypeRepository from "../integrations/repositories/integrationRoomTypeRepository.js";
import IntegrationSyncRepository from "../integrations/repositories/integrationSyncRepository.js";
import ReservationLinkRepository from "../integrations/repositories/reservationLinkRepository.js";
import ChannexBookingAvailabilityBridge, {
  ChannexBookingAvailabilityRepository,
} from "./channexBookingAvailabilityBridge.js";
import ChannelManagementService from "./channelManagementService.js";
import ChannexCredentialStore from "./providers/channex/credentialStore.js";
import ChannexProviderClient from "./providers/channex/providerClient.js";
import HoliduCredentialStore from "./providers/holidu/credentialStore.js";
import HoliduProviderClient from "./providers/holidu/providerClient.js";
import ChannexBookingRevisionRepository from "./repositories/channexBookingRevisionRepository.js";
import ChannexExternalBookingImportRepository from "./repositories/channexExternalBookingImportRepository.js";
import ChannexSyncEvidenceRepository from "./repositories/channexSyncEvidenceRepository.js";
import ChannexAriExecutionService from "./services/channexAriExecutionService.js";
import ChannexAriOrchestrationService from "./services/channexAriOrchestrationService.js";
import ChannexAriPayloadService from "./services/channexAriPayloadService.js";
import ChannexAvailabilitySyncService from "./services/channexAvailabilitySyncService.js";
import ChannexBookingPollingService from "./services/channexBookingPollingService.js";
import ChannexBookingRevisionImportService from "./services/channexBookingRevisionImportService.js";
import ChannexCertificationService from "./services/channexCertificationService.js";
import ChannexDiagnosticsService from "./services/channexDiagnosticsService.js";
import ChannexFullSyncService from "./services/channexFullSyncService.js";
import ChannexMappingService from "./services/channexMappingService.js";
import {
  summarizeChannexGroupedPayloads,
} from "./utils/channexAriPayloadUtils.js";
import {
  buildSyncDateRangeValidationFailure,
  collectErrorsFromResultList,
  collectTaskIdsFromResultList,
  collectWarningsFromResultList,
  deriveEvidenceOutcome,
  formatChannexAvailabilityProviderResult,
  formatChannexRestrictionProviderResult,
  resultListHasErrors,
  resultListHasWarnings,
} from "./utils/channexAriExecutionUtils.js";

const appendMissingMappingNotes = (notes, missingMappings) =>
  Array.isArray(missingMappings) && missingMappings.length
    ? [...notes, `Missing mappings: ${missingMappings.join(", ")}`]
    : notes;

const describeLocalError = (error) => ({
  code: error?.code || error?.name || "INTERNAL_ERROR",
  message: error?.message || "Unknown error",
  method: error?.method ?? null,
  endpoint: error?.endpoint ?? null,
  httpStatus: error?.status ?? error?.httpStatus ?? null,
  responseBody: error?.responseBody ?? error?.providerResponse ?? null,
});

export default class ChannelManagementApiService {
  constructor({
    accounts = new IntegrationAccountRepository(),
    props = new IntegrationPropertyRepository(),
    ratePlans = new IntegrationRatePlanRepository(),
    roomTypes = new IntegrationRoomTypeRepository(),
    sync = new IntegrationSyncRepository(),
    resLinks = new ReservationLinkRepository(),
    channexEvidence = new ChannexSyncEvidenceRepository(),
    channexBookingRevisions = new ChannexBookingRevisionRepository(),
    bookingAvailabilityRepository = new ChannexBookingAvailabilityRepository(),
    externalBookingImportRepository = new ChannexExternalBookingImportRepository(),
    channexBookingAvailabilityBridge = new ChannexBookingAvailabilityBridge(),
    holiduCredentialStore = new HoliduCredentialStore(),
    holiduProviderClient = new HoliduProviderClient(),
    channexCredentialStore = new ChannexCredentialStore(),
    channexProviderClient = new ChannexProviderClient(),
  } = {}) {
    this.channelManagementService = new ChannelManagementService({
      accounts,
      sync,
      holiduCredentialStore,
      holiduProviderClient,
      channexCredentialStore,
      channexProviderClient,
    });
    this.channexMappingService = new ChannexMappingService({
      accounts,
      props,
      ratePlans,
      roomTypes,
      channexCredentialStore,
      channexProviderClient,
    });
    this.channexAriPayloadService = new ChannexAriPayloadService({
      channexMappingService: this.channexMappingService,
      bookingAvailabilityRepository,
      getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
    });
    this.channexDiagnosticsService = new ChannexDiagnosticsService({
      accounts,
      channexEvidence,
    });
    this.channexAriExecutionService = new ChannexAriExecutionService({
      accounts,
      channexCredentialStore,
      channexProviderClient,
      finalizeChannexSyncResult: (...args) => this.finalizeChannexSyncResult(...args),
      previewChannexAriPayloads: (...args) => this.previewChannexAriPayloads(...args),
      previewChannexAvailabilityPayloads: (...args) =>
        this.previewChannexAvailabilityPayloads(...args),
      previewChannexRestrictionRatePayloads: (...args) =>
        this.previewChannexRestrictionRatePayloads(...args),
    });
    this.channexAriOrchestrationService = new ChannexAriOrchestrationService({
      createChannexSyncFinalizer: (...args) => this.createChannexSyncFinalizer(...args),
      getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
      syncChannexAvailability: (...args) => this.syncChannexAvailability(...args),
      syncChannexRestrictions: (...args) => this.syncChannexRestrictions(...args),
    });
    this.channexFullSyncService = new ChannexFullSyncService({
      channexProviderClient,
      normalizeChannexFullSyncDateContext: (...args) =>
        this.normalizeChannexFullSyncDateContext(...args),
      buildChannexFullSyncPayloadContext: (...args) =>
        this.buildChannexFullSyncPayloadContext(...args),
      buildChannexFullSyncAvailabilityPayloadContext: (...args) =>
        this.buildChannexFullSyncAvailabilityPayloadContext(...args),
      buildChannexFullSyncRestrictionsPayloadContext: (...args) =>
        this.buildChannexFullSyncRestrictionsPayloadContext(...args),
      finalizeChannexSyncResult: (...args) => this.finalizeChannexSyncResult(...args),
      getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
      buildChannexAriTargetsFailureEvidencePatch: (...args) =>
        this.buildChannexAriTargetsFailureEvidencePatch(...args),
      buildChannexMultiStepMappingSnapshot: (...args) =>
        this.buildChannexMultiStepMappingSnapshot(...args),
      buildBlockedChannexMultiStepSyncResult: (...args) =>
        this.buildBlockedChannexMultiStepSyncResult(...args),
      resolveChannexSyncCredentialContext: (...args) =>
        this.resolveChannexSyncCredentialContext(...args),
      logChannexFullCertificationSync: (...args) =>
        this.channexDiagnosticsService.logChannexFullCertificationSync(...args),
    });
    this.channexCertificationService = new ChannexCertificationService({
      externalBookingImportRepository,
      channexBookingAvailabilityBridge,
      channexProviderClient,
      finalizeChannexSyncResult: (...args) => this.finalizeChannexSyncResult(...args),
      getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
      buildChannexAriTargetsFailureEvidencePatch: (...args) =>
        this.buildChannexAriTargetsFailureEvidencePatch(...args),
      buildChannexMultiStepMappingSnapshot: (...args) =>
        this.buildChannexMultiStepMappingSnapshot(...args),
      buildBlockedChannexMultiStepSyncResult: (...args) =>
        this.buildBlockedChannexMultiStepSyncResult(...args),
      resolveChannexSyncCredentialContext: (...args) =>
        this.resolveChannexSyncCredentialContext(...args),
    });
    this.channexBookingRevisionImportService =
      new ChannexBookingRevisionImportService({
        accounts,
        props,
        ratePlans,
        roomTypes,
        resLinks,
        channexBookingRevisions,
        externalBookingImportRepository,
        channexBookingAvailabilityBridge,
        channexCredentialStore,
        channexProviderClient,
        finalizeChannexSyncResult: (...args) => this.finalizeChannexSyncResult(...args),
      });
    this.channexAvailabilitySyncService = new ChannexAvailabilitySyncService({
      channexBookingAvailabilityBridge,
      channexProviderClient,
      createChannexSyncFinalizer: (...args) => this.createChannexSyncFinalizer(...args),
      buildSyncDateRangeValidationFailure,
      appendMissingMappingNotes,
      getChannexAriTargets: (...args) => this.getChannexAriTargets(...args),
      buildChannexAriTargetsFailureEvidencePatch: (...args) =>
        this.buildChannexAriTargetsFailureEvidencePatch(...args),
      buildChannexMultiStepMappingSnapshot: (...args) =>
        this.buildChannexMultiStepMappingSnapshot(...args),
      buildChannexFullSyncAvailabilityPayloadContext: (...args) =>
        this.buildChannexFullSyncAvailabilityPayloadContext(...args),
      buildChannexFullSyncPayloadContext: (...args) =>
        this.buildChannexFullSyncPayloadContext(...args),
      resolveChannexSyncCredentialContext: (...args) =>
        this.resolveChannexSyncCredentialContext(...args),
      summarizeChannexGroupedPayloads,
      formatChannexAvailabilityProviderResult,
      formatChannexRestrictionProviderResult,
      collectTaskIdsFromResultList,
      collectWarningsFromResultList,
      collectErrorsFromResultList,
      resultListHasErrors,
      resultListHasWarnings,
      deriveEvidenceOutcome,
      describeLocalError,
    });
    this.channexBookingPollingService = new ChannexBookingPollingService({
      accounts,
      props,
      sync,
      channexCredentialStore,
      pullLatestChannexBookingsForResolvedContext: (...args) =>
        this.channexBookingRevisionImportService.pullLatestChannexBookingsForResolvedContext(
          ...args
        ),
    });
  }

  async connectHolidu(...args) {
    return this.channelManagementService.connectHolidu(...args);
  }

  async checkHoliduStatus(...args) {
    return this.channelManagementService.checkHoliduStatus(...args);
  }

  async disconnectHolidu(...args) {
    return this.channelManagementService.disconnectHolidu(...args);
  }

  async connectChannex(...args) {
    return this.channelManagementService.connectChannex(...args);
  }

  async checkChannexStatus(...args) {
    return this.channelManagementService.checkChannexStatus(...args);
  }

  async disconnectChannex(...args) {
    return this.channelManagementService.disconnectChannex(...args);
  }

  async listChannexProperties(...args) {
    return this.channexMappingService.listChannexProperties(...args);
  }

  async listChannexRoomTypes(...args) {
    return this.channexMappingService.listChannexRoomTypes(...args);
  }

  async listChannexRatePlans(...args) {
    return this.channexMappingService.listChannexRatePlans(...args);
  }

  async linkChannexProperty(...args) {
    return this.channexMappingService.linkChannexProperty(...args);
  }

  async linkChannexRoomType(...args) {
    return this.channexMappingService.linkChannexRoomType(...args);
  }

  async linkChannexRatePlan(...args) {
    return this.channexMappingService.linkChannexRatePlan(...args);
  }

  async saveChannexSetupMapping(...args) {
    return this.channexMappingService.saveChannexSetupMapping(...args);
  }

  async listLinkedChannexRoomTypes(...args) {
    return this.channexMappingService.listLinkedChannexRoomTypes(...args);
  }

  async listLinkedChannexRatePlans(...args) {
    return this.channexMappingService.listLinkedChannexRatePlans(...args);
  }

  async getChannexAriTargets(...args) {
    return this.channexMappingService.getChannexAriTargets(...args);
  }

  async previewChannexAri(...args) {
    return this.channexAriPayloadService.previewChannexAri(...args);
  }

  async previewChannexAriPayloads(...args) {
    return this.channexAriPayloadService.previewChannexAriPayloads(...args);
  }

  async previewChannexAvailabilityPayloads(...args) {
    return this.channexAriPayloadService.previewChannexAvailabilityPayloads(...args);
  }

  async previewChannexRestrictionRatePayloads(...args) {
    return this.channexAriPayloadService.previewChannexRestrictionRatePayloads(...args);
  }

  async finalizeChannexSyncResult(...args) {
    return this.channexDiagnosticsService.finalizeChannexSyncResult(...args);
  }

  async listChannexSyncEvidence(...args) {
    return this.channexDiagnosticsService.listChannexSyncEvidence(...args);
  }

  async getChannexSyncEvidence(...args) {
    return this.channexDiagnosticsService.getChannexSyncEvidence(...args);
  }

  async getLatestChannexSyncEvidenceSummary(...args) {
    return this.channexDiagnosticsService.getLatestChannexSyncEvidenceSummary(...args);
  }

  async listChannexBookingRevisions(...args) {
    return this.channexBookingRevisionImportService.listChannexBookingRevisions(...args);
  }

  async cancelChannexCertificationBooking(...args) {
    return this.channexCertificationService.cancelChannexCertificationBooking(...args);
  }

  async receiveChannexBookingRevisions(...args) {
    return this.channexBookingRevisionImportService.receiveChannexBookingRevisions(...args);
  }

  async pullLatestChannexBookings(...args) {
    return this.channexBookingRevisionImportService.pullLatestChannexBookings(...args);
  }

  async pollLatestChannexBookings(...args) {
    return this.channexBookingPollingService.pollLatestChannexBookings(...args);
  }

  async acknowledgeChannexBookingRevisions(...args) {
    return this.channexBookingRevisionImportService.acknowledgeChannexBookingRevisions(...args);
  }

  resolveChannexSyncCredentialContext(...args) {
    return this.channexAriExecutionService.resolveChannexSyncCredentialContext(...args);
  }

  createChannexSyncFinalizer(...args) {
    return this.channexAriExecutionService.createChannexSyncFinalizer(...args);
  }

  async syncChannexBookingAvailability(...args) {
    return this.channexAvailabilitySyncService.syncChannexBookingAvailability(...args);
  }

  async syncChannexCalendarChange(...args) {
    return this.channexAvailabilitySyncService.syncChannexCalendarChange(...args);
  }

  async syncChannexAvailability(...args) {
    return this.channexAriExecutionService.syncChannexAvailability(...args);
  }

  async syncChannexRestrictions(...args) {
    return this.channexAriExecutionService.syncChannexRestrictions(...args);
  }

  normalizeChannexFullSyncDateContext(...args) {
    return this.channexAriPayloadService.normalizeChannexFullSyncDateContext(...args);
  }

  async buildChannexFullSyncPayloadContext(...args) {
    return this.channexAriPayloadService.buildChannexFullSyncPayloadContext(...args);
  }

  async buildChannexFullSyncAvailabilityPayloadContext(...args) {
    return this.channexAriPayloadService.buildChannexFullSyncAvailabilityPayloadContext(...args);
  }

  async buildChannexFullSyncRestrictionsPayloadContext(...args) {
    return this.channexAriPayloadService.buildChannexFullSyncRestrictionsPayloadContext(...args);
  }

  buildChannexMultiStepMappingSnapshot(...args) {
    return this.channexAriOrchestrationService.buildChannexMultiStepMappingSnapshot(...args);
  }

  buildChannexAriTargetsFailureEvidencePatch(...args) {
    return this.channexAriOrchestrationService.buildChannexAriTargetsFailureEvidencePatch(...args);
  }

  buildBlockedChannexMultiStepSyncResult(...args) {
    return this.channexAriOrchestrationService.buildBlockedChannexMultiStepSyncResult(...args);
  }

  async syncChannexAri(...args) {
    return this.channexAriOrchestrationService.syncChannexAri(...args);
  }

  async syncChannexFull(...args) {
    return this.channexFullSyncService.syncChannexFull(...args);
  }

  async syncChannexCertificationTestCase(...args) {
    return this.channexCertificationService.syncChannexCertificationTestCase(...args);
  }
}
