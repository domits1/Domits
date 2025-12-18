import { gql } from '@apollo/client';

/**
 * Get calendar prices for a property
 * Returns all custom pricing entries for the property
 */
export const GET_CALENDAR_PRICES = gql`
  query GetCalendarPrices($propertyId: ID!) {
    getCalendarPrices(propertyId: $propertyId) {
      propertyId
      prices {
        date
        price
      }
    }
  }
`;

/**
 * Get all calendar data for a property
 * Returns prices, blocked dates, and maintenance dates
 */
export const GET_CALENDAR_DATA = gql`
  query GetCalendarData($propertyId: ID!) {
    getCalendarData(propertyId: $propertyId) {
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
    }
  }
`;

/**
 * Get blocked dates for a property
 */
export const GET_BLOCKED_DATES = gql`
  query GetBlockedDates($propertyId: ID!) {
    getBlockedDates(propertyId: $propertyId) {
      propertyId
      blockedDates
    }
  }
`;

/**
 * Get maintenance dates for a property
 */
export const GET_MAINTENANCE_DATES = gql`
  query GetMaintenanceDates($propertyId: ID!) {
    getMaintenanceDates(propertyId: $propertyId) {
      propertyId
      maintenanceDates {
        date
        note
      }
    }
  }
`;
