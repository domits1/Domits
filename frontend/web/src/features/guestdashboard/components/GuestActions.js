import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { FiEdit2, FiTrash2, FiChevronDown } from "react-icons/fi";
import "../../guestdashboard/styles/GuestActions.scss";
import Toast from "../../../components/toast/Toast";
import { getAccessToken } from "../utils/authUtils";
import {
  fetchWishlists,
  fetchWishlistItemCount,
  createWishlist,
  renameWishlist,
  deleteWishlist,
} from "../services/wishlistService";

const fetchListWithCount = async (name) => {
  try {
    const countData = await fetchWishlistItemCount(name);
    const realItems = (countData.items || []).filter((item) => item.propertyId);
    return { id: name, name, count: realItems.length };
  } catch {
    return { id: name, name, count: 0 };
  }
};

const sortWishlistLists = (lists, defaultName = "My next trip") => {
  const safeLists = Array.isArray(lists) ? [...lists] : [];

  return safeLists.sort((left, right) => {
    const leftIsDefault = left?.name === defaultName;
    const rightIsDefault = right?.name === defaultName;

    if (leftIsDefault && !rightIsDefault) return -1;
    if (!leftIsDefault && rightIsDefault) return 1;

    return String(left?.name || "").localeCompare(String(right?.name || ""), undefined, {
      sensitivity: "base",
    });
  });
};

const resolveFallbackListName = (lists, preferredName = "My next trip") => {
  const safeLists = Array.isArray(lists) ? lists : [];
  if (safeLists.some((list) => list.name === preferredName)) {
    return preferredName;
  }
  return safeLists[0]?.name || preferredName;
};

const GuestActions = ({ selectedList, onListChange, onCreate }) => {
  const [lists, setLists] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [activePopup, setActivePopup] = useState(null);
  const [newListName, setNewListName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [toast, setToast] = useState({ message: "", status: "" });

  const wrapperRef = useRef(null);

  useEffect(() => {
    const fetchLists = async () => {
      const token = getAccessToken();
      if (!token) return;

      try {
        const data = await fetchWishlists();
        const wishlists = data?.wishlists || {};

        const structured = sortWishlistLists(await Promise.all(Object.keys(wishlists).map(fetchListWithCount)));

        setLists(structured);

        if (!structured.some((l) => l.name === selectedList)) {
          onListChange(resolveFallbackListName(structured));
        }
      } catch {
        setToast({ message: "Failed to load wishlists. Please try again.", status: "error" });
      }
    };

    fetchLists();
  }, [selectedList, onListChange]);

  const handleCreate = async () => {
    const token = getAccessToken();
    if (!token || !newListName.trim()) return;

    try {
      await createWishlist(newListName);

      const newList = { id: newListName, name: newListName, count: 0 };
      setLists(sortWishlistLists([...lists, newList]));
      onListChange(newListName);
      if (onCreate) onCreate(newListName);
      setNewListName("");
      setActivePopup(null);
    } catch {
      setToast({ message: "Failed to create wishlist. Please try again.", status: "error" });
    }
  };

  const handleRename = async (oldName, newName) => {
    if (!newName.trim() || oldName === newName) {
      setEditingId(null);
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    try {
      await renameWishlist(oldName, newName);

      const updated = sortWishlistLists(lists.map((list) =>
        list.name === oldName
          ? { ...list, name: newName, id: newName }
          : list
      ));
      setLists(updated);
      if (selectedList === oldName) onListChange(newName);
      setEditingId(null);
    } catch {
      setToast({ message: "Failed to rename wishlist. Please try again.", status: "error" });
    }
  };

  const handleDelete = async (name) => {
    if (name === "My next trip") return;

    const token = getAccessToken();
    if (!token) return;
    if (!globalThis.confirm(`Delete wishlist "${name}"?`)) return;

    try {
      await deleteWishlist(name);

      const remaining = sortWishlistLists(lists.filter((list) => list.name !== name));
      setLists(remaining);
      if (selectedList === name) onListChange(resolveFallbackListName(remaining));
    } catch {
      setToast({ message: "Failed to delete wishlist. Please try again.", status: "error" });
    }
  };

  const handleShare = () => {
    const baseUrl = globalThis.location.origin + "/guestdashboard";
    const shareLink = `${baseUrl}?wl=${encodeURIComponent(selectedList)}`;
    setShareUrl(shareLink);
    setActivePopup("share");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setToast({ message: "Failed to copy link. Please try again.", status: "error" });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setActivePopup(null);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
    {ReactDOM.createPortal(
      <Toast
        message={toast.message}
        status={toast.status || "error"}
        onClose={() => setToast({ message: "", status: "" })}
      />,
      document.body,
    )}
    <div className="guestActions" ref={wrapperRef}>
      <label className="label" htmlFor="dropdown-toggle">Select list:</label>

      <div className="dropdownWrapper">
        <button
          id="dropdown-toggle"
          className="dropdownToggle"
          onClick={() =>
            setActivePopup(activePopup === "dropdown" ? null : "dropdown")
          }
        >
          {selectedList} <FiChevronDown />
        </button>

        {activePopup === "dropdown" && (
          <div className="dropdownMenu">
            <ul>
              {lists.map((list) => (
                <li key={list.id}>
                  {editingId === list.id ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        autoFocus
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(list.name, editValue);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                      <div className="editActions">
                        <button className="editSaveBtn" onClick={() => handleRename(list.name, editValue)}>
                          Save
                        </button>
                        <button className="editCancelBtn" onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        className="listNameBtn"
                        onClick={() => {
                          onListChange(list.name);
                          setActivePopup(null);
                        }}
                      >
                        {list.name}
                      </button>
                      <div className="rightSide">
                        <span className="badge">{list.count}</span>
                        {list.name !== "My next trip" && (
                          <button onClick={() => { setEditingId(list.id); setEditValue(list.name); }}>
                            <FiEdit2 />
                          </button>
                        )}
                        {list.name !== "My next trip" && (
                          <button onClick={() => handleDelete(list.name)}>
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button className="actionBtn" onClick={handleShare}>
        Share the list
      </button>

      <button
        className="actionBtn"
        onClick={() =>
          setActivePopup(activePopup === "create" ? null : "create")
        }
      >
        Make a list
      </button>

      {activePopup === "create" && (
        <div className="popup">
          <p className="popupTitle">
            Make a list <span>*</span>
          </p>
          <input
            type="text"
            placeholder="Give your new list a name"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <button className="confirmBtn" onClick={handleCreate}>
            Create
          </button>
        </div>
      )}

      {activePopup === "share" && shareUrl && (
        <div className="popup">
          <p className="popupTitle">Shareable link</p>
          <input type="text" value={shareUrl} readOnly />
          <button className="confirmBtn" onClick={handleCopy}>
            {copySuccess ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </div>
    </>
  );
};

GuestActions.propTypes = {
  selectedList: PropTypes.string.isRequired,
  onListChange: PropTypes.func.isRequired,
  onCreate: PropTypes.func,
};

export default GuestActions;
