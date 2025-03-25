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
import "swiper/css/pagination";
import Header from "./Header";
import {
  FetchAllPropertyTypes,
  FetchPropertyType,
} from "./services/fetchProperties";

const Homepage = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [propertyLoading, setPropertyLoading] = useState(false);
  const [boatLoading, setBoatLoading] = useState(false);
  const [camperLoading, setCamperLoading] = useState(false);
  const [boatAccommodations, setBoatAccommodations] = useState([]);
  const [camperAccommodations, setCamperAccommodations] = useState([]);
  const [allAccommodations, setAllAccommodations] = useState([]);
  const [isBarActive, setIsBarActive] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [activePopup, setActivePopup] = useState(null);

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
      </div>
    </>
  );
};

export default Homepage;
