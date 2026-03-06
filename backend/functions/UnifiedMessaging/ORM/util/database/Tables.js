import { UnifiedThread } from "../../../models/unified/messaging/UnifiedThread.js";
import { UnifiedMessage } from "../../../models/unified/messaging/UnifiedMessage.js";

import { ChannelIntegrationAccount } from "../../../models/unified/integrations/ChannelIntegrationAccount.js";
import { ChannelIntegrationProperty } from "../../../models/unified/integrations/ChannelIntegrationProperty.js";
import { ChannelReservationLink } from "../../../models/unified/integrations/ChannelReservationLink.js";

import { IntegrationSyncState } from "../../../models/unified/sync/IntegrationSyncState.js";
import { IntegrationSyncLog } from "../../../models/unified/sync/IntegrationSyncLog.js";

export const Tables = [

  UnifiedThread,
  UnifiedMessage,

  ChannelIntegrationAccount,
  ChannelIntegrationProperty,
  ChannelReservationLink,

  IntegrationSyncState,
  IntegrationSyncLog,
];