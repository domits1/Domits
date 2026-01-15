import { useState, useEffect, useRef, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import verifiedLogo from "../../images/icons/verify-icon.png";
import checkMark from "../../images/icons/checkMark.png";
import question from "../../images/icons/question.png";
import bill from "../../images/icons/bill.png";
import { SearchBar } from "../../components/base/SearchBar";
import SkeletonLoader from "../../components/base/SkeletonLoader";
import AccommodationCard from "./AccommodationCard";
import { reviews } from "./store/constants";
import { categories as groups } from "./store/constants";
import 'swiper/css';                
import 'swiper/css/pagination';    
import 'swiper/css/effect-fade'; 
import { FetchAllPropertyTypes, FetchPropertyType } from "./services/fetchProperties";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";
import villaBackground from "../../images/villaHomepage.jpg";

export const S3_URL = "https://accommodation.s3.eu-north-1.amazonaws.com/images";

const contentByLanguage = {
  en,
  nl,
  de,
  es,
};

const Homepage = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [boatAccommodations, setBoatAccommodations] = useState([]);
  const [camperAccommodations, setCamperAccommodations] = useState([]);
  const [accommodationImages, setAccommodationImages] = useState([]);
  const [byTypeAccommodations, setByTypeAccommodations] = useState([]);
  const [isBarActive, setIsBarActive] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [activePopup, setActivePopup] = useState(null);
  const [boatLoading, setBoatLoading] = useState(false);
  const [camperLoading, setCamperLoading] = useState(false);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [allAccommodations, setAllAccommodations] = useState([]);

  const [lastEvaluatedKeyCreatedAt, setLastEvaluatedKeyCreatedAt] = useState(null);
  const [lastEvaluatedKeyId, setLastEvaluatedKeyId] = useState(null);
  // const groups = useCategories();
  const {language} = useContext(LanguageContext);
  const homePageContent = contentByLanguage[language]?.homepage;

  const searchBarRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      setPropertyLoading(true);
      setBoatLoading(true);
      setCamperLoading(true);
      FetchPropertyType("Boat").then((data) => {
        setBoatAccommodations(data.slice(0, 3));
        setBoatLoading(false);
      });
      FetchPropertyType("Camper").then((data) => {
        setCamperAccommodations(data.slice(0, 3));
        setCamperLoading(false);
      });
      FetchAllPropertyTypes(lastEvaluatedKeyCreatedAt, lastEvaluatedKeyId).then((data) => {
        if (data.lastEvaluatedKey) {
          setLastEvaluatedKeyCreatedAt(data.lastEvaluatedKey.createdAt);
          setLastEvaluatedKeyId(data.lastEvaluatedKey.id);
        } else {
          setLastEvaluatedKeyCreatedAt(null);
          setLastEvaluatedKeyId(null)
        }
        setAllAccommodations(data.properties.slice(6, 9));
        setPropertyLoading(false);
      });
    }

    loadData();
  }, []);

  const toggleBar = (isActive) => {
    setIsBarActive(isActive);
  };

  const hostImages = [
    { src: `${S3_URL}/Images/waterman.webp`, alt: "Waterman" },
    { src: `${S3_URL}/Images/sleutelvrouw.webp`, alt: "Sleutelvrouw" },
  ];

  const countries = [
    {
      name: `${homePageContent.destinations.europe.countries.netherlands}`,
      img: `${S3_URL}/Images/netherlands.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.france}`,
      img: `${S3_URL}/Images/france.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.spain}`,
      img: `${S3_URL}/Images/spain.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const smallCountries = [
    {
      name: `${homePageContent.destinations.europe.countries.italy}`,
      img: `${S3_URL}/Images/italy.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.belgium}`,
      img: `${S3_URL}/Images/belgium.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.germany}`,
      img: `${S3_URL}/Images/germany.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.greece}`,
      img: `${S3_URL}/Images/greece.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.unitedKingdom}`,
      img: `${S3_URL}/Images/unitedkingdom.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.portugal}`,
      img: `${S3_URL}/Images/portugal.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.croatia}`,
      img: `${S3_URL}/Images/croatia.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.poland}`,
      img: `${S3_URL}/Images/poland.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.austria}`,
      img: `${S3_URL}/Images/austria.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.czech}`,
      img: `${S3_URL}/Images/czech.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const asiaCountries = [
    {
      name: `${homePageContent.destinations.asia.countries.philippines}`,
      img: `${S3_URL}/Images/philippines.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.thailand}`,
      img: `${S3_URL}/Images/thailand.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.indonesia}`,
      img: `${S3_URL}/Images/indonesia.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const smallAsiaCountries = [
    {
      name: `${homePageContent.destinations.asia.countries.india}`,
      img: `${S3_URL}/Images/india.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.malaysia}`,
      img: `${S3_URL}/Images/malaysia.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.vietnam}`,
      img: `${S3_URL}/Images/vietnam.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.turkey}`,
      img: `${S3_URL}/Images/turkey.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.singapore}`,
      img: `${S3_URL}/Images/singapore.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const caribbeanCountries = [
    {
      name: `${homePageContent.destinations.caribbean.locations.aruba}`,
      img: `${S3_URL}/Images/aruba.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.bonaire}`,
      img: `${S3_URL}/Images/bonaire.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.curacao}`,
      img: `${S3_URL}/Images/curacao.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const smallCaribbeanCountries = [
    {
      name: `${homePageContent.destinations.caribbean.locations.saintBarthelemy}`,
      img: `${S3_URL}/Images/saintbarthelemy.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.costaRica}`,
      img: `${S3_URL}/Images/costarica.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.dominicanRepublic}`,
      img: `${S3_URL}/Images/dominicanrepublic.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.puertoRico}`,
      img: `${S3_URL}/Images/puertrorico.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.stMaarten}`,
      img: `${S3_URL}/Images/stmaarten.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const skiCountries = [
    {
      name: `${homePageContent.destinations.ski.locations.austria}`,
      img: `${S3_URL}/Images/austria.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.ski.locations.frenchAlps}`,
      img: `${S3_URL}/Images/frenchalps.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.ski.locations.switzerland}`,
      img: `${S3_URL}/Images/switzerland.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.ski.locations.chamonix}`,
      img: `${S3_URL}/Images/Chamonix-Mont-Blanc.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.ski.locations.blackForest}`,
      img: `${S3_URL}/Images/blackforest.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.ski.locations.italyTrentino}`,
      img: `${S3_URL}/Images/italytretinio.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const seasons = [
    { name: `${homePageContent.filters.season.spring}`, img: `${S3_URL}/Images/spring.webp` },
    { name: `${homePageContent.filters.season.summer}`, img: `${S3_URL}/Images/summer.webp` },
    { name: `${homePageContent.filters.season.fall}`, img: `${S3_URL}/Images/fall.webp` },
    { name: `${homePageContent.filters.season.winter}`, img: `${S3_URL}/Images/winter.webp` },
  ];

  const interests = [
    {
      name: `${homePageContent.filters.interest.luxury}`,
      img: `${S3_URL}/Images/luxury.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.beach}`,
      img: `${S3_URL}/Images/beach.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.lastMinute}`,
      img: `${S3_URL}/Images/lastminute.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.wellness}`,
      img: `${S3_URL}/Images/wellness.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.romantic}`,
      img: `${S3_URL}/Images/romantic.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.adventure}`,
      img: `${S3_URL}/Images/adventure.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.nature}`,
      img: `${S3_URL}/Images/nature.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.culture}`,
      img: `${S3_URL}/Images/culture.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.culinary}`,
      img: `${S3_URL}/Images/culinary.webp`,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const handleScroll = () => {
    if (!searchBarRef.current) return;

    const offsetTop = searchBarRef.current.offsetTop;
    const scrollPosition = window.scrollY;

    if (scrollPosition > offsetTop && !isFixed) {
      setIsFixed(true);
    } else if (scrollPosition <= offsetTop && isFixed) {
      setIsFixed(false);
    }
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isFixed]);

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNextReview = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
  };

  const handlePreviousReview = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const visibleReviews = [
    reviews[currentIndex],
    reviews[(currentIndex + 1) % reviews.length],
    reviews[(currentIndex + 2) % reviews.length],
  ];

  const handleClick = (e, ID) => {
    if (!e || !e.target) {
      console.error("Event or event target is undefined.");
      return;
    }
    if (e.target.closest(".swiper-button-next") || e.target.closest(".swiper-button-prev")) {
      e.stopPropagation();
      return;
    }
    navigate(`/listingdetails?ID=${encodeURIComponent(ID)}`);
  };

  const handlePopupClick = (text) => {
    setActivePopup(activePopup === text ? null : text);
  };

  return (
    <>
      <div className="homePage-container">
        <div className="domits-homepage">
          <div className="domits-searchContainer" style={{ "--villa-background": `url(${villaBackground})` }}>
            <div className="domits-searchTextCon">
              <h3 className="domits-searchText">{homePageContent.hero.title}</h3>
            </div>
            <div className="domits-searchbarCon">
              <SearchBar
                setSearchResults={setSearchResults}
                setLoading={setLoading}
                placeholderText="Search for holiday homes, boats, or campers..."
                toggleBar={toggleBar}
              />
            </div>
          </div>

          <div className="domits-iconsContainer">
            <div className="domits-iconsContainerText">
              <div className="domits-iconTextGroup">
                <img
                  src={bill}
                  // srcSet={`${bill_400} 400w, ${bill_800} 800w, ${bill_1200} 1200w`}
                  // sizes="(max-width: 600px) 400px, (max-width: 1200px) 800px, 1200px"
                  alt="bill"
                  loading="lazy"
                />

                <p>{homePageContent.features.securePayments}</p>
              </div>
              <div className="domits-iconTextGroup">
                <img src={verifiedLogo} alt="verified logo" loading="lazy" />
                <p>{homePageContent.features.verifiedGuest}</p>
              </div>
              <div className="domits-iconTextGroup">
                <img src={question} alt="question" loading="lazy" />
                <p>{homePageContent.features.quickPhone}</p>
              </div>
              <div className="domits-iconTextGroup">
                <img src={checkMark} alt="checkMark" loading="lazy" />
                <p>{homePageContent.features.qualityGuarantee}</p>
              </div>
            </div>
          </div>

          <div className="domits-boatContainer">
            <div className="domits-boatText">
              <h3 className="domits-subHead">{homePageContent.sections.trending}</h3>

              <div className="domits-trendingContainer">
                {[
                  {
                    emoji: "🎖️",
                    title: `${homePageContent.features.bestPrice}`,
                    text: "We strive to offer you the best possible price. If you find a cheaper option somewhere, we will adjust it for you in consultation.",
                  },
                  {
                    emoji: "✅",
                    title: `${homePageContent.features.bookingGuarantee}`,
                    text: "If changes are made after your stay has been confirmed, Domits will do its best to coordinate your stay.",
                  },
                  {
                    emoji: "🤝",
                    title: `${homePageContent.features.stayGuarantee}`,
                    text: "If upon arrival at the property you are unable to get the rooms you have arranged, Domits will do its best to coordinate your stay.",
                  },
                ].map((item, index) => (
                  <div key={index} className="popup-trigger" onClick={() => handlePopupClick(item.text)}>
                    {item.emoji} {item.title}
                    {activePopup === item.text && (
                      <div
                        className="
                  ">
                        {item.text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="domits-accommodationGroup">
              {propertyLoading === false ? (
                allAccommodations.length > 0 ? (
                  allAccommodations.map((property) => (
                    <AccommodationCard key={property.property.id} accommodation={property} onClick={handleClick} />
                  ))
                ) : (
                  <div>No trending properties available.</div>
                )
              ) : (
                Array(3)
                  .fill()
                  .map((_, index) => <SkeletonLoader key={index} />)
              )}
            </div>
          </div>

          <div className="domits-boatContainer">
            <div className="domits-boatText">
              <h3 className="domits-subHead">{homePageContent.sections.rentBoat}</h3>
            </div>
            <div className="domits-accommodationGroup">
              {boatLoading === false ? (
                boatAccommodations.length > 0 ? (
                  boatAccommodations.map((boat) => (
                    <AccommodationCard key={boat.property.id} accommodation={boat} onClick={handleClick} />
                  ))
                ) : (
                  <div>No boats available.</div>
                )
              ) : (
                Array(3)
                  .fill()
                  .map((_, index) => <SkeletonLoader key={index} />)
              )}
            </div>
          </div>

          <div className="domits-boatContainer">
            <div className="domits-boatText">
              <h3 className="domits-subHead">{homePageContent.sections.discoverCampers}</h3>
            </div>
            <div className="domits-accommodationGroup">
              {boatLoading === false ? (
                camperAccommodations.length > 0 ? (
                  camperAccommodations.map((camperAccommodations) => (
                    <AccommodationCard
                      key={camperAccommodations.property.id}
                      accommodation={camperAccommodations}
                      onClick={handleClick}
                    />
                  ))
                ) : (
                  <div>No boats available.</div>
                )
              ) : (
                Array(3)
                  .fill()
                  .map((_, index) => <SkeletonLoader key={index} />)
              )}
            </div>
          </div>

          <div className="become-host-section">
            <div className="become-host-content">
              <h1 className="BH">{homePageContent.sections.becomeHost.title}</h1>
              <ul>
                <li>{homePageContent.sections.becomeHost.points[0]}</li>
                <li>{homePageContent.sections.becomeHost.points[1]}</li>
                <li>{homePageContent.sections.becomeHost.points[2]}</li>
              </ul>
              <button className="list-property-button" onClick={() => navigate("/landing")}>
                {homePageContent.sections.becomeHost.button}
              </button>
            </div>
            <div className="host-images">
              {hostImages.map((image, index) => (
                <img key={index} src={image.src} alt={image.alt} className="host-image" loading="lazy" />
              ))}
            </div>
          </div>

          <h1 className="Places-text">{homePageContent.destinations.europe.title}</h1>
          <div className="countries-container">
            {countries.map((country, index) => (
              <div className="country-card" key={index}>
                <Link to="/home">
                  <img src={country.img} alt={country.name} loading="lazy" />
                </Link>
                <h3>{country.name}</h3>
                <p>{country.description}</p>
              </div>
            ))}
          </div>
          <div className="small-countries-container">
            {smallCountries.map((country, index) => (
              <div className="country-card small-country-card" key={index}>
                <Link to="/home">
                  <img src={country.img} alt={country.name} loading="lazy" />
                </Link>
                <h3>{country.name}</h3>
                <p>{country.description}</p>
              </div>
            ))}
          </div>
          <h1 className="Places-text">{homePageContent.destinations.asia.title}</h1>
          <div className="asia-countries-container">
            {asiaCountries.map((country, index) => (
              <div className="country-card asia-country-card" key={index}>
                <Link to="/home">
                  <img src={country.img} alt={country.name} loading="lazy" />
                </Link>
                <h3>{country.name}</h3>
                <p>{country.description}</p>
              </div>
            ))}
          </div>
          <div className="small-asia-countries-container">
            {smallAsiaCountries.map((country, index) => (
              <div className="country-card small-asia-country-card" key={index}>
                <Link to="/home">
                  <img src={country.img} alt={country.name} loading="lazy" />
                </Link>
                <h3>{country.name}</h3>
              </div>
            ))}
          </div>
          <h1 className="Places-text">{homePageContent.destinations.caribbean.title}</h1>
          <div className="caribbean-countries-container">
            {caribbeanCountries.map((country, index) => (
              <div className="country-card caribbean-country-card" key={index}>
                <Link to="/home">
                  <img src={country.img} alt={country.name} loading="lazy" />
                </Link>
                <h3>{country.name}</h3>
                <p>{country.description}</p>
              </div>
            ))}
          </div>
          <div className="small-caribbean-countries-container">
            {smallCaribbeanCountries.map((country, index) => (
              <div className="country-card small-caribbean-country-card" key={index}>
                <Link to="/home">
                  <img src={country.img} alt={country.name} loading="lazy" />
                </Link>
                <h3>{country.name}</h3>
              </div>
            ))}
          </div>
          <h1 className="Places-text">{homePageContent.destinations.ski.title}</h1>
          <div className="ski-countries-container">
            {skiCountries.map((country, index) => (
              <div className="country-card ski-country-card" key={index}>
                <Link to="/home">
                  <img src={country.img} alt={country.name} loading="lazy" />
                </Link>
                <h3>{country.name}</h3>
                <p>{country.description}</p>
              </div>
            ))}
          </div>
          <h1 className="Places-text">{homePageContent.filters.season.title}</h1>
          <div className="seasons-container">
            {seasons.map((season, index) => (
              <div className="season-card" key={index}>
                <Link to="/home">
                  <img src={season.img} alt={season.name} loading="lazy" />
                </Link>
                <h3>{season.name}</h3>
              </div>
            ))}
          </div>
          <h1 className="Places-text">{homePageContent.filters.interest.title}</h1>
          <div className="interests-container">
            {interests.map((interest, index) => (
              <div className="interest-card" key={index}>
                <Link to="/home">
                  <img src={interest.img} alt={interest.name} loading="lazy" />
                </Link>
                <h3>{interest.name}</h3>
                <p>{interest.description}</p>
              </div>
            ))}
          </div>
          <h1 className="Places-text">{homePageContent.filters.groups.title}</h1>
          <div className="groups-container">
            {groups.map((group, index) => (
              <div className="group-card" key={index}>
                <Link to="/home">
                  <img src={group.img} alt={group.name} loading="lazy" />
                </Link>
                <h3>{group.name}</h3>
                <p>{group.description}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Updated Review Section */}
        <div className="review-container">
          <button className="arrow-button" onClick={handlePreviousReview}>
            &lt;
          </button>
          <div className="review-list">
            {visibleReviews.map((review, index) => (
              <div className="review-card" key={index}>
                <img src={review.img} alt={review.name} className="review-profile-pic" loading="lazy" />
                <h3>{review.name}</h3>
                <p className="review-location">Host from The Netherlands</p>
                <div className="review-stars">★★★★★</div>
                <p className="review-text">{review.text}</p>
              </div>
            ))}
          </div>
          <button className="arrow-button" onClick={handleNextReview}>
            &gt;
          </button>
        </div>
        <div className="domits-communityContainer">
          <h2 className="domits-communityHead">{homePageContent.sections.community.title}</h2>
          <p className="domits-communityGroup">{homePageContent.sections.community.description}</p>
          <div className="domits-communityButtons">
            <button className="domits-hostButton">
              <a href="/landing">{homePageContent.sections.becomeHost.title}</a>
            </button>
            <button className="domits-SearchButton">
              <a href="/home">{homePageContent.sections.community.button}</a>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};


export default Homepage;