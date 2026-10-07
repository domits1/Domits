import { toDestinationSlug } from "./destinationSlug.js";

const CONTINENTS = Object.freeze({
  africa: "Africa",
  antarctica: "Antarctica",
  asia: "Asia",
  caribbean: "Caribbean",
  europe: "Europe",
  "north-america": "North America",
  oceania: "Oceania",
  "south-america": "South America",
});

const COUNTRIES_BY_CONTINENT = Object.freeze({
  africa:
    "AO Angola|BF Burkina Faso|BI Burundi|BJ Benin|BW Botswana|CD Congo, Democratic Republic of the|" +
    "CF Central African Republic|CG Congo|CI Côte d'Ivoire|CM Cameroon|CV Cabo Verde|DJ Djibouti|" +
    "DZ Algeria|EG Egypt|EH Western Sahara|ER Eritrea|ET Ethiopia|GA Gabon|GH Ghana|GM Gambia|GN Guinea|" +
    "GQ Equatorial Guinea|GW Guinea-Bissau|KE Kenya|KM Comoros|LR Liberia|LS Lesotho|LY Libya|MA Morocco|" +
    "MG Madagascar|ML Mali|MR Mauritania|MU Mauritius|MW Malawi|MZ Mozambique|NA Namibia|NE Niger|" +
    "NG Nigeria|RE Réunion|RW Rwanda|SC Seychelles|SD Sudan|" +
    "SH Saint Helena, Ascension and Tristan da Cunha|SL Sierra Leone|SN Senegal|SO Somalia|SS South Sudan|" +
    "ST Sao Tome and Principe|SZ Eswatini|TD Chad|TG Togo|TN Tunisia|TZ Tanzania, United Republic of|" +
    "UG Uganda|YT Mayotte|ZA South Africa|ZM Zambia|ZW Zimbabwe",
  antarctica:
    "AQ Antarctica|BV Bouvet Island|GS South Georgia and the South Sandwich Islands|" +
    "HM Heard Island and McDonald Islands|TF French Southern Territories",
  asia:
    "AE United Arab Emirates|AF Afghanistan|AM Armenia|AZ Azerbaijan|BD Bangladesh|BH Bahrain|" +
    "BN Brunei Darussalam|BT Bhutan|CN China|GE Georgia|HK Hong Kong|ID Indonesia|IL Israel|IN India|" +
    "IO British Indian Ocean Territory|IQ Iraq|IR Iran, Islamic Republic of|JO Jordan|JP Japan|" +
    "KG Kyrgyzstan|KH Cambodia|KP Korea, Democratic People's Republic of|KR Korea, Republic of|KW Kuwait|" +
    "KZ Kazakhstan|LA Lao People's Democratic Republic|LB Lebanon|LK Sri Lanka|MM Myanmar|MN Mongolia|" +
    "MO Macao|MV Maldives|MY Malaysia|NP Nepal|OM Oman|PH Philippines|PK Pakistan|PS Palestine, State of|" +
    "QA Qatar|SA Saudi Arabia|SG Singapore|SY Syrian Arab Republic|TH Thailand|TJ Tajikistan|" +
    "TL Timor-Leste|TM Turkmenistan|TR Turkey|TW Taiwan, Province of China|UZ Uzbekistan|VN Viet Nam|" +
    "YE Yemen",
  caribbean:
    "AG Antigua and Barbuda|AI Anguilla|AW Aruba|BB Barbados|BL Saint Barthélemy|" +
    "BQ Bonaire, Sint Eustatius and Saba|BS Bahamas|CU Cuba|CW Curaçao|DM Dominica|DO Dominican Republic|" +
    "GD Grenada|GP Guadeloupe|HT Haiti|JM Jamaica|KN Saint Kitts and Nevis|KY Cayman Islands|" +
    "LC Saint Lucia|MF Saint Martin (French part)|MQ Martinique|MS Montserrat|PR Puerto Rico|" +
    "SX Sint Maarten (Dutch part)|TC Turks and Caicos Islands|TT Trinidad and Tobago|" +
    "VC Saint Vincent and the Grenadines|VG Virgin Islands, British|VI Virgin Islands, U.S.",
  europe:
    "AD Andorra|AL Albania|AT Austria|AX Åland Islands|BA Bosnia and Herzegovina|BE Belgium|BG Bulgaria|" +
    "BY Belarus|CH Switzerland|CY Cyprus|CZ Czechia|DE Germany|DK Denmark|EE Estonia|ES Spain|FI Finland|" +
    "FO Faroe Islands|FR France|GB United Kingdom|GG Guernsey|GI Gibraltar|GR Greece|HR Croatia|" +
    "HU Hungary|IE Ireland|IM Isle of Man|IS Iceland|IT Italy|JE Jersey|LI Liechtenstein|LT Lithuania|" +
    "LU Luxembourg|LV Latvia|MC Monaco|MD Moldova, Republic of|ME Montenegro|MK North Macedonia|MT Malta|" +
    "NL Netherlands|NO Norway|PL Poland|PT Portugal|RO Romania|RS Serbia|RU Russian Federation|SE Sweden|" +
    "SI Slovenia|SJ Svalbard and Jan Mayen|SK Slovakia|SM San Marino|UA Ukraine|VA Holy See",
  "north-america":
    "BM Bermuda|BZ Belize|CA Canada|CR Costa Rica|GL Greenland|GT Guatemala|HN Honduras|MX Mexico|" +
    "NI Nicaragua|PA Panama|PM Saint Pierre and Miquelon|SV El Salvador|US United States",
  oceania:
    "AS American Samoa|AU Australia|CC Cocos (Keeling) Islands|CK Cook Islands|CX Christmas Island|" +
    "FJ Fiji|FM Micronesia, Federated States of|GU Guam|KI Kiribati|MH Marshall Islands|" +
    "MP Northern Mariana Islands|NC New Caledonia|NF Norfolk Island|NR Nauru|NU Niue|NZ New Zealand|" +
    "PF French Polynesia|PG Papua New Guinea|PN Pitcairn|PW Palau|SB Solomon Islands|TK Tokelau|TO Tonga|" +
    "TV Tuvalu|UM United States Minor Outlying Islands|VU Vanuatu|WF Wallis and Futuna|WS Samoa",
  "south-america":
    "AR Argentina|BO Bolivia, Plurinational State of|BR Brazil|CL Chile|CO Colombia|EC Ecuador|" +
    "FK Falkland Islands (Malvinas)|GF French Guiana|GY Guyana|PE Peru|PY Paraguay|SR Suriname|UY Uruguay|" +
    "VE Venezuela, Bolivarian Republic of",
});

const COUNTRIES = Object.freeze(
  Object.entries(COUNTRIES_BY_CONTINENT).flatMap(([continent, table]) =>
    table.split("|").map((entry) => {
      const [code, ...name] = entry.split(" ");
      return { code, name: name.join(" "), continent };
    })
  )
);

const COUNTRY_BY_SLUG = new Map(COUNTRIES.map((country) => [toDestinationSlug(country.name), country]));

export const continentName = (continentSlug) => CONTINENTS[continentSlug] || "";

export const findCountryByName = (name) => COUNTRY_BY_SLUG.get(toDestinationSlug(name)) || null;

export const listCountries = () => COUNTRIES.map((country) => ({ ...country }));
