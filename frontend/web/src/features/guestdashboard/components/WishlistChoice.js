import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import CloseIcon from "@mui/icons-material/Close";
import { getAccessToken } from "../utils/authUtils";
import { fetchWishlists, moveAccommodation } from "../services/wishlistService";

const WishlistChoice = ({ propertyId, activeList, show, onClose, onSave }) => {
  const [showEdit, setShowEdit] = useState(false);
  const [wishlists, setWishlists] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [selectedList, setSelectedList] = useState(activeList || "My next trip");

  const popupRef = useRef();

  // Fetch user's wishlists
   useEffect(() => {
    const getWishlists = async () => {
      try {
        const data = await fetchWishlists();
        setWishlists(Object.keys(data.wishlists || {}));
      } catch (err) {
        console.error("Failed to fetch wishlists", err);
      }
    };

    if (show) {
      getWishlists();
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
      await moveAccommodation(activeList, listToUse, propertyId);
      if (onSave) onSave(listToUse);
      onClose();
    } catch (err) {
      console.error("Failed to move accommodation:", err.message);
    }
  };

  if (!show || typeof document === "undefined") return null;

  return ReactDOM.createPortal(
    <div className="wishlist-modal-backdrop">
      <dialog
        ref={popupRef}
        className="wishlist-modal"
        aria-modal="true"
        aria-label="Wishlist"
        open
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wishlist-modal__header">
          <h2 className="wishlist-modal__title">
            {showEdit ? "Save to wishlist" : "Saved to wishlist"}
          </h2>
          <button
            type="button"
            className="wishlist-modal__close"
            onClick={onClose}
            aria-label="Close wishlist modal"
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {!showEdit ? (
          <div className="wishlist-modal__confirm">
            <p className="wishlist-modal__saved-text">
              Saved in: <strong>{selectedList}</strong>
            </p>
            <button
              type="button"
              className="wishlist-modal__edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowEdit(true);
              }}
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="wishlist-modal__edit">
            <div className="wishlist-modal__list">
              {wishlists.map((list, i) => (
                <label key={i} className="wishlist-modal__option">
                  <input
                    type="radio"
                    name="wishlist"
                    value={list}
                    checked={selectedList === list && newListName === ""}
                    onChange={() => {
                      setSelectedList(list);
                      setNewListName("");
                    }}
                  />
                  {list}
                </label>
              ))}
              <label className="wishlist-modal__option">
                <input
                  type="radio"
                  name="wishlist"
                  checked={newListName !== ""}
                  onChange={() => setSelectedList("")}
                />
                <strong>Create new list</strong>
              </label>
              {newListName !== "" || selectedList === "" ? (
                <input
                  className="wishlist-modal__new-input"
                  type="text"
                  placeholder="Give your list a name"
                  value={newListName}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setNewListName(e.target.value);
                    setSelectedList("");
                  }}
                />
              ) : null}
            </div>
            <button
              type="button"
              className="wishlist-modal__save-btn"
              onClick={handleConfirm}
            >
              Save
            </button>
          </div>
        )}
      </dialog>
    </div>,
    document.body,
  );
};

export default WishlistChoice;
