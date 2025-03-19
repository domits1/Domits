import React, { useState, useEffect, useRef  } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/homePage.css";
import verifiedLogo from "../../images/icons/verify-icon.png";
import checkMark from "../../images/icons/checkMark.png";
import question from "../../images/icons/question.png";
import bill from "../../images/icons/bill.png";
import { SearchBar } from '../../components/base/SearchBar';
import SkeletonLoader from "../../components/base/SkeletonLoader";
import AccommodationCard from "./AccommodationCard";
import "swiper/css/pagination";
import Header from "./Header"; 


const Homepage = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [boatAccommodations, setBoatAccommodations] = useState([]);
  const [camperAccommodations, setCamperAccommodations] = useState([]);
  const [accommodationImages, setAccommodationImages] = useState([]);
  const [byTypeAccommodations, setByTypeAccommodations] = useState([]);
  const [isBarActive, setIsBarActive] = useState(false);

  const toggleBar = (isActive) => {
    setIsBarActive(isActive);
};

  useEffect(() => {
    document.body.classList.add("hide-header");

    return () => {
      document.body.classList.remove("hide-header");
    };
  }, []);

  const [isFixed, setIsFixed] = useState(false);
  const searchBarRef = useRef(null);

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

  const navigate = useNavigate();

  const fetchBoatAccommodations = async () => {
    try {
        setLoading(true);

        const response = await fetch(
            "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-Onboarding-Production-Read-AllBoatAccommodations"
        );

        if (!response.ok) throw new Error("Failed to fetch boat accommodations");
        const jsonResponse = await response.json();
        const data = typeof jsonResponse.body === "string" ? JSON.parse(jsonResponse.body) : jsonResponse.body;
        const filteredData = data.filter(item => item.Drafted === false);
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
      if (!response.ok) throw new Error(`Failed to fetch accommodations: ${response.statusText}`);

      const data = await response.json();

      const accommodations = typeof data.body === 'string' ? JSON.parse(data.body) : data.body;

      setByTypeAccommodations(accommodations);
    } catch (error) {
      console.error("Error fetching mixed accommodations:", error.message, error.stack);
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
        if (!response.ok) throw new Error("Failed to fetch camper accommodations");
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
    if (e.target.closest(".swiper-button-next") || e.target.closest(".swiper-button-prev")) {
      e.stopPropagation();
      return;
    }
    navigate(`/listingdetails?ID=${encodeURIComponent(ID)}`);
  };

 
  return (
    <>
      <Header />
    <div className="domits-homepage">
      <div className="domits-searchContainer">
        <div className="domits-searchTextCon">
          <h3 className="domits-searchText">Book holiday homes, boats and campers..</h3>
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
          <h3 className="domits-subHead">Trending accommodations this month</h3>

          <div className="domits-trendingContainer">
        <div data-popup-text="We strive to offer you the best possible price. If you find a cheaper option somewhere, we will adjust it for you in consultation.">
        🎖️ Best price guarantee
      </div>
      <div data-popup-text="If changes are made after your stay has been confirmed, Domits will do its best to coordinate your stay.">
      ✅ Accommodation booking guarantee
      </div>
      <div data-popup-text="If upon arrival at the property you are unable to get the rooms you have arranged, Domits will do its best to coordinate your stay.">
      🤝 Guarantee of stay at the accommodation
      </div>
      </div>
        </div>
        <div className="domits-accommodationGroup">
            {byTypeAccommodations.length > 0 ? (
              byTypeAccommodations.map((accommodation) => {
                const images =
                  accommodationImages.find((img) => img.ID === accommodation.ID)?.Images || [];
                return (
                  <AccommodationCard
                    key={accommodation.ID}
                    accommodation={accommodation}
                    images={Object.values(images)}
                    onClick={handleClick}
                  />
                );
              })
            ) : (
              <div>No accommodations available.</div>
            )}
        </div>
      </div>

        <div className="domits-boatContainer">
          <div className="domits-boatText">
            <h3 className="domits-subHead">Rent a boat for any occasion</h3>
          </div>
          <div className="domits-accommodationGroup">
            {boatAccommodations.length > 0 ? (
              boatAccommodations.map((boat) => {
                const images =
                  accommodationImages.find((img) => img.ID === boat.ID)?.Images || [];
                return (
                  <AccommodationCard
                    key={boat.ID}
                    accommodation={boat}
                    images={Object.values(images)}
                    onClick={handleClick}
                  />
                );
              })
            ) : (
              <div>No boats available.</div>
            )}
          </div>
        </div>

        <div className="domits-boatContainer">
        <h3 className="domits-subHead">Discover Beautiful Campers</h3>
        <div className="domits-accommodationGroup">
        {camperAccommodations.length > 0 ? (
          camperAccommodations.map((camper) => {
            const images = accommodationImages.find((img) => img.ID === camper.ID)?.Images || [];
            return (
              <AccommodationCard
                key={camper.ID}
                accommodation={camper}
                images={Object.values(images)}
                onClick={handleClick}
              />
            );
          })
        ) : (
          <div>No campers available.</div>
        )}
      </div>
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
    </div>
  </>
  );
};

export default Homepage;
