import { UnifiedThread } from "../../../models/unified/messaging/UnifiedThread.js";
import { UnifiedMessage } from "../../../models/unified/messaging/UnifiedMessage.js";

import { ChannelIntegrationAccount } from "../../../models/unified/integrations/ChannelIntegrationAccount.js";
import { ChannelIntegrationProperty } from "../../../models/unified/integrations/ChannelIntegrationProperty.js";
import { ChannelReservationLink } from "../../../models/unified/integrations/ChannelReservationLink.js";

import { IntegrationSyncState } from "../../../models/unified/sync/IntegrationSyncState.js";
import { IntegrationSyncLog } from "../../../models/unified/sync/IntegrationSyncLog.js";
import { MessagingPreference } from "../../../models/unified/preferences/MessagingPreference.js";
import { MessagingTemplate } from "../../../models/unified/preferences/MessagingTemplate.js";
import { MessagingAutoReplyRule } from "../../../models/unified/preferences/MessagingAutoReplyRule.js";
import { MessagingSchedulerRule } from "../../../models/unified/preferences/MessagingSchedulerRule.js";
import { MessagingSchedulerExecutionLog } from "../../../models/unified/preferences/MessagingSchedulerExecutionLog.js";
import { MessagingReservationAutomationPause } from "../../../models/unified/preferences/MessagingReservationAutomationPause.js";

export const Tables = [

  UnifiedThread,
  UnifiedMessage,

  ChannelIntegrationAccount,
  ChannelIntegrationProperty,
  ChannelReservationLink,

  IntegrationSyncState,
  IntegrationSyncLog,

  MessagingPreference,
  MessagingTemplate,
  MessagingAutoReplyRule,
  MessagingSchedulerRule,
  MessagingSchedulerExecutionLog,
  MessagingReservationAutomationPause,
];
