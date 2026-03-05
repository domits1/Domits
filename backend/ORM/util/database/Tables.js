import { User_Table } from "../../../../../ORM/models/User_Table.js";
import { Amenities } from "../../../../../ORM/models/Amenities.js";
import { Amenity_And_Category } from "../../../../../ORM/models/Amenity_And_Category.js";
import { Amenity_Categories } from "../../../../../ORM/models/Amenity_Categories.js";
import { Availability_Restrictions } from "../../../../../ORM/models/Availability_Restrictions.js";
import { Booking } from "../../../../../ORM/models/Booking.js";
import { Property_Test_Status } from "../../../../../ORM/models/Property_Test_Status.js";
import { Faq } from "../../../../../ORM/models/Faq.js";
import { General_Details } from "../../../../../ORM/models/General_Details.js";
import { Guest_Favorite } from "../../../../../ORM/models/Guest_Favorite.js";
import { Payment } from "../../../../../ORM/models/Payment.js";
import { Property } from "../../../../../ORM/models/Property.js";
import { Property_Amenity } from "../../../../../ORM/models/Property_Amenity.js";
import { Property_Availability } from "../../../../../ORM/models/Property_Availability.js";
import { Property_Availability_Restriction } from "../../../../../ORM/models/Property_Availability_Restriction.js";
import { Property_Check_In } from "../../../../../ORM/models/Property_Check_In.js";
import { Property_General_Detail } from "../../../../../ORM/models/Property_General_Detail.js";
import { Property_Image } from "../../../../../ORM/models/Property_Image.js";
import { Property_Image_Legacy } from "../../../../../ORM/models/Property_Image_Legacy.js";
import { Property_Image_Variant } from "../../../../../ORM/models/Property_Image_Variant.js";
import { Property_Location } from "../../../../../ORM/models/Property_Location.js";
import { Property_Pricing } from "../../../../../ORM/models/Property_Pricing.js";
import { Property_Rule } from "../../../../../ORM/models/Property_Rule.js";
import { Property_Technical_Details } from "../../../../../ORM/models/Property_Technical_Details.js";
import { Property_Types } from "../../../../../ORM/models/Property_Types.js";
import { Rules } from "../../../../../ORM/models/Rules.js";
import { Property_Type } from "../../../../../ORM/models/Property_Type.js";
import { Stripe_Connected_Accounts } from "../../../../../ORM/models/Stripe_Connected_Accounts.js";

import { UnifiedThread } from "../../../../../ORM/models/unified/messaging/UnifiedThread.js";
import { UnifiedMessage } from "../../../../../ORM/models/unified/messaging/UnifiedMessage.js";

import { ChannelIntegrationAccount } from "../../../../../ORM/models/unified/integrations/ChannelIntegrationAccount.js";
import { ChannelIntegrationProperty } from "../../../../../ORM/models/unified/integrations/ChannelIntegrationProperty.js";
import { ChannelReservationLink } from "../../../../../ORM/models/unified/integrations/ChannelReservationLink.js";
import { IntegrationSyncState } from "../../../../../ORM/models/unified/sync/IntegrationSyncState.js";
import { IntegrationSyncLog } from "../../../../../ORM/models/unified/sync/IntegrationSyncLog.js";
import { UnifiedThreadNote } from "../../../../../ORM/models/unified/collaboration/UnifiedThreadNote.js";

export const Tables = [
  Amenities,
  Amenity_And_Category,
  Amenity_Categories,
  Availability_Restrictions,
  Booking,
  Faq,
  General_Details,
  Guest_Favorite,
  Payment,
  Property,
  Property_Amenity,
  Property_Availability,
  Property_Availability_Restriction,
  Property_Check_In,
  Property_General_Detail,
  Property_Image,
  Property_Image_Legacy,
  Property_Image_Variant,
  Property_Location,
  Property_Pricing,
  Property_Rule,
  Property_Technical_Details,
  Property_Test_Status,
  Property_Type,
  Property_Types,
  Rules,
  Stripe_Connected_Accounts,

  UnifiedThread,
  UnifiedMessage,

  ChannelIntegrationAccount,
  ChannelIntegrationProperty,
  ChannelReservationLink,
  IntegrationSyncState,
  IntegrationSyncLog,
  UnifiedThreadNote,

  User_Table,
];