import React, { useState, useEffect, useRef, toggleBar  } from "react";
import { useNavigate } from "react-router-dom";
import "./homePage.css";
import verifiedLogo from "../../images/icons/verify-icon.png";
import checkMark from "../../images/icons/checkMark.png";
import question from "../../images/icons/question.png";
import bill from "../../images/icons/bill.png";
import { SearchBar } from '../base/SearchBar';
import SkeletonLoader from "../base/SkeletonLoader";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { EffectFade, Navigation, Pagination } from "swiper/modules";
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

  if (loading || loadingImages) {
    return (
      <div className="domits-full-visibility">
        {Array(8)
          .fill()
          .map((_, index) => (
            <SkeletonLoader key={index} />
          ))}
      </div>
    );
  }

  const AccommodationCard = ({ accommodation }) => {
    const images =
      accommodationImages.find((img) => img.ID === accommodation.ID)?.Images || [];
    const imageArray = Object.values(images);

    return (
      <div
        className="domits-accocard"
        key={accommodation.ID}
        onClick={(e) => handleClick(e, accommodation.ID)}
      >
        <Swiper
          spaceBetween={30}
          effect={"fade"}
          navigation={true}
          pagination={{ clickable: true }}
          modules={[EffectFade, Navigation, Pagination]}
          className="domits-mySwiper"
        >
          {imageArray.map((img, index) => (
            <SwiperSlide key={index}>
              <img src={img} alt={`Accommodation ${accommodation.ID} - Image ${index + 1}`} />
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="domits-accocard-content">
          <div className="domits-accocard-title">
            {accommodation.City || "Unknown City"}, {accommodation.Country || "Unknown Country"}
          </div>
          <div className="domits-accocard-price">
            €{accommodation.Rent || "N/A"} per night
          </div>
          <div className="domits-accocard-specs">
            <div>{accommodation.Bedrooms || 0} Bedroom(s)</div>
            <div>{accommodation.GuestAmount || 0} Guest(s)</div>
          </div>
        </div>
      </div>
    );
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

      <SearchBar setSearchResults={setSearchResults} setLoading={setLoading} placeholderText="Search for holiday homes, boats, or campers..."/>

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
            <p>Domits Quality Guarantee</p>
          </div>
        </div>
      </div>

      <div className="domits-boatContainer">
        <div className="domits-boatText">
          <h3 className="domits-subHead">Trending accommodations this month</h3>

          <div className="domits-trendingContainer">
        <div data-popup-text="We strive to offer you the best possible price. If you find a cheaper option somewhere, we will adjust it for you in consultation.">
        🎖️ We offer you the best price guarantee
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
            byTypeAccommodations.map((accommodation, index) => (
              <AccommodationCard key={index} accommodation={accommodation} />
            ))
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
            boatAccommodations.map((boat) => (
              <AccommodationCard key={boat.ID} accommodation={boat} />
            ))
          ) : (
            <div>No boats available.</div>
          )}
        </div>
      </div>

      <div className="domits-boatContainer">
        <div className="domits-boatText">
          <h3 className="domits-subHead">Discover beautiful campers</h3>
        </div>
        <div className="domits-accommodationGroup">
        {camperAccommodations.length > 0 ? (
          camperAccommodations.map((camper) => (
            <AccommodationCard key={camper.ID} accommodation={camper} />
          ))
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
