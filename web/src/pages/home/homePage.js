import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/homePage.css";
import verifiedLogo from "../../images/icons/verify-icon.png";
import checkMark from "../../images/icons/checkMark.png";
import question from "../../images/icons/question.png";
import bill from "../../images/icons/bill.png";
import { SearchBar } from "../../components/base/SearchBar";
import SkeletonLoader from "../../components/base/SkeletonLoader";
import AccommodationCard from "./AccommodationCard";
import { reviews } from "../home/store/constants";
import { categories as groups } from "../home/store/constants";
import "swiper/css/pagination";
import Header from "./Header";
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
import friends from "../../pages/home/Images/friends.webp";
import couples from "../../pages/home/Images/couples.webp";
import family from "../../pages/home/Images/family.webp";
import solo from "../../pages/home/Images/solo.webp";
import senior from "../../pages/home/Images/senior.webp";
import petFriendly from "../../pages/home/Images/petfriendly.webp";
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
import profilePic from "../../pages/home/Images/sleutelvrouw.webp";
import {
  FetchAllPropertyTypes,
  FetchPropertyType,
} from "./services/fetchProperties";

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
      FetchAllPropertyTypes().then((data) => {
        setAllAccommodations(data.slice(6, 9));
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
      name: "The Netherlands",
      img: netherlands,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "France",
      img: france,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Spain",
      img: spain,
      description: "Vacation Rentals and Apartments",
    },
  ];

  const smallCountries = [
    {
      name: "Italy",
      img: italy,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Belgium",
      img: belgium,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Germany",
      img: germany,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Greece",
      img: greece,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "United Kingdom",
      img: uk,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Portugal",
      img: portugal,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Croatia",
      img: croatia,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Poland",
      img: poland,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Austria",
      img: austria,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Czech",
      img: czech,
      description: "Vacation Rentals and Apartments",
    },
  ];

  const asiaCountries = [
    {
      name: "Philippines",
      img: philippines,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Thailand",
      img: thailand,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Indonesia",
      img: indonesia,
      description: "Vacation Rentals and Apartments",
    },
  ];

  const smallAsiaCountries = [
    {
      name: "India",
      img: india,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Malaysia",
      img: malaysia,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Vietnam",
      img: vietnam,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Turkey",
      img: turkey,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Singapore",
      img: singapore,
      description: "Vacation Rentals and Apartments",
    },
  ];

  const caribbeanCountries = [
    {
      name: "Aruba",
      img: aruba,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Bonaire",
      img: bonaire,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Curacao",
      img: curacao,
      description: "Vacation Rentals and Apartments",
    },
  ];

  const smallCaribbeanCountries = [
    {
      name: "Saint Barthelemy",
      img: saintBarthelemy,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Costa Rica",
      img: costaRica,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Dominican Republic",
      img: dominicanRepublic,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Puerto Rico",
      img: puertroRico,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "St. Maarten",
      img: stMaarten,
      description: "Vacation Rentals and Apartments",
    },
  ];

  const skiCountries = [
    {
      name: "Austria",
      img: austria,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "French Alps",
      img: frenchalps,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Switzerland",
      img: switzerland,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Chamonix-Mont-Blanc",
      img: chamonix,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Black Forest",
      img: blackforest,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Italy Trentino",
      img: italyTrentino,
      description: "Vacation Rentals and Apartments",
    },
  ];

  const seasons = [
    { name: "Spring", img: spring },
    { name: "Summer", img: summer },
    { name: "Fall", img: fall },
    { name: "Winter", img: winter },
  ];

  const interests = [
    {
      name: "Luxury",
      img: luxury,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Beach",
      img: beach,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Last minute",
      img: lastMinute,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Wellness",
      img: wellness,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Romantic",
      img: romantic,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Adventure",
      img: adventure,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Nature",
      img: nature,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Culture",
      img: culture,
      description: "Vacation Rentals and Apartments",
    },
    {
      name: "Culinary",
      img: culinary,
      description: "Vacation Rentals and Apartments",
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

  useEffect(() => {
    document.body.classList.add("hide-header");

    return () => {
      document.body.classList.remove("hide-header");
    };
  }, []);

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
    if (
      e.target.closest(".swiper-button-next") ||
      e.target.closest(".swiper-button-prev")
    ) {
      e.stopPropagation();
      return;
    }
    navigate(`/listingdetails?ID=${encodeURIComponent(ID)}`);
  };

  const handlePopupClick = (text) => {
    setActivePopup(activePopup === text ? null : text); // Toggle popup
  };

  return (
    <>
      <Header />
      <div className="domits-homepage">
        <div className="domits-searchContainer">
          <div className="domits-searchTextCon">
            <h3 className="domits-searchText">
              Book holiday homes, boats and campers..
            </h3>
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
              <p>Secure payments</p>
            </div>
            <div className="domits-iconTextGroup">
              <img src={verifiedLogo} alt="verified logo" />
              <p>Verified guests/hosts</p>
            </div>
            <div className="domits-iconTextGroup">
              <img src={question} alt="question" />
              <p>Quick phone support</p>
            </div>
            <div className="domits-iconTextGroup">
              <img src={checkMark} alt="checkMark" />
              <p>Domits quality guarantee</p>
            </div>
          </div>
        </div>

        <div className="domits-boatContainer">
          <div className="domits-boatText">
            <h3 className="domits-subHead">
              Trending accommodations this month
            </h3>

            <div className="domits-trendingContainer">
              {[
                {
                  emoji: "🎖️",
                  title: "Best price guarantee",
                  text: "We strive to offer you the best possible price. If you find a cheaper option somewhere, we will adjust it for you in consultation.",
                },
                {
                  emoji: "✅",
                  title: "Accommodation booking guarantee",
                  text: "If changes are made after your stay has been confirmed, Domits will do its best to coordinate your stay.",
                },
                {
                  emoji: "🤝",
                  title: "Guarantee of stay at the accommodation",
                  text: "If upon arrival at the property you are unable to get the rooms you have arranged, Domits will do its best to coordinate your stay.",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="popup-trigger"
                  onClick={() => handlePopupClick(item.text)}
                >
                  {item.emoji} {item.title}
                  {activePopup === item.text && (
                    <div className="popup-box">{item.text}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="domits-accommodationGroup">
            {propertyLoading === false ? (
              allAccommodations.length > 0 ? (
                allAccommodations.map((property) => (
                  <AccommodationCard
                    key={property.property.id}
                    accommodation={property}
                    onClick={handleClick}
                  />
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
            <h3 className="domits-subHead">Rent a boat for any occasion</h3>
          </div>
          <div className="domits-accommodationGroup">
            {boatLoading === false ? (
              boatAccommodations.length > 0 ? (
                boatAccommodations.map((boat) => (
                  <AccommodationCard
                    key={boat.property.id}
                    accommodation={boat}
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

        <div className="domits-boatContainer">
          <h3 className="domits-subHead">Discover Beautiful Campers</h3>
          <div className="domits-accommodationGroup">
            {camperLoading === false ? (
              camperAccommodations.length > 0 ? (
                camperAccommodations.map((camper) => {
                  return (
                    <AccommodationCard
                      key={camper.property.id}
                      accommodation={camper}
                      onClick={handleClick}
                    />
                  );
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
            <h1 className="BH">Become a host</h1>
            <ul>
              <li>List your property for free.</li>
              <li>Manage everything centrally.</li>
              <li>Increase your booking metrics.</li>
            </ul>
            <button className="list-property-button">List your property</button>
          </div>
          <div className="host-images">
            {hostImages.map((image, index) => (
              <img
                key={index}
                src={image.src}
                alt={image.alt}
                className="host-image"
              />
            ))}
          </div>
        </div>

        <h1 className="Places-text">Countries in Europe</h1>
        <div className="countries-container">
          {countries.map((country, index) => (
            <div className="country-card" key={index}>
              <a
                href="https://www.domits.com/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
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
              <a
                href="https://www.domits.com/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
              <p>{country.description}</p>
            </div>
          ))}
        </div>
        <h1 className="Places-text">Destinations in Asia</h1>
        <div className="asia-countries-container">
          {asiaCountries.map((country, index) => (
            <div className="country-card asia-country-card" key={index}>
              <a
                href="https://www.domits.com/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
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
              <a
                href="https://www.domits.com/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
            </div>
          ))}
        </div>
        <h1 className="Places-text">Islands in the Caribbean</h1>
        <div className="caribbean-countries-container">
          {caribbeanCountries.map((country, index) => (
            <div className="country-card caribbean-country-card" key={index}>
              <a
                href="https://www.domits.com/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
              <p>{country.description}</p>
            </div>
          ))}
        </div>
        <div className="small-caribbean-countries-container">
          {smallCaribbeanCountries.map((country, index) => (
            <div
              className="country-card small-caribbean-country-card"
              key={index}
            >
              <a
                href="https://www.domits.com/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
            </div>
          ))}
        </div>
        <h1 className="Places-text">Popular ski destinations</h1>
        <div className="ski-countries-container">
          {skiCountries.map((country, index) => (
            <div className="country-card ski-country-card" key={index}>
              <a
                href="https://www.domits.com/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={country.img} alt={country.name} />
              </a>
              <h3>{country.name}</h3>
              <p>{country.description}</p>
            </div>
          ))}
        </div>
        <h1 className="Places-text">Favorites by Season</h1>
        <div className="seasons-container">
          {seasons.map((season, index) => (
            <div className="season-card" key={index}>
              <a
                href="https://www.domits.com/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={season.img} alt={season.name} />
              </a>
              <h3>{season.name}</h3>
            </div>
          ))}
        </div>
        <h1 className="Places-text">Great picks by interest</h1>
        <div className="interests-container">
          {interests.map((interest, index) => (
            <div className="interest-card" key={index}>
              <a
                href="https://www.domits.com/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={interest.img} alt={interest.name} />
              </a>
              <h3>{interest.name}</h3>
              <p>{interest.description}</p>
            </div>
          ))}
        </div>
        <h1 className="Places-text">Accommodations by group</h1>
        <div className="groups-container">
          {groups.map((group, index) => (
            <div className="group-card" key={index}>
              <a
                href="https://www.domits.com/home/"
                target="_blank"
                rel="noopener noreferrer"
              >
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
              <img
                src={profilePic}
                alt="Reviewer"
                className="review-profile-pic"
              />
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
        <h2 className="domits-communityHead">Need help? Join the community</h2>
        <p className="domits-communityGroup">
          Domits has a travel community for hosts, guests, and employees
        </p>
        <div className="domits-communityButtons">
          <button className="domits-hostButton">
            <a href="/landing">Become a host</a>
          </button>
          <button className="domits-SearchButton">
            <a href="/home">Search & book</a>
          </button>
        </div>
      </div>
    </>
  );
};

export default Homepage;
