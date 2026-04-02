const fetchPropertyPolicies = async (propertyId) => {
  if (!propertyId) {
    return {};
  }

  try {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/listingDetails?property=${propertyId}`
    );

    if (!response.ok) {
      console.error("Failed to fetch property policies");
      return {};
    }

    const data = await response.json();

    const policies = {};
    if (Array.isArray(data?.rules)) {
      data?.rules?.forEach((rule) => {
        if (rule?.rule) {
          policies[rule.rule] = rule.value;
        }
      });
    }

    return {
      cancellationPolicy: data?.property?.cancellationPolicy || "flexible",
      smokingAllowed: policies.SmokingAllowed === true,
      petsAllowed: policies.PetsAllowed === true,
      partiesAllowed: policies["Parties/EventsAllowed"] === true,
      childrenAllowed: policies.SuitableForChildren === true,
      infantsAllowed: policies.SuitableForInfants === true,
      quietHours: data?.property?.quietHours || "",
      maxGuests: data?.capacity?.guests || data?.property?.maxGuests || 0,
      cookingAllowed: policies.cookingAllowed !== false,
      parkingAvailable: policies.parkingAvailable === true,
      customRules: Array.isArray(data?.property?.customRules) ? data?.property?.customRules : [],
      smokeDetector: policies.smokeDetector === true,
      carbonMonoxideDetector: policies.carbonMonoxideDetector === true,
      fireExtinguisher: policies.fireExtinguisher === true,
      firstAidKit: policies.firstAidKit === true,
      checkInTime: data?.property?.checkInTime || "15:00",
      checkOutTime: data?.property?.checkOutTime || "11:00",
      lateCheckIn: data?.property?.lateCheckIn || "",
      lateCheckOut: data?.property?.lateCheckOut || "",
      preparationTime: data?.property?.preparationTime || "",
    };
  } catch (error) {
    console.error("Error fetching property policies:", error);
    return {};
  }
};

export default fetchPropertyPolicies;
