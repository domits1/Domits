import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "./utils/authUtils";
import { fetchWishlistItems } from "./services/wishlistService";

import "./styles/GuestWishlist.scss";
import Toast from "../../components/toast/Toast";

import GuestSelector from "./components/GuestSelector";
import GuestActions from "./components/GuestActions";

import AccommodationCard from "../../pages/home/AccommodationCard";

const GuestWishlist = () => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedList, setSelectedList] = useState("My next trip");
  const [toast, setToast] = useState({ message: "", status: "" });
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWishlist = async () => {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const items = await fetchWishlistItems(selectedList);
        const propertyIds = items.map((item) => item.propertyId);

        if (propertyIds.length === 0) {
          setWishlist([]);
          return;
        }

        const detailsRes = await fetch(
          `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/set?properties=${propertyIds.join(",")}`
        );

        if (!detailsRes.ok) throw new Error("Failed to fetch property details");

        const fullData = await detailsRes.json();
        setWishlist(fullData);
      } catch {
        setToast({ message: "Failed to load wishlist. Please try again.", status: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [selectedList, refreshKey]);

  if (loading) return <p>Loading your wishlist...</p>;

  const isEmpty = !Array.isArray(wishlist) || wishlist.length === 0;

  return (
    <div className="pageContainer">
      {ReactDOM.createPortal(
        <Toast
          message={toast.message}
          status={toast.status || "info"}
          onClose={() => setToast({ message: "", status: "" })}
        />,
        document.body,
      )}
      <div className="wishlistTopBar">
        <div className="wishlistActionsRow">
          <GuestActions
            selectedList={selectedList}
            onListChange={(list) => setSelectedList(list)}
            onShare={() => {}}
            onCreate={(name) => setSelectedList(name)}
          />
        </div>

        <div className="wishlistHeader">
          <h2>{selectedList}</h2>
          <div className="wishlistSubRow">
            <p className="wishlistCount">â¤ï¸ {wishlist.length} saved accommodations</p>
            <GuestSelector onClose={() => {}} />
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div className="wishlistEmpty">
          <div className="wishlistEmpty__icon">
            <svg width="260" height="210" viewBox="0 0 260 210" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="20" y="40" width="185" height="155" rx="12" fill="#f0f0f0" stroke="#ddd" strokeWidth="2.5" strokeDasharray="10 7"/>
              <path d="M112 128 C112 110 90 98 90 114 C90 122 101 130 112 142 C123 130 134 122 134 114 C134 98 112 110 112 128Z" fill="none" stroke="#ccc" strokeWidth="3.5"/>
              <circle cx="195" cy="58" r="36" fill="var(--primary-color)"/>
              <path d="M195 44 C195 34 177 28 177 40 C177 47 186 54 195 63 C204 54 213 47 213 40 C213 28 195 34 195 44Z" fill="white"/>
            </svg>
          </div>
          <h3 className="wishlistEmpty__title">Your wishlist is empty</h3>
          <p className="wishlistEmpty__subtitle">Save your favorite listings and plan your next trip!</p>
          <button className="wishlistEmpty__cta" onClick={() => navigate("/")}>Explore properties</button>
        </div>
      ) : (
        <div className="cardGrid">
          {wishlist.map((item) => (
            <div key={item.property?.id} className="wishlistCardWrapper">
              <AccommodationCard
                accommodation={item}
                onClick={(e, id) => navigate(`/listingdetails?ID=${id}`)}
                onUnlike={() => setRefreshKey((k) => k + 1)}
                imageVariant="web"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GuestWishlist;
