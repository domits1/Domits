export const filterByGuests = (properties, guests) => {
    const guestNumber = Number.parseInt(guests, 10);

    if (Number.isNaN(guestNumber)) {
      console.warn("Invalid or missing 'guests' parameter");
      return properties; 
    }
  
    return properties.filter((p) => {
      const capacity = p?.property?.guestCapacity;
      if (typeof capacity !== "number") return true;
      return capacity >= guestNumber;
    });
  };
  