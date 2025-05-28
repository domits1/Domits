import React, { useEffect, useRef, useState } from "react";
import { getAccessToken } from "../utils/authUtils";

const WishlistChoice = ({ propertyId, activeList, show, onClose }) => {
  const [showEdit, setShowEdit] = useState(false);
  const [wishlists, setWishlists] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [selectedList, setSelectedList] = useState(activeList || "My next trip");

  const popupRef = useRef();

  // Fetch user's wishlists
  useEffect(() => {
    const fetchWishlists = async () => {
      try {
        const token = getAccessToken();
        const res = await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
          method: "GET",
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
            "Origin": window.location.origin,
          },
        });

        const data = await res.json();
        setWishlists(Object.keys(data.wishlists || {}));
      } catch (err) {
        console.error("Failed to fetch wishlists", err);
      }
    };

    if (show) {
      fetchWishlists();
      setShowEdit(false);
    }
  }, [show]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (show) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, onClose]);

  // Handle the move of an accommodation to a different list
  const handleConfirm = async () => {
    const token = getAccessToken();
    const listToUse = newListName || selectedList;

    if (!token || !propertyId || !listToUse) return;

    // Don't send request if the list is unchanged
    if (listToUse === activeList) {
      onClose();
      return;
    }

    // Send PATCH request to move the accommodation from old list to the selected/new lis
    try {
      await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
        method: "PATCH",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
          "Origin": window.location.origin,
        },
        body: JSON.stringify({
          oldName: activeList,
          newName: listToUse,
          propertyId: propertyId,
        }),
      });

      onClose();
    } catch (err) {
      console.error("Failed to move accommodation:", err.message);
    }
  };

  if (!show) return null;

  
// Render the wishlist popup UI
  return (
    <div className="wishlist-popup" ref={popupRef} onClick={(e) => e.stopPropagation()}>
      {!showEdit ? (
        <div className="confirm-popup">
          <p>Saved in: <strong>{selectedList}</strong></p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEdit(true);
            }}
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="edit-popup">
          <label>Save to:</label>
          {wishlists.map((list, i) => (
            <div key={i}>
              <input
                type="radio"
                id={list}
                name="wishlist"
                value={list}
                checked={selectedList === list}
                onChange={() => {
                  setSelectedList(list);
                  setNewListName("");
                }}
              />
              <label htmlFor={list}>{list}</label>
            </div>
          ))}

          <div>
            <input
              type="radio"
              id="new"
              name="wishlist"
              checked={newListName !== ""}
              onChange={() => setSelectedList("")}
            />
            <label htmlFor="new"><strong>Create new list</strong></label>
            <input
              type="text"
              placeholder="Give your list a name"
              value={newListName}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                setNewListName(e.target.value);
                setSelectedList("");
              }}
            />
          </div>

          <button className="confirmBtn" onClick={handleConfirm}>
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default WishlistChoice;
