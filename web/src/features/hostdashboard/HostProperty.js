import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Pages from "./Pages.js";
import styles from "./HostProperty.module.css";
import Back from "@mui/icons-material/KeyboardBackspace";

const HostProperty = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [accommodations, setAccommodations] = useState([]);
  const [activeTab, setActiveTab] = useState("Details");
  const [activeButton, setActiveButton] = useState(null);
  const [userId, setUserId] = useState("USER_ID_HERE"); // Replace with actual user logic
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const accommodationID = params.get("ID");

  useEffect(() => {
    if (!userId) return;

    const fetchAccommodations = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ OwnerId: userId }),
          }
        );

        if (!response.ok) throw new Error("Failed to fetch accommodations");

        const data = await response.json();
        const parsedData = JSON.parse(data.body);
        setAccommodations(Array.isArray(parsedData) ? parsedData : []);
      } catch (error) {
        console.error("Error fetching accommodations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccommodations();
  }, [userId]);

  useEffect(() => {
    if (!accommodationID) return;

    const fetchAccommodationByID = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ID: accommodationID }),
          }
        );

        if (!response.ok) throw new Error("Failed to fetch accommodation by ID");

        const responseData = await response.json();
        const data = JSON.parse(responseData.body);

        setSelectedAccommodation(data);
      } catch (error) {
        console.error("Error fetching accommodation by ID:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccommodationByID();
  }, [accommodationID]);

  const handleFeatureClick = (index, feature) => {
    setActiveButton(index);
    setSelectedFeature(feature);
    setSelectedAccommodation(null); // Hide accommodation panel
  };

  const handleAccommodationClick = (index, acco) => {
    setActiveButton(index);
    setSelectedAccommodation(acco);
    setSelectedFeature(null); // Hide feature panel
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <Pages />
      </div>

      <main className={styles.content}>
        <div className={styles.propertyHeader}>
          <Back />
          <h1>Property Editor</h1>
        </div>

        <div className={styles.mainSection}>
          <div className={styles.left}>
            <div className={styles.switch}>
              <button
                className={`${styles.switchButton} ${activeTab === "Details" ? styles.active : ""}`}
                onClick={() => setActiveTab("Details")}
              >
                Details
              </button>
              <button
                className={`${styles.switchButton} ${activeTab === "Rules" ? styles.active : ""}`}
                onClick={() => setActiveTab("Rules")}
              >
                Rules
              </button>
            </div>

            {activeTab === "Details" ? (
              <>
                <button className={activeButton === 1 ? styles.activeButton : ""} onClick={() => handleFeatureClick(1, "Complete required steps")}>
                  <h4>🔴 Complete required steps</h4>
                  <p>Complete these final tasks to publish your listing and start getting bookings.</p>
                </button>
                <button className={activeButton === 2 ? styles.activeButton : ""} onClick={() => handleFeatureClick(2, "Fotos")}>
                  <h4>Fotos</h4>
                  <p>Add extra photos to show people more of your accommodation.</p>
                </button>
                <button className={activeButton === 3 ? styles.activeButton : ""} onClick={() => handleFeatureClick(3, "Add a new room or space")}>
                  <h4>Add a new room or space</h4>
                  <p>2 bedrooms - 2 beds - 1 bathroom</p>
                </button>
                <button className={activeButton === 2 ? styles.activeButton : ""} onClick={() => handleFeatureClick(2, "Add extra photos to show people more of your accommodation.")}>
                  <h4>Title</h4>
                  <p>Add extra photos to show people more of your accommodation.</p>
                </button>
                <button className={activeButton === 2 ? styles.activeButton : ""} onClick={() => handleFeatureClick(2, "Vila")}>
                  <h4>Accommodation type</h4>
                  <p>Vila</p>
                </button>

                {accommodations.length > 0 &&
                  accommodations.map((acco, index) => (
                    <button
                      key={acco.ID || index}
                      className={activeButton === index ? styles.activeButton : ""}
                      onClick={() => handleAccommodationClick(index, acco)}
                    >
                      <h4>{acco.Title || "Untitled Property"}</h4>
                      <p>
                        {acco.Address
                          ? `${acco.Address}, ${acco.City}, ${acco.Country}`
                          : "No Address Available"}
                      </p>
                    </button>
                  ))}
              </>
            ) : (
              <>
                <button className={activeButton === 6 ? styles.activeButton : ""} onClick={() => handleFeatureClick(6, "Smoking Allowed")}>
                  <h4>Smoking</h4>
                  <p>Enable or disable smoking in the property.</p>
                </button>
                <button className={activeButton === 7 ? styles.activeButton : ""} onClick={() => handleFeatureClick(7, "Parties Allowed")}>
                  <h4>Parties/events</h4>
                  <p>Enable or disable parties/events in the property.</p>
                </button>
                <button className={activeButton === 7 ? styles.activeButton : ""} onClick={() => handleFeatureClick(7, "Parties Allowed")}>
                  <h4>Pets</h4>
                  <p>Enable or disable Pets in the property.</p>
                </button>
              </>
            )}
          </div>

          {/* ✅ Right Panel: Shows only ONE section at a time */}
          <div className={styles.right}>
            {selectedFeature && (
              <div className={styles.editBox}>
                <h2>Edit Information</h2>
                <label>Selected Feature:</label>
                <p>{selectedFeature}</p>
                <input
                  type="text"
                  value={selectedFeature}
                  onChange={(e) => setSelectedFeature(e.target.value)}
                  className={styles.inputField}
                />
              </div>
            )}
            {selectedAccommodation && (
              <div className={styles.editBox}>
                <h2>Edit Accommodation</h2>
                <label>Title:</label>
                <input
                  type="text"
                  value={selectedAccommodation.Title || "No Title"}
                  onChange={(e) =>
                    setSelectedAccommodation({ ...selectedAccommodation, Title: e.target.value })
                  }
                  className={styles.inputField}
                />
                <label>Address:</label>
                <p>{selectedAccommodation.Address || "No Address"}</p>

                <label>Bedrooms:</label>
                <p>{selectedAccommodation.Bedrooms || "N/A"}</p>

                <label>Bathrooms:</label>
                <p>{selectedAccommodation.Bathrooms || "N/A"}</p>

                <label>Rent:</label>
                <p>${selectedAccommodation.Rent || "Not Specified"}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HostProperty;
