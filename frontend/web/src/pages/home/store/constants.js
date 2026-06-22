import hostImg from "../Images/become-a-host.png";
export const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/images";

export const categories = [
  { name: "Friends", img: `${S3_URL}/Images/friends.webp`, description: "Vacation Rentals and Apartments" },
  { name: "Couples", img: `${S3_URL}/Images/couples.webp`, description: "Vacation Rentals and Apartments" },
  {
    name: "Family & child friendly",
    img: `${S3_URL}/Images/family.webp`,
    description: "Vacation Rentals and Apartments",
  },
  { name: "Solo", img: `${S3_URL}/Images/solo.webp`, description: "Vacation Rentals and Apartments" },
  { name: "Senior", img: `${S3_URL}/Images/senior.webp`, description: "Vacation Rentals and Apartments" },
  { name: "Pet Friendly", img: `${S3_URL}/Images/petfriendly.webp`, description: "Vacation Rentals and Apartments" },
];

export const reviews = [
  {
    name: "Oliver Reynolds",
    img: `${S3_URL}/Images/Reviewer 1.webp`,
    text: "Fantastic platform! Booking was a breeze, and the support team was incredibly helpful.",
  },
  {
    name: "Sophia Bennett",
    img: `${S3_URL}/Images/Reviewer 2.webp`,
    text: "Seamless experience from start to finish. Highly recommend!",
  },
  {
    name: "Liam Anderson",
    img: `${S3_URL}/Images/Reviewer 3.webp`,
    text: "Super easy to use, and the customer service was excellent!",
  },
  {
    name: "Emma Carter",
    img: `${S3_URL}/Images/Reviewer 4.webp`,
    text: "Absolutely loved using this platform. Will definitely book again!",
  },
  {
    name: "Noah Fitzgerald",
    img: `${S3_URL}/Images/Reviewer 5.webp`,
    text: "Great experience! Everything was smooth and hassle-free.",
  },
  {
    name: "Ava Mitchell",
    img: `${S3_URL}/Images/Reviewer 6.webp`,
    text: "Top-tier service and an intuitive interface. Loved it!",
  },
  {
    name: "Mason Brooks",
    img: `${S3_URL}/Images/Reviewer 7.webp`,
    text: "This platform made my trip planning effortless!",
  },
  {
    name: "Isabella Collins",
    img: `${S3_URL}/Images/Reviewer 8.webp`,
    text: "User-friendly and reliable. Couldn’t ask for more.",
  },
  {
    name: "Elijah Thompson",
    img: `${S3_URL}/Images/Reviewer 9.webp`,
    text: "Exceptional service and very easy to navigate!",
  },
  { name: "Mia Richardson", img: `${S3_URL}/Images/Reviewer 10.webp`, text: "Best booking experience I’ve ever had!" },
  {
    name: "James Parker",
    img: `${S3_URL}/Images/Reviewer 11.webp`,
    text: "A must-use platform for hassle-free travel!",
  },
  {
    name: "Charlotte Hayes",
    img: `${S3_URL}/Images/Reviewer 12.webp`,
    text: "Loved the simplicity and efficiency. Highly recommended!",
  },
  {
    name: "Benjamin Scott",
    img: `${S3_URL}/Images/Reviewer 13.webp`,
    text: "Flawless experience! The platform was intuitive and responsive.",
  },
  {
    name: "Amelia Cooper",
    img: `${S3_URL}/Images/Reviewer 14.webp`,
    text: "Booking was quick and easy. Amazing service!",
  },
  {
    name: "Lucas Edwards",
    img: `${S3_URL}/Images/Reviewer 15.webp`,
    text: "Perfect for stress-free trip planning. Five stars!",
  },
  {
    name: "Harper Morgan",
    img: `${S3_URL}/Images/Reviewer 16.webp`,
    text: "Superb experience! Will definitely use this again.",
  },
  {
    name: "Henry Watson",
    img: `${S3_URL}/Images/Reviewer 17.webp`,
    text: "Everything worked perfectly. I’m very satisfied!",
  },
  {
    name: "Evelyn Turner",
    img: `${S3_URL}/Images/Reviewer 18.webp`,
    text: "The best travel booking site I’ve ever used!",
  },
];

export const buildHostSection = (content) => ({
  title: content.title,
  description: content.description,
  features: [
    { icon: "money", title: content.features.earn.title, text: content.features.earn.text },
    { icon: "shield", title: content.features.infrastructure.title, text: content.features.infrastructure.text },
    { icon: "home", title: content.features.support.title, text: content.features.support.text },
  ],
  stats: [
    { value: content.stats.hosts.value, label: content.stats.hosts.label },
    { value: content.stats.rating.value, label: content.stats.rating.label },
    { value: content.stats.earning.value, label: content.stats.earning.label },
  ],
  button: content.button,
});

export const hostImage = {
  src: hostImg,
  alt: "Become a host",
};

export const buildGuarantees = (content) => [
  { icon: "price", title: content.bestPrice, text: content.bestPriceDescription },
  { icon: "booking", title: content.bookingGuarantee, text: content.bookingGuaranteeDescription },
  { icon: "stay", title: content.stayGuarantee, text: content.stayGuaranteeDescription },
];

// Image filenames double as the English country slug. The query the backend
// expects is the English country name, so derive it here (the visible card
// label stays localized via `name`). Multi-word names need an override.
const COUNTRY_NAME_OVERRIDES = {
  unitedkingdom: "United Kingdom",
  czech: "Czechia",
  srilanka: "Sri Lanka",
  costarica: "Costa Rica",
  dominicanrepublic: "Dominican Republic",
  puertrorico: "Puerto Rico",
  stmaarten: "Sint Maarten",
  saintbarthelemy: "Saint Barthelemy",
  frenchalps: "France",
};

const countryFromImg = (img) => {
  const slug = img.split("/Images/").pop().replace(".webp", "").toLowerCase();
  return COUNTRY_NAME_OVERRIDES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);
};

const withCountry = (items) => items.map((item) => ({ ...item, country: countryFromImg(item.img) }));

export const buildHomepageLists = (homePageContent) => {
  const desc = homePageContent.filters.groups.description;

  const countries = [
  {
    name: homePageContent.destinations.europe.countries.netherlands,
    img: `${S3_URL}/Images/netherlands.webp`,
    description: "Vacation houses and apartments",
  },
  {
    name: homePageContent.destinations.europe.countries.france,
    img: `${S3_URL}/Images/france.webp`,
    description: "Luxury villas & countryside escapes",
  },
  {
    name: homePageContent.destinations.europe.countries.spain,
    img: `${S3_URL}/Images/spain.webp`,
    description: "Beachfront stays & sunny getaways",
  },
];

  const smallCountries = [
    {
      name: homePageContent.destinations.europe.countries.italy,
      img: `${S3_URL}/Images/italy.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.europe.countries.belgium,
      img: `${S3_URL}/Images/belgium.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.europe.countries.germany,
      img: `${S3_URL}/Images/germany.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.europe.countries.greece,
      img: `${S3_URL}/Images/greece.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.europe.countries.unitedKingdom,
      img: `${S3_URL}/Images/unitedkingdom.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.europe.countries.portugal,
      img: `${S3_URL}/Images/portugal.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.europe.countries.croatia,
      img: `${S3_URL}/Images/croatia.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.europe.countries.poland,
      img: `${S3_URL}/Images/poland.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.europe.countries.austria,
      img: `${S3_URL}/Images/austria.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.europe.countries.czech,
      img: `${S3_URL}/Images/czech.webp`,
      description: desc,
    },
  ];

  const asiaCountries = [
  {
    name: homePageContent.destinations.asia.countries.philippines,
    img: `${S3_URL}/Images/philippines.webp`,
    description: "Tropical island escapes",
  },
  {
    name: homePageContent.destinations.asia.countries.thailand,
    img: `${S3_URL}/Images/thailand.webp`,
    description: "Beach resorts & vibrant culture",
  },
  {
    name: homePageContent.destinations.asia.countries.indonesia,
    img: `${S3_URL}/Images/indonesia.webp`,
    description: "Luxury villas & jungle retreats",
  },
];

  const smallAsiaCountries = [
    { name: homePageContent.destinations.asia.countries.india, img: `${S3_URL}/Images/india.webp`, description: desc },
    {
      name: homePageContent.destinations.asia.countries.malaysia,
      img: `${S3_URL}/Images/malaysia.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.asia.countries.vietnam,
      img: `${S3_URL}/Images/vietnam.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.asia.countries.turkey,
      img: `${S3_URL}/Images/turkey.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.asia.countries.singapore,
      img: `${S3_URL}/Images/singapore.webp`,
      description: desc,
    },
  ];

  const caribbeanCountries = [
  {
    name: homePageContent.destinations.caribbean.locations.aruba,
    img: `${S3_URL}/Images/aruba.webp`,
    description: "Crystal-clear waters & white sand",
  },
  {
    name: homePageContent.destinations.caribbean.locations.bonaire,
    img: `${S3_URL}/Images/bonaire.webp`,
    description: "Diving paradise",
  },
  {
    name: homePageContent.destinations.caribbean.locations.curacao,
    img: `${S3_URL}/Images/curacao.webp`,
    description: "Colorful island charm",
  },
];

  const smallCaribbeanCountries = [
    {
      name: homePageContent.destinations.caribbean.locations.saintBarthelemy,
      img: `${S3_URL}/Images/saintbarthelemy.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.caribbean.locations.costaRica,
      img: `${S3_URL}/Images/costarica.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.caribbean.locations.dominicanRepublic,
      img: `${S3_URL}/Images/dominicanrepublic.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.caribbean.locations.puertoRico,
      img: `${S3_URL}/Images/puertrorico.webp`,
      description: desc,
    },
    {
      name: homePageContent.destinations.caribbean.locations.stMaarten,
      img: `${S3_URL}/Images/stmaarten.webp`,
      description: desc,
    },
  ];

  const skiCountries = [
  {
    name: homePageContent.destinations.ski.locations.austria,
    img: `${S3_URL}/Images/austria.webp`,
    description: "Alpine ski resorts",
  },
  {
    name: homePageContent.destinations.ski.locations.frenchAlps,
    img: `${S3_URL}/Images/frenchalps.webp`,
    description: "World-class slopes",
  },
  {
    name: homePageContent.destinations.ski.locations.switzerland,
    img: `${S3_URL}/Images/switzerland.webp`,
    description: "Luxury mountain chalets",
  },
];

  const seasons = [
  {
    name: homePageContent.filters.season.spring,
    img: `${S3_URL}/Images/spring.webp`,
    description: "Blooming nature escapes",
  },
  {
    name: homePageContent.filters.season.summer,
    img: `${S3_URL}/Images/summer.webp`,
    description: "Beach & coastal escapes",
  },
  {
    name: homePageContent.filters.season.winter,
    img: `${S3_URL}/Images/winter.webp`,
    description: "Ski chalets & retreats",
  },
];

  const interests = [
  {
    name: homePageContent.filters.interest.wellness,
    img: `${S3_URL}/Images/wellness.webp`,
    description: "Spa & relaxation",
  },
  {
    name: homePageContent.filters.interest.adventure,
    img: `${S3_URL}/Images/adventure.webp`,
    description: "Outdoor experiences",
  },
  {
    name: homePageContent.filters.interest.culture,
    img: `${S3_URL}/Images/culture.webp`,
    description: "Historic properties",
  },
];
  
  return {
    countries: withCountry(countries),
    smallCountries: withCountry(smallCountries),
    asiaCountries: withCountry(asiaCountries),
    smallAsiaCountries: withCountry(smallAsiaCountries),
    caribbeanCountries: withCountry(caribbeanCountries),
    smallCaribbeanCountries: withCountry(smallCaribbeanCountries),
    skiCountries: withCountry(skiCountries),
    seasons,
    interests,
  };
};