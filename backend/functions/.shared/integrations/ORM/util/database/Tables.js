import { UnifiedThread } from "database/models/unified/messaging/UnifiedThread";
import { UnifiedMessage } from "database/models/unified/messaging/UnifiedMessage";

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
