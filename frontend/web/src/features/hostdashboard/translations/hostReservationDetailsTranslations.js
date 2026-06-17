import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const EMPTY_TRANSLATION = Object.freeze({});

const hostReservationDetailsTranslations = {
  en: en.hostDashboard?.reservationDetails ?? EMPTY_TRANSLATION,
  nl: nl.hostDashboard?.reservationDetails ?? EMPTY_TRANSLATION,
  de: de.hostDashboard?.reservationDetails ?? EMPTY_TRANSLATION,
  es: es.hostDashboard?.reservationDetails ?? EMPTY_TRANSLATION,
};

export default hostReservationDetailsTranslations;
