import React, { useState, useEffect, useRef } from "react";
import { FiEdit2, FiTrash2, FiChevronDown } from "react-icons/fi";
import "../../guestdashboard/styles/GuestActions.scss";

const GuestActions = () => {
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState("My Next Trip");
  const [editingId, setEditingId] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createPopupOpen, setCreatePopupOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  const wrapperRef = useRef(null);

  // Create a new wishlist
  const handleCreate = () => {
    if (newListName.trim()) {
      const newList = { id: Date.now(), name: newListName, count: 0 };
      setLists([...lists, newList]);
      setSelectedList(newList.name);
      setNewListName("");
      setCreatePopupOpen(false);
    }
  };

  // Rename a wishlist by ID
  const handleRename = (id, name) => {
    setLists(lists.map((list) => (list.id === id ? { ...list, name } : list)));
    if (selectedList === lists.find((list) => list.id === id)?.name) {
      setSelectedList(name);
    }
    setEditingId(null);
  };

  // Delete a wishlist by ID
  const handleDelete = (id) => {
    const listToDelete = lists.find((list) => list.id === id);
    setLists(lists.filter((list) => list.id !== id));
    if (selectedList === listToDelete?.name) {
      setSelectedList("My Next Trip");
    }
  };

  // Close dropdown or popup if you click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setDropdownOpen(false);
        setCreatePopupOpen(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="guestActions" ref={wrapperRef}>
      <label className="label">Select list:</label>

      {/* Select list button */}
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
                      onChange={(e) => handleRename(list.id, e.target.value)}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span
                        onClick={() => {
                          setSelectedList(list.name);
                          setDropdownOpen(false);
                        }}>
                        {list.name}
                      </span>
                      <span className="badge">{list.count}</span>
                      <button onClick={() => setEditingId(list.id)}>
                        <FiEdit2 />
                      </button>
                      <button onClick={() => handleDelete(list.id)}>
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
