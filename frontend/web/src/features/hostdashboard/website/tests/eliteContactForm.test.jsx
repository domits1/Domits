import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import EliteContactForm, { CONTACT_REQUEST_TIMEOUT_MS } from "../rendering/templates/elite/EliteContactForm";
import { PUBLIC_WEBSITE_CONTACT_URL } from "../services/websitePublicContactService";

const TEXT = Object.freeze({
  sent: "Your message was sent. The host replies by email.",
  unconfirmed: "We could not confirm that your message was sent. Wait a few minutes before you send it again.",
  notSent: "Your message could not be sent. Please try again later.",
  rate: "Too many messages were sent. Your message was not sent. Please try again later.",
  site: "This website cannot receive messages. Your message was not sent.",
  off: "Messages cannot be sent from this website yet. Your message was not sent.",
  gone: "This property is no longer on this website. Choose another one or a general question.",
  check: "Your message was not sent. Check the marked fields.",
});
const PICKER = "Which property is it about?";
const PHONE = "Phone (optional)";
const SITE = Object.freeze({ siteId: "site-1", properties: [] });
const VILLA_A = Object.freeze({ propertyId: "property-a", title: "Villa A" });
const SITE_WITH_VILLAS = Object.freeze({
  siteId: "site-1",
  properties: [VILLA_A, { propertyId: "property-b", title: "Villa B" }],
});
const GUEST = Object.freeze({ Name: "Anna de Vries", Email: "anna@example.com", Message: "Is the pool heated?" });
const char = (code) => String.fromCharCode(code);
const failure = (code, extra = {}) => ({ error: { code, ...extra } });

const answer = (status, body) => ({
  status,
  text: async () => {
    if (body === undefined) throw new Error("lost");
    return typeof body === "string" ? body : JSON.stringify(body);
  },
});
const answerFetch = (...answers) => {
  const fetchMock = jest.spyOn(globalThis, "fetch");
  answers.forEach((next) => fetchMock.mockResolvedValueOnce(next));
  return fetchMock;
};
const holdFetch = () =>
  jest
    .spyOn(globalThis, "fetch")
    .mockImplementation(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))))
    );
const fill = (fields) =>
  Object.entries(fields).forEach(([label, value]) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  );
const send = () => act(async () => fireEvent.click(screen.getByRole("button", { name: "Send message" })));
const sentBody = (call = 0) => JSON.parse(globalThis.fetch.mock.calls[call][1].body);
const valueOf = (label) => screen.getByLabelText(label).value;
const errorOf = (label) =>
  document.getElementById(screen.getByLabelText(label).getAttribute("aria-describedby"))?.textContent;
const sendWith = async (contactContext, fields) => {
  render(<EliteContactForm contactContext={contactContext} />);
  fill(fields);
  await send();
};

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("sending a contact message", () => {
  it("sends the message for the site and shows it as sent only after the confirmation", async () => {
    const fetchMock = answerFetch(answer(200, { status: "SENT", requestId: "request-1" }));
    await sendWith(SITE, GUEST);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(PUBLIC_WEBSITE_CONTACT_URL);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(fetchMock.mock.calls[0][1].body).toBe(
      JSON.stringify({ siteId: "site-1", name: GUEST.Name, email: GUEST.Email, message: GUEST.Message })
    );
    expect(screen.getByRole("status")).toHaveTextContent(TEXT.sent);
    expect(screen.queryByLabelText(PICKER)).toBeNull();
    expect([valueOf("Name"), valueOf("Message")]).toEqual(["", ""]);
  });

  it("offers a general question and the served properties, and sends the chosen one with the phone", async () => {
    answerFetch(answer(200, { status: "SENT" }), answer(200, { status: "SENT" }));
    render(<EliteContactForm contactContext={SITE_WITH_VILLAS} />);

    const options = Array.from(screen.getByLabelText(PICKER).options);
    expect(options.map((option) => [option.value, option.textContent])).toEqual([
      ["", "A general question"],
      ["property-a", "Villa A"],
      ["property-b", "Villa B"],
    ]);

    fill({ ...GUEST, [PHONE]: " +31 6 1234 5678 ", [PICKER]: "property-b" });
    await send();
    fill(GUEST);
    await send();

    expect(sentBody(0)).toEqual({
      siteId: "site-1",
      propertyId: "property-b",
      name: GUEST.Name,
      email: GUEST.Email,
      phone: "+31 6 1234 5678",
      message: GUEST.Message,
    });
    expect(sentBody(1)).not.toHaveProperty("propertyId");
  });

  it("cleans pasted text before it is sent", async () => {
    answerFetch(answer(200, { status: "SENT" }));
    await sendWith(SITE, {
      Name: `Anna${char(9)}de${char(0x2028)}Vries${char(11)}`,
      Email: " anna@example.com ",
      Message: `Line one\r\nLine two${char(0)}${char(11)}\rLine three${char(0x2029)}a${char(9)}b`,
    });

    expect(sentBody()).toEqual({
      siteId: "site-1",
      name: "Anna de Vries",
      email: "anna@example.com",
      message: `Line one\nLine two\nLine three\na${char(9)}b`,
    });
  });
});

describe("a message the server did not confirm or refused", () => {
  it.each([
    ["a 200 without SENT", 200, { status: "QUEUED" }, TEXT.unconfirmed],
    ["a 200 that is not JSON", 200, "<html>", TEXT.unconfirmed],
    ["a 200 whose body is lost", 200, undefined, TEXT.unconfirmed],
    ["an unexpected 204", 204, "", TEXT.unconfirmed],
    ["message_not_confirmed on a 400", 400, failure("message_not_confirmed"), TEXT.unconfirmed],
    ["message_not_confirmed", 504, failure("message_not_confirmed", { message: "Sent." }), TEXT.unconfirmed],
    ["a gateway 504", 504, { message: "Endpoint request timed out" }, TEXT.unconfirmed],
    ["a gateway 502", 502, { message: "Internal server error" }, TEXT.unconfirmed],
    ["a 503 without a code", 503, { message: "Service Unavailable" }, TEXT.unconfirmed],
    ["a network error", null, null, TEXT.unconfirmed],
    ["site_not_found", 404, failure("site_not_found"), TEXT.site],
    ["rate_limited", 429, failure("rate_limited"), TEXT.rate],
    ["a gateway 429", 429, { message: "Too Many Requests" }, TEXT.rate],
    ["contact_unavailable", 503, failure("contact_unavailable"), TEXT.off],
    ["message_not_sent", 503, failure("message_not_sent"), TEXT.notSent],
    ["a 400 on the site id", 400, failure("invalid_request", { field: "siteId" }), TEXT.notSent],
    ["a gateway 403", 403, { message: "Missing Authentication Token" }, TEXT.notSent],
  ])("shows %s without calling it sent and keeps what the guest typed", async (_label, status, body, text) => {
    if (status) answerFetch(answer(status, body));
    else jest.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    await sendWith(SITE, GUEST);

    expect(screen.getByRole("alert")).toHaveTextContent(text);
    expect(screen.queryByText(TEXT.sent)).toBeNull();
    expect([valueOf("Name"), valueOf("Email"), valueOf("Message")]).toEqual(Object.values(GUEST));
    expect(screen.getByRole("button", { name: "Send message" })).toBeEnabled();
  });

  it.each([
    ["Name", "name", "Your name can be at most 100 characters.", "Your name can be at most 100 characters."],
    ["Email", "email", "", "Please enter a valid email address."],
    [PHONE, "phone", "", "Please enter a valid phone number."],
    ["Message", "message", " ", "Please enter a message."],
  ])("shows a refused %s next to that field", async (label, field, serverText, shown) => {
    answerFetch(answer(400, failure("invalid_request", { field, message: serverText })));
    await sendWith(SITE, { ...GUEST, [PHONE]: "12" });

    expect(errorOf(label)).toBe(shown);
    expect(screen.getAllByRole("textbox").filter((box) => box.getAttribute("aria-invalid") === "true")).toEqual([
      screen.getByLabelText(label),
    ]);
    expect(screen.getByRole("alert")).toHaveTextContent(TEXT.check);
  });

  it.each([
    ["property_not_found", 404, failure("property_not_found")],
    ["a refused property id", 400, failure("invalid_request", { field: "propertyId" })],
  ])("shows %s next to the property picker", async (_label, status, body) => {
    answerFetch(answer(status, body));
    await sendWith(SITE_WITH_VILLAS, { ...GUEST, [PICKER]: "property-b" });

    expect(errorOf(PICKER)).toBe(TEXT.gone);
    expect(valueOf(PICKER)).toBe("property-b");
  });
});

describe("what the form checks before it sends", () => {
  it.each([
    ["Name", "", "Please enter your name."],
    ["Email", "", "Please enter your email address."],
    ["Email", "anna.example.com", "Please enter a valid email address."],
    ["Message", ` ${char(0)} `, "Please enter a message."],
    ["Message", "a".repeat(5001), "Your message can be at most 5000 characters."],
  ])("refuses %s %#, sends nothing and keeps the text", async (label, value, text) => {
    const fetchMock = jest.spyOn(globalThis, "fetch");
    await sendWith(SITE, { ...GUEST, [label]: value });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorOf(label)).toBe(text);
    expect(valueOf(label)).toBe(value);
    expect(screen.getByRole("alert")).toHaveTextContent(TEXT.check);
  });

  it("counts the message limit in characters", async () => {
    answerFetch(answer(200, { status: "SENT" }));
    await sendWith(SITE, { ...GUEST, Message: "😀".repeat(5000) });

    expect(sentBody().message).toBe("😀".repeat(5000));
  });

  it("refuses a property that is no longer served, and sends none once the site serves no list", async () => {
    const fetchMock = answerFetch(answer(200, { status: "SENT" }));
    const { rerender } = render(<EliteContactForm contactContext={SITE_WITH_VILLAS} />);
    fill({ ...GUEST, [PICKER]: "property-b" });

    rerender(<EliteContactForm contactContext={{ ...SITE_WITH_VILLAS, properties: [VILLA_A] }} />);
    await send();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(errorOf(PICKER)).toBe(TEXT.gone);

    rerender(<EliteContactForm contactContext={SITE} />);
    await send();
    expect(sentBody()).not.toHaveProperty("propertyId");
  });
});

describe("a slow or repeated send", () => {
  it("sends once when the guest submits twice, and stops the request when the page goes away", async () => {
    const fetchMock = holdFetch();
    const { unmount } = render(<EliteContactForm contactContext={SITE} />);
    fill(GUEST);

    await act(async () => {
      const form = screen.getByRole("button", { name: "Send message" }).closest("form");
      fireEvent.submit(form);
      fireEvent.submit(form);
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
    expect(screen.getByLabelText("Message")).toBeDisabled();
    unmount();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it("stops waiting after the time limit, shows not confirmed, and sends again without a timer left", async () => {
    jest.useFakeTimers();
    const fetchMock = holdFetch();
    await sendWith(SITE, GUEST);

    await act(async () => jest.advanceTimersByTime(CONTACT_REQUEST_TIMEOUT_MS - 1));
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => jest.advanceTimersByTime(1));

    expect(screen.getByRole("alert")).toHaveTextContent(TEXT.unconfirmed);
    expect(valueOf("Message")).toBe(GUEST.Message);
    fetchMock.mockResolvedValueOnce(answer(200, { status: "SENT" }));
    await send();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status")).toHaveTextContent(TEXT.sent);
    expect(jest.getTimerCount()).toBe(0);
  });
});
