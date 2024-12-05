import React, { useState, useEffect } from "react";
import "./homePage.css";
import verifiedLogo from "../../images/icons/verify-icon.png";
import checkMark from "../../images/icons/checkMark.png";
import question from "../../images/icons/question.png";
import bill from "../../images/icons/bill.png";
import { MySearchBar } from "../home/SearchBar";
import SkeletonLoader from "../base/SkeletonLoader";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { EffectFade, Navigation, Pagination } from "swiper/modules";

const Homepage = () => {
  const [isActiveSearchBar, setActiveSearchBar] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [boatAccommodations, setBoatAccommodations] = useState([]);
  const [accommodationImages, setAccommodationImages] = useState([])

  const toggleSearchBar = (status) => {
    setActiveSearchBar(status);
    if (status) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  };

  const fetchBoatAccommodations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/General-Boat-Production-Read-Accommodation"
      );
      if (!response.ok) throw new Error("Failed to fetch boat accommodations");
      const data = JSON.parse((await response.json()).body);
      console.log("Fetched Accommodations:", data); // Debug log
      setBoatAccommodations(data);
    } catch (error) {
      console.error("Error fetching boat accommodations:", error);
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
    fetchAccommodationImages();
  }, []);
  

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
        onClick={() =>
          (window.location.href = `/listingdetails?ID=${encodeURIComponent(accommodation.ID)}`)
        }
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
    <div className="domits-homepage">
      <div className="domits-searchContainer">
        <div className="domits-searchTextCon">
          <h3 className="domits-searchText">Book Holiday homes, boats and campers..</h3>
        </div>
        <MySearchBar
          setSearchResults={setSearchResults}
          setLoading={setLoading}
          toggleBar={toggleSearchBar}
          placeholderText="Search for holiday homes, boats, or campers..."
        />
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

      <div className="domits-trendingContainer">
        <div className="domits-tredningText">
          <h3>Trending accommodations this month</h3>
        </div>
        <div data-popup-text="We strive to offer you the best possible price. If you find a cheaper option somewhere, we will adjust it for you in consultation.">
        [Icon] We offer you the best price guarantee
      </div>
      <div data-popup-text="If changes are made after your stay has been confirmed, Domits will do its best to coordinate your stay.">
        [Icon] Accommodation booking guarantee
      </div>
      <div data-popup-text="If upon arrival at the property you are unable to get the rooms you have arranged, Domits will do its best to coordinate your stay.">
        [Icon] Guarantee of stay at the accommodation
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
            <a href="/">Search & book</a>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
