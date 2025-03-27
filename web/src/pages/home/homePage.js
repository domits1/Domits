import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../home/homePage.css";
import verifiedLogo from "../../images/icons/verify-icon.png";
import checkMark from "../../images/icons/checkMark.png";
import question from "../../images/icons/question.png";
import bill from "../../images/icons/bill.png";
import { SearchBar } from "../../components/base/SearchBar";
import SkeletonLoader from "../../components/base/SkeletonLoader";
import AccommodationCard from "./AccommodationCard";
import "swiper/css/pagination";
import Header from "./Header";
import greece from '../../pages/home/Images/greece.webp';
import netherlands from '../../pages/home/Images/netherlands.webp';
import france from '../../pages/home/Images/france.webp';
import spain from '../../pages/home/Images/spain.webp';
import italy from '../../pages/home/Images/italy.webp';
import belgium from '../../pages/home/Images/belgium.webp';
import germany from '../../pages/home/Images/germany.webp';
import uk from '../../pages/home/Images/unitedkingdom.webp';
import portugal from '../../pages/home/Images/portugal.webp';
import croatia from '../../pages/home/Images/croatia.webp';
import poland from '../../pages/home/Images/poland.webp';
import austria from '../../pages/home/Images/austria.webp';
import czech from '../../pages/home/Images/czech.webp';
import philippines from '../../pages/home/Images/philippines.webp';
import thailand from '../../pages/home/Images/thailand.webp';
import indonesia from '../../pages/home/Images/indonesia.webp';
import india from '../../pages/home/Images/india.webp';
import malaysia from '../../pages/home/Images/malaysia.webp';
import vietnam from '../../pages/home/Images/vietnam.webp';
import turkey from '../../pages/home/Images/turkey.webp';
import singapore from '../../pages/home/Images/singapore.webp';
import aruba from '../../pages/home/Images/aruba.webp';
import bonaire from '../../pages/home/Images/bonaire.webp';
import curacao from '../../pages/home/Images/curacao.webp';
import saintBarthelemy from '../../pages/home/Images/saintbarthelemy.webp';
import costaRica from '../../pages/home/Images/costarica.webp';
import dominicanRepublic from '../../pages/home/Images/dominicanrepublic.webp';
import puertroRico from '../../pages/home/Images/puertrorico.webp';
import stMaarten from '../../pages/home/Images/stmaarten.webp';
import frenchalps from '../../pages/home/Images/frenchalps.webp';
import switzerland from '../../pages/home/Images/switzerland.webp';
import chamonix from '../../pages/home/Images/Chamonix-Mont-Blanc.webp';
import blackforest from '../../pages/home/Images/blackforest.webp';
import italyTrentino from '../../pages/home/Images/italytretinio.webp';
import spring from '../../pages/home/Images/spring.webp';
import summer from '../../pages/home/Images/summer.webp';
import fall from '../../pages/home/Images/fall.webp';
import winter from '../../pages/home/Images/winter.webp';
import friends from '../../pages/home/Images/friends.webp';
import couples from '../../pages/home/Images/couples.webp';
import family from '../../pages/home/Images/family.webp';
import solo from '../../pages/home/Images/solo.webp';
import senior from '../../pages/home/Images/senior.webp';
import petFriendly from '../../pages/home/Images/petfriendly.webp';
import luxury from '../../pages/home/Images/luxury.webp';
import beach from '../../pages/home/Images/beach.webp';
import lastMinute from '../../pages/home/Images/lastminute.webp';
import wellness from '../../pages/home/Images/wellness.webp';
import romantic from '../../pages/home/Images/romantic.webp';
import adventure from '../../pages/home/Images/adventure.webp';
import nature from '../../pages/home/Images/nature.webp';
import culture from '../../pages/home/Images/culture.webp';
import culinary from '../../pages/home/Images/culinary.webp';
import waterman from '../../pages/home/Images/waterman.webp';
import sleutelvrouw from '../../pages/home/Images/sleutelvrouw.webp';
import profilePic from '../../pages/home/Images/sleutelvrouw.webp';


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

  const searchBarRef = useRef(null);
  const navigate = useNavigate();

  const toggleBar = (isActive) => {
    setIsBarActive(isActive);
  };

  const hostImages = [
    { src: waterman, alt: 'Waterman' },
    { src: sleutelvrouw, alt: 'Sleutelvrouw' },
  ];


  const countries = [
    { name: 'The Netherlands', img: netherlands, description: 'Vacation Rentals and Apartments' },
    { name: 'France', img: france, description: 'Vacation Rentals and Apartments' },
    { name: 'Spain', img: spain, description: 'Vacation Rentals and Apartments' },
  ];

  const smallCountries = [
    { name: 'Italy', img: italy, description: 'Vacation Rentals and Apartments' },
    { name: 'Belgium', img: belgium, description: 'Vacation Rentals and Apartments' },
    { name: 'Germany', img: germany, description: 'Vacation Rentals and Apartments' },
    { name: 'Greece', img: greece, description: 'Vacation Rentals and Apartments' },
    { name: 'United Kingdom', img: uk, description: 'Vacation Rentals and Apartments' },
    { name: 'Portugal', img: portugal, description: 'Vacation Rentals and Apartments' },
    { name: 'Croatia', img: croatia, description: 'Vacation Rentals and Apartments' },
    { name: 'Poland', img: poland, description: 'Vacation Rentals and Apartments' },
    { name: 'Austria', img: austria, description: 'Vacation Rentals and Apartments' },
    { name: 'Czech', img: czech, description: 'Vacation Rentals and Apartments' },
  ];

  const asiaCountries = [
    { name: 'Philippines', img: philippines, description: 'Vacation Rentals and Apartments' },
    { name: 'Thailand', img: thailand, description: 'Vacation Rentals and Apartments' },
    { name: 'Indonesia', img: indonesia, description: 'Vacation Rentals and Apartments' },
  ];

  const smallAsiaCountries = [
    { name: 'India', img: india, description: 'Vacation Rentals and Apartments' },
    { name: 'Malaysia', img: malaysia, description: 'Vacation Rentals and Apartments' },
    { name: 'Vietnam', img: vietnam, description: 'Vacation Rentals and Apartments' },
    { name: 'Turkey', img: turkey, description: 'Vacation Rentals and Apartments' },
    { name: 'Singapore', img: singapore, description: 'Vacation Rentals and Apartments' },
  ];

  const caribbeanCountries = [
    { name: 'Aruba', img: aruba, description: 'Vacation Rentals and Apartments' },
    { name: 'Bonaire', img: bonaire, description: 'Vacation Rentals and Apartments' },
    { name: 'Curacao', img: curacao, description: 'Vacation Rentals and Apartments' },
  ];

  const smallCaribbeanCountries = [
    { name: 'Saint Barthelemy', img: saintBarthelemy, description: 'Vacation Rentals and Apartments' },
    { name: 'Costa Rica', img: costaRica, description: 'Vacation Rentals and Apartments' },
    { name: 'Dominican Republic', img: dominicanRepublic, description: 'Vacation Rentals and Apartments' },
    { name: 'Puerto Rico', img: puertroRico, description: 'Vacation Rentals and Apartments' },
    { name: 'St. Maarten', img: stMaarten, description: 'Vacation Rentals and Apartments' },
  ];

  const skiCountries = [
    { name: 'Austria', img: austria, description: 'Vacation Rentals and Apartments' },
    { name: 'French Alps', img: frenchalps, description: 'Vacation Rentals and Apartments' },
    { name: 'Switzerland', img: switzerland, description: 'Vacation Rentals and Apartments' },
    { name: 'Chamonix-Mont-Blanc', img: chamonix, description: 'Vacation Rentals and Apartments' },
    { name: 'Black Forest', img: blackforest, description: 'Vacation Rentals and Apartments' },
    { name: 'Italy Trentino', img: italyTrentino, description: 'Vacation Rentals and Apartments' },
  ];

  const seasons = [
    { name: 'Spring', img: spring },
    { name: 'Summer', img: summer },
    { name: 'Fall', img: fall },
    { name: 'Winter', img: winter },
  ];

  const interests = [
    { name: 'Luxury', img: luxury, description: 'Vacation Rentals and Apartments' },
    { name: 'Beach', img: beach, description: 'Vacation Rentals and Apartments' },
    { name: 'Last minute', img: lastMinute, description: 'Vacation Rentals and Apartments' },
    { name: 'Wellness', img: wellness, description: 'Vacation Rentals and Apartments' },
    { name: 'Romantic', img: romantic, description: 'Vacation Rentals and Apartments' },
    { name: 'Adventure', img: adventure, description: 'Vacation Rentals and Apartments' },
    { name: 'Nature', img: nature, description: 'Vacation Rentals and Apartments' },
    { name: 'Culture', img: culture, description: 'Vacation Rentals and Apartments' },
    { name: 'Culinary', img: culinary, description: 'Vacation Rentals and Apartments' },
  ];

  const groups = [
    { name: 'Friends', img: friends, description: 'Vacation Rentals and Apartments' },
    { name: 'Couples', img: couples, description: 'Vacation Rentals and Apartments' },
    { name: 'Family & child friendly', img: family, description: 'Vacation Rentals and Apartments' },
    { name: 'Solo', img: solo, description: 'Vacation Rentals and Apartments' },
    { name: 'Senior', img: senior, description: 'Vacation Rentals and Apartments' },
    { name: 'Pet Friendly', img: petFriendly, description: 'Vacation Rentals and Apartments' },
  ];

  const reviews = [
    { name: 'Oliver Reynolds', img: waterman, text: 'Fantastic platform! Booking was a breeze, and the support team was incredibly helpful.' },
    { name: 'Sophia Bennett', text: 'Seamless experience from start to finish. Highly recommend!' },
    { name: 'Liam Anderson', text: 'Super easy to use, and the customer service was excellent!' },
    { name: 'Emma Carter', text: 'Absolutely loved using this platform. Will definitely book again!' },
    { name: 'Noah Fitzgerald', text: 'Great experience! Everything was smooth and hassle-free.' },
    { name: 'Ava Mitchell', text: 'Top-tier service and an intuitive interface. Loved it!' },
    { name: 'Mason Brooks', text: 'This platform made my trip planning effortless!' },
    { name: 'Isabella Collins', text: 'User-friendly and reliable. Couldn’t ask for more.' },
    { name: 'Elijah Thompson', text: 'Exceptional service and very easy to navigate!' },
    { name: 'Mia Richardson', text: 'Best booking experience I’ve ever had!' },
    { name: 'James Parker', text: 'A must-use platform for hassle-free travel!' },
    { name: 'Charlotte Hayes', text: 'Loved the simplicity and efficiency. Highly recommended!' },
    { name: 'Benjamin Scott', text: 'Flawless experience! The platform was intuitive and responsive.' },
    { name: 'Amelia Cooper', text: 'Booking was quick and easy. Amazing service!' },
    { name: 'Lucas Edwards', text: 'Perfect for stress-free trip planning. Five stars!' },
    { name: 'Harper Morgan', text: 'Superb experience! Will definitely use this again.' },
    { name: 'Henry Watson', text: 'Everything worked perfectly. I’m very satisfied!' },
    { name: 'Evelyn Turner', text: 'The best travel booking site I’ve ever used!' },
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


  const fetchBoatAccommodations = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-Onboarding-Production-Read-AllBoatAccommodations"
      );

      if (!response.ok) throw new Error("Failed to fetch boat accommodations");
      const jsonResponse = await response.json();
      const data =
        typeof jsonResponse.body === "string"
          ? JSON.parse(jsonResponse.body)
          : jsonResponse.body;
      const filteredData = data.filter((item) => item.Drafted === false);
      const limitedData = filteredData.slice(0, 4);

      setBoatAccommodations(limitedData);
    } catch (error) {
      console.error("Error fetching boat accommodations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccommodationsByType = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-Onboarding-Production-Read-MixAccommodations"
      );
      if (!response.ok)
        throw new Error(
          `Failed to fetch accommodations: ${response.statusText}`
        );

      const data = await response.json();

      const accommodations =
        typeof data.body === "string" ? JSON.parse(data.body) : data.body;

      setByTypeAccommodations(accommodations);
    } catch (error) {
      console.error(
        "Error fetching mixed accommodations:",
        error.message,
        error.stack
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchCamperAccommodations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-Onboarding-Production-Read-AllCamperAccommodations"
      );
      if (!response.ok)
        throw new Error("Failed to fetch camper accommodations");
      const data = JSON.parse((await response.json()).body);

      const limitedData = data.slice(0, 4);

      setCamperAccommodations(limitedData);
    } catch (error) {
      console.error("Error fetching camper accommodations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccommodationImages = async () => {
    try {
      setLoadingImages(true);
      const response = await fetch(
        "https://lhp0t08na7.execute-api.eu-north-1.amazonaws.com/prod/getAllAccommodationImages"
      );
      if (!response.ok) throw new Error("Failed to fetch accommodation images");
      const data = await response.json();
      setAccommodationImages(data);
    } catch (error) {
      console.error("Error fetching accommodation images:", error);
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    fetchBoatAccommodations();
    fetchCamperAccommodations();
    fetchAccommodationsByType();
    fetchAccommodationImages();
  }, []);

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
              <img key={index} src={image.src} alt={image.alt} className="host-image" />
            ))}
          </div>
        </div>

        <h1 className="Places-text">Countries in Europe</h1>
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
        <h1 className="Places-text">Destinations in Asia</h1>
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
        <h1 className="Places-text">Islands in the Caribbean</h1>
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
        <h1 className="Places-text">Popular ski destinations</h1>
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
        <h1 className="Places-text">Favorites by Season</h1>
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
        <h1 className="Places-text">Great picks by interest</h1>
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
        <h1 className="Places-text">Accommodations by group</h1>
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
                <img src={profilePic} alt="Reviewer" className="review-profile-pic" />
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
          <h2 className="domits-communityHead">
            Need help? Join the community
          </h2>
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
