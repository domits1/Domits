import React, { useState, useEffect, useRef } from "react";
import { FiEdit2, FiTrash2, FiChevronDown } from "react-icons/fi";
import "../../guestdashboard/styles/GuestActions.scss";
import { getAccessToken } from "../utils/authUtils";

const GuestActions = ({ selectedList, onListChange }) => {
  const [lists, setLists] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createPopupOpen, setCreatePopupOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  const wrapperRef = useRef(null);

  // Fetch all user wishlists
  useEffect(() => {
    const fetchLists = async () => {
      const token = getAccessToken();
      if (!token) return;

      try {
        const res = await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
          headers: {
            Authorization: token,
            "Content-Type": "application/json",
          },
        });

        const data = await res.json();
        const wishlists = data?.wishlists || {};
        const structured = Object.entries(wishlists).map(([name, items]) => ({
          id: name,
          name,
          count: items.length,
        }));

        setLists(structured);

        //Make sure the selected list exists, otherwise fallback
        if (!structured.find((l) => l.name === selectedList)) {
          onListChange("My next trip");
        }
      } catch (err) {
        console.error("❌ Error loading wishlists:", err.message);
      }
    };

    fetchLists();
  }, []);

  //Create new list
  const handleCreate = async () => {
    const token = getAccessToken();
    if (!token || !newListName.trim()) return;

    try {
      await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
        method: "PUT",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wishlistName: newListName }),
      });

      const newList = { id: newListName, name: newListName, count: 0 };
      setLists([...lists, newList]);
      onListChange(newListName);
      setNewListName("");
      setCreatePopupOpen(false);
    } catch (err) {
      console.error("❌ Error creating wishlist:", err.message);
    }
  };

  // Rename list
  const handleRename = async (oldName, newName) => {
    const token = getAccessToken();
    if (!token || !newName.trim()) return;

    try {
      await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
        method: "PATCH",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ oldName, newName }),
      });

      const updated = lists.map((list) =>
        list.name === oldName ? { ...list, name: newName, id: newName } : list
      );
      setLists(updated);
      if (selectedList === oldName) onListChange(newName);
      setEditingId(null);
    } catch (err) {
      console.error("❌ Error renaming wishlist:", err.message);
    }
  };

  // Delete list
  const handleDelete = async (name) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      await fetch("https://i8t5rc1e7b.execute-api.eu-north-1.amazonaws.com/dev/Wishlist", {
        method: "DELETE",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ wishlistName: name }),
      });

      const remaining = lists.filter((list) => list.name !== name);
      setLists(remaining);
      if (selectedList === name) onListChange("My next trip");
    } catch (err) {
      console.error("❌ Error deleting wishlist:", err.message);
    }
  };

  // Close dropdown or popup if you click outside
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

      {/*  Select list  */}
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
                      value={list.name}
                      onChange={(e) => handleRename(list.name, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span
                        onClick={() => {
                          onListChange(list.name);
                          setDropdownOpen(false);
                        }}
                      >
                        {list.name}
                      </span>
                      <span className="badge">{list.count}</span>
                      <button onClick={() => setEditingId(list.id)}>
                        <FiEdit2 />
                      </button>
                      <button onClick={() => handleDelete(list.name)}>
                        <FiTrash2 />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button className="actionBtn" onClick={() => alert("Link shared!")}>
        Share the list
      </button>

      <button className="actionBtn" onClick={() => setCreatePopupOpen(!createPopupOpen)}>
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
