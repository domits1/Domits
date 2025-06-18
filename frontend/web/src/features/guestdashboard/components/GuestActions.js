import React, { useState, useEffect, useRef } from "react";
import { FiEdit2, FiTrash2, FiChevronDown } from "react-icons/fi";
import "../../guestdashboard/styles/GuestActions.scss";
import { getAccessToken } from "../utils/authUtils";
import {
  fetchWishlists,
  fetchWishlistItemCount,
  createWishlist,
  renameWishlist,
  deleteWishlist,
} from "../services/wishlistService";

const GuestActions = ({ selectedList, onListChange, onShare, onCreate }) => {
  const [lists, setLists] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createPopupOpen, setCreatePopupOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  const wrapperRef = useRef(null);

  //  Fetch all wishlists and their real item counts (excluding placeholders)
  useEffect(() => {
    const fetchLists = async () => {
      const token = getAccessToken();
      if (!token) return;

      try {
        const data = await fetchWishlists();
        const wishlists = data?.wishlists || {};

        // Fetch the count of real items for each wishlist
        const structured = await Promise.all(
          Object.keys(wishlists).map(async (name) => {
            try {
              const countData = await fetchWishlistItemCount(name);
              const realItems = (countData.items || []).filter((item) => item.propertyId);
              return { id: name, name, count: realItems.length };
            } catch (err) {
              console.error(`Error fetching count for '${name}':`, err);
              return { id: name, name, count: 0 };
            }
          })
        );

        setLists(structured);

        // Make sure the selected list exists otherwise fallback to default
        if (!structured.find((l) => l.name === selectedList)) {
          onListChange("My next trip");
        }
      } catch (err) {
        console.error("Error loading wishlists:", err.message);
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
      setLists([...lists, newList]);
      onListChange(newListName);
      if (onCreate) onCreate(newListName);
      setNewListName("");
      setCreatePopupOpen(false);
    } catch (err) {
      console.error("Error creating wishlist:", err.message);
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

      const updated = lists.map((list) => (list.name === oldName ? { ...list, name: newName, id: newName } : list));
      setLists(updated);
      if (selectedList === oldName) onListChange(newName);
      setEditingId(null);
    } catch (err) {
      console.error("Error renaming wishlist:", err.message);
    }
  };

  const handleDelete = async (name) => {
    const token = getAccessToken();
    if (!token) return;
    if (!window.confirm(`Delete wishlist "${name}"?`)) return;

    try {
      await deleteWishlist(name);

      const remaining = lists.filter((list) => list.name !== name);
      setLists(remaining);
      if (selectedList === name) onListChange("My next trip");
    } catch (err) {
      console.error("Error deleting wishlist:", err.message);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
        setCreatePopupOpen(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="guestActions" ref={wrapperRef}>
      <label className="label">Select list:</label>

      <div className="dropdownWrapper">
        <button className="dropdownToggle" onClick={() => setDropdownOpen(!dropdownOpen)}>
          {selectedList} <FiChevronDown />
        </button>

        {dropdownOpen && (
          <div className="dropdownMenu">
            <ul>
              {lists.map((list) => (
                <li key={list.id}>
                  {editingId === list.id ? (
                    <input
                      type="text"
                      defaultValue={list.name}
                      autoFocus
                      onBlur={(e) => handleRename(list.name, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRename(list.name, e.target.value);
                        }
                      }}
                    />
                  ) : (
                    <>
                      <span
                        onClick={() => {
                          onListChange(list.name);
                          setDropdownOpen(false);
                        }}>
                        {list.name}
                      </span>
                      <span className="badge">{list.count}</span>
                      {list.name !== "My next trip" && (
                        <>
                          <button onClick={() => setEditingId(list.id)}>
                            <FiEdit2 />
                          </button>
                          <button onClick={() => handleDelete(list.name)}>
                            <FiTrash2 />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button className="actionBtn" onClick={onShare}>
        Share the list
      </button>
      <button className="actionBtn" onClick={() => setCreatePopupOpen(true)}>
        Make a list
      </button>

      {createPopupOpen && (
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
    </div>
  );
};

export default GuestActions;
