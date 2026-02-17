import { useState, useEffect, useContext, useMemo } from "react";
import { WebSocketContext } from "../../features/hostdashboard/hostmessages/context/webSocketContext";
import useFetchContacts from "../../features/hostdashboard/hostmessages/hooks/useFetchContacts";
import ContactItem from "./ContactItem";
import "../../features/hostdashboard/hostmessages/styles/sass/contactlist/hostContactList.scss";
import { FaCog, FaBars, FaPlus } from "react-icons/fa";
import AutomatedSettings from "./AutomatedSettings";

const resolvePartnerId = (contact, selfUserId) => {
  if (!contact) return null;

  const candidates = [
    contact.recipientId,
    contact.userId,
    contact.guestId,
    contact.guestID,
    contact.hostId,
    contact.hostID,
    contact.contactId,
    contact.contactID,
  ].filter(Boolean);

  const picked = candidates.find((id) => id && id !== selfUserId);
  return picked || candidates[0] || null;
};

const ContactList = ({
  userId,
  onContactClick,
  onCloseChat,
  message,
  dashboardType,
  isChatOpen = false,
  activeContactId = null,
}) => {
  const { contacts, pendingContacts, loading, setContacts } = useFetchContacts(userId, dashboardType);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [displayType, setDisplayType] = useState("contacts");
  const socket = useContext(WebSocketContext);
  const wsMessages = socket?.messages || [];
  const isHost = dashboardType === "host";
  const [automatedSettings, setAutomatedSettings] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortAlphabetically, setSortAlphabetically] = useState(false);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, contactId: null });

  useEffect(() => {
    setSelectedContactId(activeContactId || null);
  }, [activeContactId]);

  useEffect(() => {
    const handleClickAway = () => setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    window.addEventListener("click", handleClickAway);
    return () => window.removeEventListener("click", handleClickAway);
  }, []);

  const labels = {
    contacts: "Contacts",
    pending: "Sent requests",
    noContacts: "No contacts found.",
    noPending: "No requests sent.",
  };

  const handleCreateTestContact = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const overlay = document.createElement("div");
    overlay.className = "add-contact-overlay";

    const modal = document.createElement("div");
    modal.className = "add-contact-modal";

    modal.innerHTML = `
            <h3>Add contact</h3>
            <div class="form-group">
                <label>Name</label>
                <input id="new-contact-name" type="text" placeholder="Contact name" />
            </div>
            <div class="form-group">
                <label>Profile image (PNG/JPG)</label>
                <div class="file-input-wrapper">
                    <input id="new-contact-file" type="file" accept="image/png, image/jpeg" />
                </div>
            </div>
            <div class="actions">
                <button id="cancel-add-contact" class="cancel-btn">Cancel</button>
                <button id="save-add-contact" class="save-btn">Add</button>
            </div>
        `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const removeModal = () => {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
    };

    overlay.addEventListener("click", (e2) => {
      if (e2.target === overlay) {
        removeModal();
      }
    });

    const handleEscape = (e2) => {
      if (e2.key === "Escape") {
        removeModal();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);

    const cancelBtn = modal.querySelector("#cancel-add-contact");
    const saveBtn = modal.querySelector("#save-add-contact");
    const nameInput = modal.querySelector("#new-contact-name");

    cancelBtn.onclick = () => {
      removeModal();
      document.removeEventListener("keydown", handleEscape);
    };

    saveBtn.onclick = async () => {
      const fileInput = modal.querySelector("#new-contact-file");
      const name = (nameInput.value || "").trim();

      if (!name) {
        alert("Please enter a name");
        nameInput.focus();
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "Adding...";

      let profileImageUrl = null;
      const file = fileInput.files && fileInput.files[0];
      if (file) {
        try {
          profileImageUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } catch (error) {
          console.error("Error reading file:", error);
          alert("Error reading image file");
          saveBtn.disabled = false;
          saveBtn.textContent = "Add";
          return;
        }
      }

      const id = `test-${Date.now()}`;
      const newContact = {
        userId: id,
        recipientId: id,
        givenName: name,
        profileImage: profileImageUrl,
        latestMessage: {
          text: "Hello from test contact",
          createdAt: new Date().toISOString(),
        },
      };

      setContacts((prev) => [newContact, ...prev]);
      removeModal();
      document.removeEventListener("keydown", handleEscape);
    };

    setTimeout(() => nameInput.focus(), 100);
  };

  const visibleListRaw = displayType === "contacts" ? contacts : pendingContacts;

  const contactList = useMemo(() => {
    let list = Array.isArray(visibleListRaw) ? [...visibleListRaw] : [];

    if (searchTerm) {
      list = list.filter((contact) => (contact.givenName || "").toLowerCase().includes(searchTerm));
    }

    if (sortAlphabetically) {
      list.sort((a, b) => (a.givenName || "").localeCompare(b.givenName || ""));
    } else {
      list.sort((a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0));
    }

    return list;
  }, [visibleListRaw, searchTerm, sortAlphabetically]);

  const noContactsMessage = displayType === "contacts" ? labels.noContacts : labels.noPending;

  const handleClick = (contact, threadId = null) => {
    const partnerId = resolvePartnerId(contact, userId);
    if (!partnerId) return;

    setSelectedContactId(partnerId);
    onContactClick?.(partnerId, contact?.givenName, contact?.profileImage, threadId);
  };

  const handleContextMenu = (event, contact) => {
    if (displayType === "pendingContacts") return;
    event.preventDefault();

    const partnerId = resolvePartnerId(contact, userId);
    if (!partnerId) return;

    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      contactId: partnerId,
    });
  };

  const handleCloseSelectedChat = () => {
    if (contextMenu.contactId) {
      onCloseChat?.(contextMenu.contactId);
    }
    setContextMenu({ visible: false, x: 0, y: 0, contactId: null });
  };

  useEffect(() => {
    if (!wsMessages?.length) return;

    setContacts((prevContacts) => {
      const updatedContacts = Array.isArray(prevContacts) ? [...prevContacts] : [];

      wsMessages.forEach((msg) => {
        const partnerId = msg?.userId === userId ? msg?.recipientId : msg?.userId;
        if (!partnerId) return;

        const idx = updatedContacts.findIndex((c) => resolvePartnerId(c, userId) === partnerId);
        if (idx === -1) return;

        let displayText = msg.text;
        if (msg.fileUrls && msg.fileUrls.length > 0) displayText = "attachment sent";

        updatedContacts[idx] = {
          ...updatedContacts[idx],
          latestMessage: {
            ...msg,
            text: displayText,
          },
        };
      });

      updatedContacts.sort(
        (a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0)
      );

      return updatedContacts;
    });
  }, [wsMessages, setContacts, userId]);

  useEffect(() => {
    if (!message) return;

    setContacts((prevContacts) => {
      const updatedContacts = Array.isArray(prevContacts) ? [...prevContacts] : [];

      const partnerId = message?.userId === userId ? message?.recipientId : message?.userId;
      if (!partnerId) return updatedContacts;

      const index = updatedContacts.findIndex((c) => resolvePartnerId(c, userId) === partnerId);
      if (index !== -1) {
        let displayText = message.text;
        if (message.fileUrls && message.fileUrls.length > 0) displayText = "attachment sent";

        updatedContacts[index] = {
          ...updatedContacts[index],
          latestMessage: {
            text: displayText,
            createdAt: message.createdAt,
            fileUrls: message.fileUrls,
            userId: message.userId,
            recipientId: message.recipientId,
          },
        };
      }

      updatedContacts.sort(
        (a, b) => new Date(b.latestMessage?.createdAt || 0) - new Date(a.latestMessage?.createdAt || 0)
      );

      return updatedContacts;
    });
  }, [message, setContacts, userId]);

  return (
    <div className={`${dashboardType}-contact-list-modal`}>
      <h3>Message dashboard</h3>

      <div style={{ marginTop: "-0.25rem" }}>
        <input
          type="text"
          placeholder="Search contacts"
          className={`contact-search-input contact-search-under-title ${isChatOpen ? "chat-open" : ""}`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value.toLowerCase())}
          style={{
            width: isChatOpen ? "80%" : "100%",
            maxWidth: isChatOpen ? "80%" : "100%",
            borderRadius: "20px",
            padding: "12px 16px",
            border: "1px solid #ddd",
            backgroundColor: "#fff",
            fontSize: "14px",
            outline: "none",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            transition: "all 0.2s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#0D9813";
            e.target.style.boxShadow = "0 4px 8px rgba(13, 152, 19, 0.2)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#ddd";
            e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
          }}
        />
      </div>

      <div className={`contact-list-toggle`}>
        <select value={displayType} onChange={(e) => setDisplayType(e.target.value)} className="contact-dropdown">
          <option value="contacts">{labels.contacts}</option>
          <option value="pendingContacts">{labels.pending}</option>
        </select>

        <div className="contact-list-side-buttons">
          <FaBars className={`contact-list-side-button`} onClick={() => setSortAlphabetically((prev) => !prev)} />
          {isHost && <FaCog className={`contact-list-side-button`} onClick={() => setAutomatedSettings(true)} />}
          <button className={`contact-list-side-button`} onClick={handleCreateTestContact} title="Create test contact">
            <FaPlus />
          </button>
        </div>

        {automatedSettings && <AutomatedSettings setAutomatedSettings={setAutomatedSettings} hostId={userId} />}
      </div>

      <ul className={`contact-list-list`}>
        {loading ? (
          <p className={`contact-list-loading-text`}>Loading contacts...</p>
        ) : contactList.length === 0 ? (
          <p className={`contact-list-empty-text`}>{noContactsMessage}</p>
        ) : (
          contactList.map((contact, i) => {
            const partnerId = resolvePartnerId(contact, userId) || `${contact?.userId || "u"}-${i}`;

            return (
              <li
                key={partnerId}
                className={`contact-list-list-item ${displayType === "pendingContacts" ? "disabled" : ""}`}
                onClick={() => displayType !== "pendingContacts" && handleClick(contact, contact.threadId)}
                onContextMenu={(event) => handleContextMenu(event, contact)}
              >
                <ContactItem
                  contact={contact}
                  isPending={displayType === "pendingContacts"}
                  setContacts={setContacts}
                  userId={userId}
                  selected={selectedContactId === partnerId}
                  dashboardType={dashboardType}
                />
              </li>
            );
          })
        )}
      </ul>

      {contextMenu.visible && (
        <div className="contact-context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} role="menu">
          <button type="button" onClick={handleCloseSelectedChat}>
            Close chat
          </button>
        </div>
      )}
    </div>
  );
};

export default ContactList;
