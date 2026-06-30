import { UnifiedThread } from "database/models/unified/messaging/UnifiedThread";
import { UnifiedMessage } from "database/models/unified/messaging/UnifiedMessage";
import { Booking } from "database/models/Booking";
import { Property } from "database/models/Property";
import { MessageAutomation } from "database/models/automation/MessageAutomation";
import { MessageAutomationDelivery } from "database/models/automation/MessageAutomationDelivery";
import { BookingAutomationOutbox } from "database/models/automation/BookingAutomationOutbox";

import { ChannelIntegrationAccount } from "database/models/unified/integrations/ChannelIntegrationAccount";
import { ChannelIntegrationProperty } from "database/models/unified/integrations/ChannelIntegrationProperty";
import { ChannelIntegrationRatePlan } from "database/models/unified/integrations/ChannelIntegrationRatePlan";
import { ChannelIntegrationRoomType } from "database/models/unified/integrations/ChannelIntegrationRoomType";
import { ChannelReservationLink } from "database/models/unified/integrations/ChannelReservationLink";
import { ChannexBookingRevision } from "database/models/unified/integrations/ChannexBookingRevision";

import { IntegrationSyncState } from "database/models/unified/sync/IntegrationSyncState";
import { IntegrationSyncLog } from "database/models/unified/sync/IntegrationSyncLog";
import { ChannexSyncEvidence } from "database/models/unified/sync/ChannexSyncEvidence";

export const Tables = [

  UnifiedThread,
  UnifiedMessage,
  Booking,
  Property,
  MessageAutomation,
  MessageAutomationDelivery,
  BookingAutomationOutbox,

  ChannelIntegrationAccount,
  ChannelIntegrationProperty,
  ChannelIntegrationRatePlan,
  ChannelIntegrationRoomType,
  ChannelReservationLink,
  ChannexBookingRevision,

  IntegrationSyncState,
  IntegrationSyncLog,
  ChannexSyncEvidence,
];
