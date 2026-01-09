import { User_Table } from "../../models/User_Table.js";
import { Amenities } from "../../models/Amenities.js";
import { Amenity_And_Category } from "../../models/Amenity_And_Category.js";
import { Amenity_Categories } from "../../models/Amenity_Categories.js";
import { Availability_Restrictions } from "../../models/Availability_Restrictions.js";
import { Booking } from "../../models/Booking.js";
import { Property_Test_Status } from "../../models/Property_Test_Status.js";
import { Faq } from "../../models/Faq.js";
import { General_Details } from "../../models/General_Details.js";
import { Guest_Favorite } from "../../models/Guest_Favorite.js";
import { Payment } from "../../models/Payment.js";
import { Property } from "../../models/Property.js";
import { Property_Amenity } from "../../models/Property_Amenity.js";
import { Property_Availability } from "../../models/Property_Availability.js";
import { Property_Availability_Restriction } from "../../models/Property_Availability_Restriction.js";
import { Property_Check_In } from "../../models/Property_Check_In.js";
import { Property_General_Detail } from "../../models/Property_General_Detail.js";
import { Property_Image } from "../../models/Property_Image.js";
import { Property_Location } from "../../models/Property_Location.js";
import { Property_Pricing } from "../../models/Property_Pricing.js";
import { Property_Rule } from "../../models/Property_Rule.js";
import { Property_Technical_Details } from "../../models/Property_Technical_Details.js";
import { Property_Types } from "../../models/Property_Types.js";
import { Rules } from "../../models/Rules.js";
import { Property_Type } from "../../models/Property_Type.js";
import { Stripe_Connected_Accounts } from "../../models/Stripe_Connected_Accounts.js";
import { UnifiedThread } from "../../../models/UnifiedThread.js";
import { UnifiedMessage } from "../../../models/UnifiedMessage.js";

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
  User_Table,
];
