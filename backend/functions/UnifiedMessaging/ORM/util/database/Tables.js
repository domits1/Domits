import { UnifiedThread } from "../../../models/unified/messaging/UnifiedThread.js";
import { UnifiedMessage } from "../../../models/unified/messaging/UnifiedMessage.js";

import { ChannelIntegrationAccount } from "../../../models/unified/integrations/ChannelIntegrationAccount.js";
import { ChannelIntegrationProperty } from "../../../models/unified/integrations/ChannelIntegrationProperty.js";
import { ChannelIntegrationRatePlan } from "../../../models/unified/integrations/ChannelIntegrationRatePlan.js";
import { ChannelIntegrationRoomType } from "../../../models/unified/integrations/ChannelIntegrationRoomType.js";
import { ChannelReservationLink } from "../../../models/unified/integrations/ChannelReservationLink.js";

import { IntegrationSyncState } from "../../../models/unified/sync/IntegrationSyncState.js";
import { IntegrationSyncLog } from "../../../models/unified/sync/IntegrationSyncLog.js";

export const Tables = [

  UnifiedThread,
  UnifiedMessage,

  ChannelIntegrationAccount,
  ChannelIntegrationProperty,
  ChannelIntegrationRatePlan,
  ChannelIntegrationRoomType,
  ChannelReservationLink,

  IntegrationSyncState,
  IntegrationSyncLog,
];
