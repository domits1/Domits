import { gql } from '@apollo/client';

/**
 * Save calendar prices for a property
 * Creates or updates calendar price entries
 */
export const SAVE_CALENDAR_PRICES = gql`
  mutation SaveCalendarPrices($input: SaveCalendarPricesInput!) {
    saveCalendarPrices(input: $input) {
      propertyId
      prices {
        date
        price
      }
      success
      message
    }
  }
`;

/**
 * Save blocked dates for a property
 */
export const SAVE_BLOCKED_DATES = gql`
  mutation SaveBlockedDates($input: SaveBlockedDatesInput!) {
    saveBlockedDates(input: $input) {
      propertyId
      blockedDates
      success
      message
    }
  }
`;

/**
 * Save maintenance dates for a property
 */
export const SAVE_MAINTENANCE_DATES = gql`
  mutation SaveMaintenanceDates($input: SaveMaintenanceDatesInput!) {
    saveMaintenanceDates(input: $input) {
      propertyId
      maintenanceDates {
        date
        note
      }
      success
      message
    }
  }
`;

/**
 * Save all calendar data at once (prices, blocked, maintenance)
 */
export const SAVE_CALENDAR_DATA = gql`
  mutation SaveCalendarData($input: SaveCalendarDataInput!) {
    saveCalendarData(input: $input) {
      propertyId
      prices {
        date
        price
      }
      blockedDates
      maintenanceDates {
        date
        note
      }
      success
      message
    }
  }
`;
