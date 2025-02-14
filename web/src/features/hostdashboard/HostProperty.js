import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Pages from "./Pages.js";
import styles from "./HostProperty.module.css";
import Back from "@mui/icons-material/KeyboardBackspace";

const HostProperty = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [accommodationData, setAccommodationData] = useState(null);
  const [activeTab, setActiveTab] = useState("Details");
  const [selectedSection, setSelectedSection] = useState(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const accommodationID = params.get("ID");

  console.log("🔎 Extracted Accommodation ID from URL:", accommodationID);

  useEffect(() => {
    if (!accommodationID) return;

    const fetchAccommodationByID = async () => {
      setIsLoading(true);
      try {
        console.log("🔄 Fetching accommodation by ID:", accommodationID);
        const response = await fetch(
          "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ID: accommodationID }),
          }
        );

        if (!response.ok) throw new Error("❌ Failed to fetch accommodation by ID");

        const responseData = await response.json();
        const data = JSON.parse(responseData.body);

        console.log("✅ Accommodation data fetched:", data);
        setAccommodationData(data);
      } catch (error) {
        console.error("❌ Error fetching accommodation by ID:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccommodationByID();
  }, [accommodationID]);

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
                <button onClick={() => setSelectedSection("Photos")}>
                  <h4>Photos</h4>
                  <p>Add extra photos to show people more of your accommodation.</p>
                </button>
                <button onClick={() => setSelectedSection("Add a new room or space")}>
              <h4>Add a new room or space</h4>
              <p style={{ display: "inline", marginRight: "8px" }}>
                {accommodationData?.GuestAmount} guest -
              </p>
              <p style={{ display: "inline", marginRight: "8px" }}>
                {accommodationData?.Bedrooms} bedrooms -
              </p>
              <p style={{ display: "inline" }}>
                {accommodationData?.Beds} beds
              </p>
            </button>
                <button onClick={() => setSelectedSection("Title")}>
                  <h4>Title</h4>
                  <p>{accommodationData ? accommodationData.Title : "No title available"}</p>
                </button>
                <button onClick={() => setSelectedSection("AccommodationType")}>
                  <h4>Accommodation Type</h4>
                  <p>{accommodationData ? accommodationData.AccommodationType : "No type available"}</p>
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setSelectedSection("Smoking")}>
                  <h4>Smoking</h4>
                  <p>{accommodationData?.AllowSmoking ? "Allowed" : "Not Allowed"}</p>
                </button>
                <button onClick={() => setSelectedSection("Parties")}>
                  <h4>Parties</h4>
                  <p>{accommodationData?.AllowParties ? "Allowed" : "Not Allowed"}</p>
                </button>
                <button onClick={() => setSelectedSection("Pets")}>
                  <h4>Pets</h4>
                  <p>{accommodationData?.AllowPets ? "Allowed" : "Not Allowed"}</p>
                </button>
                <button onClick={() => setSelectedSection("CheckInOut")}>
                  <h4>Check-in/out</h4>
                  <p>Check-in: {accommodationData?.CheckIn ? `${accommodationData.CheckIn.From} - ${accommodationData.CheckIn.Til}` : "N/A"}</p>
                  <p>Check-out: {accommodationData?.CheckOut ? `${accommodationData.CheckOut.From} - ${accommodationData.CheckOut.Til}` : "N/A"}</p>
                </button>
              </>
            )}
          </div>

          <div className={styles.right}>
            {selectedSection && (
              <div className={styles.editBox}>
                <h2>Edit Information</h2>
                <p>{selectedSection}</p>

                {/* Display Information Based on the Selected Section */}
                {selectedSection === "Photos" && (
                  <div>
                    {accommodationData?.Images && Object.values(accommodationData.Images).map((img, index) => (
                      <img key={index} src={img} alt={`Image-${index}`} style={{ width: "100px", margin: "5px" }} />
                    ))}
                  </div>
                )}

                {selectedSection === "Title" && (
                  <div>
                    <label>Title:</label>
                    <p>{accommodationData?.Title || "No title available"}</p>
                  </div>
                )}

                {selectedSection === "AccommodationType" && (
                  <div>
                    <label>Accommodation Type:</label>
                    <p>{accommodationData?.AccommodationType || "No type available"}</p>
                  </div>
                )}

                {selectedSection === "Smoking" && (
                  <div>
                    <label>Smoking Policy:</label>
                    <p>{accommodationData?.AllowSmoking ? "Allowed" : "Not Allowed"}</p>
                  </div>
                )}

                {selectedSection === "Parties" && (
                  <div>
                    <label>Parties Policy:</label>
                    <p>{accommodationData?.AllowParties ? "Allowed" : "Not Allowed"}</p>
                  </div>
                )}

                {selectedSection === "Pets" && (
                  <div>
                    <label>Pets Policy:</label>
                    <p>{accommodationData?.AllowPets ? "Allowed" : "Not Allowed"}</p>
                  </div>
                )}

                {selectedSection === "CheckInOut" && (
                  <div>
                    <label>Check-in:</label>
                    <p>
                      {accommodationData?.CheckIn
                        ? `${accommodationData.CheckIn.From} - ${accommodationData.CheckIn.Til}`
                        : "N/A"}
                    </p>
                    <label>Check-out:</label>
                    <p>
                      {accommodationData?.CheckOut
                        ? `${accommodationData.CheckOut.From} - ${accommodationData.CheckOut.Til}`
                        : "N/A"}
                    </p>
                  </div>
                )}

                {selectedSection === "Add a new room or space" && (
                  <div>
                    <label>Guest Capacity:</label>
                    <p>{accommodationData?.GuestAmount} guests</p>
                    <label>Bedrooms:</label>
                    <p>{accommodationData?.Bedrooms} bedrooms</p>
                    <label>Beds:</label>
                    <p>{accommodationData?.Beds} beds</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default HostProperty;
