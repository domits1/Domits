import { describeDisconnectConfirm } from "./disconnectConfirm";

const NORMAL = (name) =>
  `${name} will be disconnected. Your listing there will be closed for new bookings. Existing bookings stay valid, but changes to them will not reach Domits.`;

describe("describeDisconnectConfirm", () => {
  test.each([
    ["BookingCom", "Booking.com", "in the Booking.com extranet"],
    ["Airbnb", "Airbnb", "in your Airbnb calendar"],
    ["Vrbo", "Vrbo", "in your Vrbo calendar"],
  ])(
    "%s: the title, what happens, where to reopen the dates, and that it can be turned on again",
    (otaCode, name, place) => {
      expect(describeDisconnectConfirm({ otaCode, upcomingBookingCount: 0 })).toEqual({
        title: `Turn off ${name}?`,
        lines: [
          NORMAL(name),
          `To keep selling on ${name} yourself, reopen your dates ${place}.`,
          `You can turn ${name} on again later.`,
        ],
      });
    }
  );

  test.each([
    [1, "You have 1 upcoming booking from Airbnb."],
    [2, "You have 2 upcoming bookings from Airbnb."],
    [12, "You have 12 upcoming bookings from Airbnb."],
  ])("with %i upcoming bookings it adds: %s", (count, sentence) => {
    const { lines } = describeDisconnectConfirm({ otaCode: "Airbnb", upcomingBookingCount: count });

    expect(lines).toContain(sentence);
    expect(lines).toHaveLength(4);
  });

  test("the upcoming bookings line follows the sentence about existing bookings", () => {
    const { lines } = describeDisconnectConfirm({ otaCode: "Vrbo", upcomingBookingCount: 3 });

    expect(lines[0]).toBe(NORMAL("Vrbo"));
    expect(lines[1]).toBe("You have 3 upcoming bookings from Vrbo.");
  });

  test.each([
    ["zero", 0],
    ["a negative number", -2],
    ["not a number", Number.NaN],
    ["a fraction", 1.5],
    ["missing", undefined],
    ["text", "3"],
  ])("%s adds no upcoming bookings line", (_name, count) => {
    const { lines } = describeDisconnectConfirm({ otaCode: "Airbnb", upcomingBookingCount: count });

    expect(lines).toHaveLength(3);
    expect(lines.join(" ")).not.toContain("upcoming");
  });

  test("a channel that was disconnected outside Domits says so, tells the host to close their dates, and can still be turned on again", () => {
    expect(
      describeDisconnectConfirm({ otaCode: "Vrbo", upcomingBookingCount: 0, disconnectedOutsideDomits: true })
    ).toEqual({
      title: "Turn off Vrbo?",
      lines: [
        "Vrbo was already disconnected outside Domits. Turning it off clears this.",
        "Close your dates on Vrbo yourself: Domits can no longer close them.",
        "You can turn Vrbo on again later.",
      ],
    });
  });

  test("the disconnected-outside variant keeps the upcoming bookings line", () => {
    const { lines } = describeDisconnectConfirm({
      otaCode: "Vrbo",
      upcomingBookingCount: 1,
      disconnectedOutsideDomits: true,
    });

    expect(lines).toContain("You have 1 upcoming booking from Vrbo.");
  });

  test("an OTA without its own entry still gets a complete text, with its plain name", () => {
    const { title, lines } = describeDisconnectConfirm({ otaCode: "Expedia", upcomingBookingCount: 0 });

    expect(title).toBe("Turn off Expedia?");
    expect(lines).toContain("To keep selling on Expedia yourself, reopen your dates on Expedia.");
  });
});
