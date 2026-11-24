const DEFAULT_GUEST_COUNT = 2;

export const resolveGuestCapacity = (model) => {
  const capacity = Number(model?.stay?.guests);
  return Number.isInteger(capacity) && capacity > 0 ? capacity : null;
};

export const resolveDefaultGuestCount = (capacity) =>
  capacity ? Math.min(DEFAULT_GUEST_COUNT, capacity) : DEFAULT_GUEST_COUNT;

export const resolveHostContactHref = (model) => {
  const whatsapp = model?.visibility?.chatWidget === false ? null : model?.host?.whatsapp;
  const digits = String(whatsapp?.phoneNumberDigits || "").replaceAll(/\D/g, "");
  return whatsapp?.isAvailable && digits ? `https://wa.me/${digits}` : null;
};
