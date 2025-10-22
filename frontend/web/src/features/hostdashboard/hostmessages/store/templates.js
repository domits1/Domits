export const messageTemplates = [
  {
    id: "check_in_instructions",
    title: "Check-in instructions",
    content:
      "Hello {{guestName}},\n\nWe're excited to host you! Check-in is from 15:00. Your key code is {{keyCode}}. The address is {{address}}.\n\nParking: {{parkingInfo}}\nWi‑Fi: {{wifiName}} / {{wifiPassword}}\nHouse rules: {{houseRulesLink}}\n\nIf you need anything, just message me here."
  },
  {
    id: "house_rules",
    title: "House rules",
    content:
      "Hi {{guestName}},\n\nA quick reminder of our house rules:\n- No smoking indoors\n- Quiet hours after 22:00\n- Please remove shoes inside\n- Only registered guests allowed\n\nFull rules: {{houseRulesLink}}\nThanks for understanding!"
  },
  {
    id: "welcome_message",
    title: "Welcome message",
    content:
      "Welcome to {{propertyName}} 🎉\n\nCheck-in: {{checkIn}}\nCheck-out: {{checkOut}}\nGuests: {{numGuests}}\n\nLet me know if you have any questions or special requests. Have a wonderful stay!"
  },
  {
    id: "checkout_instructions",
    title: "Checkout instructions",
    content:
      "Good morning {{guestName}},\n\nCheckout is at {{checkoutTime}}. Please:\n- Leave keys on the table\n- Turn off lights and AC\n- Take out trash to {{trashLocation}}\n\nSafe travels and thank you for staying with us!"
  }
];


