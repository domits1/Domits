import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import CloseIcon from "@mui/icons-material/Close";
import { getAccessToken } from "../utils/authUtils";
import { fetchWishlists, moveAccommodation } from "../services/wishlistService";
import Toast from "../../../components/toast/Toast";

const sortWishlistNames = (names, defaultName = "My next trip") => {
  const safeNames = Array.isArray(names) ? [...names] : [];

  return safeNames.sort((left, right) => {
    const leftIsDefault = left === defaultName;
    const rightIsDefault = right === defaultName;

    if (leftIsDefault && !rightIsDefault) return -1;
    if (!leftIsDefault && rightIsDefault) return 1;

    return String(left || "").localeCompare(String(right || ""), undefined, {
      sensitivity: "base",
    });
  });
};

const WishlistChoice = ({ propertyId, activeList, show, onClose, onSave }) => {
  const [showEdit, setShowEdit] = useState(false);
  const [wishlists, setWishlists] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [selectedList, setSelectedList] = useState(activeList || "My next trip");
  const [toast, setToast] = useState({ message: "", status: "" });

  const popupRef = useRef();

  useEffect(() => {
    const getWishlists = async () => {
      try {
        const data = await fetchWishlists();
        setWishlists(sortWishlistNames(Object.keys(data.wishlists || {})));
      } catch {
        setToast({ message: "Failed to load wishlists. Please try again.", status: "error" });
      }
    };

    if (show) {
      getWishlists();
      setShowEdit(false);
    }
  }, [show]);

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

  const handleConfirm = async () => {
    const token = getAccessToken();
    const listToUse = newListName || selectedList;

    if (!token || !propertyId || !listToUse) return;

    if (listToUse === activeList) {
      onClose();
      return;
    }

    try {
      await moveAccommodation(activeList, listToUse, propertyId);
      if (onSave) onSave(listToUse);
      onClose();
    } catch {
      setToast({ message: "Failed to move accommodation. Please try again.", status: "error" });
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
              {wishlists.map((list) => (
                <label key={list} className="wishlist-modal__option">
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
      {ReactDOM.createPortal(
        <Toast
          message={toast.message}
          status={toast.status || "info"}
          onClose={() => setToast({ message: "", status: "" })}
        />,
        document.body,
      )}
    </div>,
    document.body,
  );
};

WishlistChoice.propTypes = {
  propertyId: PropTypes.string.isRequired,
  activeList: PropTypes.string.isRequired,
  show: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func,
};

export default WishlistChoice;
