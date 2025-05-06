import React, { useState, useEffect, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../home/homePage.css";
import verifiedLogo from "../../images/icons/verify-icon.png";
import checkMark from "../../images/icons/checkMark.png";
import question from "../../images/icons/question.png";
import bill from "../../images/icons/bill.png";
import { SearchBar } from "../../components/base/SearchBar";
import SkeletonLoader from "../../components/base/SkeletonLoader";
import AccommodationCard from "./AccommodationCard";
import { reviews } from "../home/store/constants";
import { useCategories } from "../home/hooks/useCategories.js";
import { img } from "../home/store/constants";
import "swiper/css/pagination";
import Header from "../../components/base/Header";
import greece from "../../pages/home/Images/greece.webp";
import netherlands from "../../pages/home/Images/netherlands.webp";
import france from "../../pages/home/Images/france.webp";
import spain from "../../pages/home/Images/spain.webp";
import italy from "../../pages/home/Images/italy.webp";
import belgium from "../../pages/home/Images/belgium.webp";
import germany from "../../pages/home/Images/germany.webp";
import uk from "../../pages/home/Images/unitedkingdom.webp";
import portugal from "../../pages/home/Images/portugal.webp";
import croatia from "../../pages/home/Images/croatia.webp";
import poland from "../../pages/home/Images/poland.webp";
import austria from "../../pages/home/Images/austria.webp";
import czech from "../../pages/home/Images/czech.webp";
import philippines from "../../pages/home/Images/philippines.webp";
import thailand from "../../pages/home/Images/thailand.webp";
import indonesia from "../../pages/home/Images/indonesia.webp";
import india from "../../pages/home/Images/india.webp";
import malaysia from "../../pages/home/Images/malaysia.webp";
import vietnam from "../../pages/home/Images/vietnam.webp";
import turkey from "../../pages/home/Images/turkey.webp";
import singapore from "../../pages/home/Images/singapore.webp";
import aruba from "../../pages/home/Images/aruba.webp";
import bonaire from "../../pages/home/Images/bonaire.webp";
import curacao from "../../pages/home/Images/curacao.webp";
import saintBarthelemy from "../../pages/home/Images/saintbarthelemy.webp";
import costaRica from "../../pages/home/Images/costarica.webp";
import dominicanRepublic from "../../pages/home/Images/dominicanrepublic.webp";
import puertroRico from "../../pages/home/Images/puertrorico.webp";
import stMaarten from "../../pages/home/Images/stmaarten.webp";
import frenchalps from "../../pages/home/Images/frenchalps.webp";
import switzerland from "../../pages/home/Images/switzerland.webp";
import chamonix from "../../pages/home/Images/Chamonix-Mont-Blanc.webp";
import blackforest from "../../pages/home/Images/blackforest.webp";
import italyTrentino from "../../pages/home/Images/italytretinio.webp";
import spring from "../../pages/home/Images/spring.webp";
import summer from "../../pages/home/Images/summer.webp";
import fall from "../../pages/home/Images/fall.webp";
import winter from "../../pages/home/Images/winter.webp";
import luxury from "../../pages/home/Images/luxury.webp";
import beach from "../../pages/home/Images/beach.webp";
import lastMinute from "../../pages/home/Images/lastminute.webp";
import wellness from "../../pages/home/Images/wellness.webp";
import romantic from "../../pages/home/Images/romantic.webp";
import adventure from "../../pages/home/Images/adventure.webp";
import nature from "../../pages/home/Images/nature.webp";
import culture from "../../pages/home/Images/culture.webp";
import culinary from "../../pages/home/Images/culinary.webp";
import waterman from "../../pages/home/Images/waterman.webp";
import sleutelvrouw from "../../pages/home/Images/sleutelvrouw.webp";
import { FetchAllPropertyTypes, FetchPropertyType } from "../home/services/fetchProperties";
import { LanguageContext } from "../../context/LanguageContext.js";
import content from "../../content/content.json";

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
  const groups = useCategories();
  const {language} = useContext(LanguageContext);
  const homePageContent = content[language].homepage;

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
    { src: waterman, alt: "Waterman" },
    { src: sleutelvrouw, alt: "Sleutelvrouw" },
  ];

  const countries = [
    {
      name: `${homePageContent.destinations.europe.countries.netherlands}`,
      img: netherlands,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.france}`,
      img: france,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.spain}`,
      img: spain,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const smallCountries = [
    {
      name: `${homePageContent.destinations.europe.countries.italy}`,
      img: italy,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.belgium}`,
      img: belgium,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.germany}`,
      img: germany,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.greece}`,
      img: greece,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.unitedKingdom}`,
      img: uk,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.portugal}`,
      img: portugal,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.croatia}`,
      img: croatia,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.poland}`,
      img: poland,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.austria}`,
      img: austria,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.europe.countries.czech}`,
      img: czech,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const asiaCountries = [
    {
      name: `${homePageContent.destinations.asia.countries.philippines}`,
      img: philippines,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.thailand}`,
      img: thailand,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.indonesia}`,
      img: indonesia,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const smallAsiaCountries = [
    {
      name: `${homePageContent.destinations.asia.countries.india}`,
      img: india,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.malaysia}`,
      img: malaysia,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.vietnam}`,
      img: vietnam,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.turkey}`,
      img: turkey,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.asia.countries.singapore}`,
      img: singapore,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const caribbeanCountries = [
    {
      name: `${homePageContent.destinations.caribbean.locations.aruba}`,
      img: aruba,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.bonaire}`,
      img: bonaire,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.curacao}`,
      img: curacao,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const smallCaribbeanCountries = [
    {
      name: `${homePageContent.destinations.caribbean.locations.saintBarthelemy}`,
      img: saintBarthelemy,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.costaRica}`,
      img: costaRica,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.dominicanRepublic}`,
      img: dominicanRepublic,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.puertoRico}`,
      img: puertroRico,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.caribbean.locations.stMaarten}`,
      img: stMaarten,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const skiCountries = [
    {
      name: `${homePageContent.destinations.ski.locations.austria}`,
      img: austria,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.ski.locations.frenchAlps}`,
      img: frenchalps,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.ski.locations.switzerland}`,
      img: switzerland,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.ski.locations.chamonix}`,
      img: chamonix,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.ski.locations.blackForest}`,
      img: blackforest,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.destinations.ski.locations.italyTrentino}`,
      img: italyTrentino,
      description: `${homePageContent.filters.groups.description}`,
    },
  ];

  const seasons = [
    { name: `${homePageContent.filters.season.spring}`, img: spring },
    { name: `${homePageContent.filters.season.summer}`, img: summer },
    { name: `${homePageContent.filters.season.fall}`, img: fall },
    { name: `${homePageContent.filters.season.winter}`, img: winter },
  ];

  const interests = [
    {
      name: `${homePageContent.filters.interest.luxury}`,
      img: luxury,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.beach}`,
      img: beach,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.lastMinute}`,
      img: lastMinute,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.wellness}`,
      img: wellness,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.romantic}`,
      img: romantic,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.adventure}`,
      img: adventure,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.nature}`,
      img: nature,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.culture}`,
      img: culture,
      description: `${homePageContent.filters.groups.description}`,
    },
    {
      name: `${homePageContent.filters.interest.culinary}`,
      img: culinary,
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
      <div className="domits-homepage">
        <div className="domits-searchContainer">
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
              <img src={bill} alt="bill" />
              <p>{homePageContent.features.securePayments}</p>
            </div>
            <div className="domits-iconTextGroup">
              <img src={verifiedLogo} alt="verified logo" />
              <p>{homePageContent.features.verifiedGuest}</p>
            </div>
            <div className="domits-iconTextGroup">
              <img src={question} alt="question" />
              <p>{homePageContent.features.quickPhone}</p>
            </div>
            <div className="domits-iconTextGroup">
              <img src={checkMark} alt="checkMark" />
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
                  {activePopup === item.text && <div className="popup-box">{item.text}</div>}
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
          <h3 className="domits-subHead">{homePageContent.sections.discoverCampers}</h3>
          <div className="domits-accommodationGroup">
            {camperLoading === false ? (
              camperAccommodations.length > 0 ? (
                camperAccommodations.map((camper) => {
                  return <AccommodationCard key={camper.property.id} accommodation={camper} onClick={handleClick} />;
                })
              ) : (
                <div>No campers available.</div>
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
            <button className="list-property-button">{homePageContent.sections.becomeHost.button}</button>
          </div>
          <div className="host-images">
            {hostImages.map((image, index) => (
              <img key={index} src={image.src} alt={image.alt} className="host-image" />
            ))}
          </div>
        </div>

        <h1 className="Places-text">{homePageContent.destinations.europe.title}</h1>
        <div className="countries-container">
          {countries.map((country, index) => (
            <div className="country-card" key={index}>
              <a href="https://www.domits.com/home/" target="_blank" rel="noopener noreferrer">
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
              <p>{country.description}</p>
            </div>
          ))}
        </div>
        <div className="small-countries-container">
          {smallCountries.map((country, index) => (
            <div className="country-card small-country-card" key={index}>
              <a href="https://www.domits.com/home/" target="_blank" rel="noopener noreferrer">
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
              <p>{country.description}</p>
            </div>
          ))}
        </div>
        <h1 className="Places-text">{homePageContent.destinations.asia.title}</h1>
        <div className="asia-countries-container">
          {asiaCountries.map((country, index) => (
            <div className="country-card asia-country-card" key={index}>
              <a href="https://www.domits.com/home/" target="_blank" rel="noopener noreferrer">
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
              <p>{country.description}</p>
            </div>
          ))}
        </div>
        <div className="small-asia-countries-container">
          {smallAsiaCountries.map((country, index) => (
            <div className="country-card small-asia-country-card" key={index}>
              <a href="https://www.domits.com/home/" target="_blank" rel="noopener noreferrer">
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
            </div>
          ))}
        </div>
        <h1 className="Places-text">{homePageContent.destinations.caribbean.title}</h1>
        <div className="caribbean-countries-container">
          {caribbeanCountries.map((country, index) => (
            <div className="country-card caribbean-country-card" key={index}>
              <a href="https://www.domits.com/home/" target="_blank" rel="noopener noreferrer">
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
              <p>{country.description}</p>
            </div>
          ))}
        </div>
        <div className="small-caribbean-countries-container">
          {smallCaribbeanCountries.map((country, index) => (
            <div className="country-card small-caribbean-country-card" key={index}>
              <a href="https://www.domits.com/home/" target="_blank" rel="noopener noreferrer">
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
            </div>
          ))}
        </div>
        <h1 className="Places-text">{homePageContent.destinations.ski.title}</h1>
        <div className="ski-countries-container">
          {skiCountries.map((country, index) => (
            <div className="country-card ski-country-card" key={index}>
              <a href="https://www.domits.com/home/" target="_blank" rel="noopener noreferrer">
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
              <p>{country.description}</p>
            </div>
          ))}
        </div>
        <h1 className="Places-text">{homePageContent.filters.season.title}</h1>
        <div className="seasons-container">
          {seasons.map((season, index) => (
            <div className="season-card" key={index}>
              <a href="https://www.domits.com/home/" target="_blank" rel="noopener noreferrer">
                <img src={season.img} alt={season.name} />
              </a>
              <h3>{season.name}</h3>
            </div>
          ))}
        </div>
        <h1 className="Places-text">{homePageContent.filters.interest.title}</h1>
        <div className="interests-container">
          {interests.map((interest, index) => (
            <div className="interest-card" key={index}>
              <a href="https://www.domits.com/home/" target="_blank" rel="noopener noreferrer">
                <img src={interest.img} alt={interest.name} />
              </a>
              <h3>{interest.name}</h3>
              <p>{interest.description}</p>
            </div>
          ))}
        </div>
        <h1 className="Places-text">{homePageContent.filters.groups.title}</h1>
        <div className="groups-container">
          {groups.map((group, index) => (
            <div className="group-card" key={index}>
              <a href="https://www.domits.com/home/" target="_blank" rel="noopener noreferrer">
                <img src={group.img} alt={group.name} />
              </a>
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
              <img src={review.img} alt={review.name} className="review-profile-pic" />
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
    </>
  );
};

export default Homepage;