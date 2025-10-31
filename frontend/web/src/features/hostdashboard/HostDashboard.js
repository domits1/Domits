import React, { useState, useEffect } from "react";
import "./HostHomepage.scss"; // blijft hetzelfde
import styles from "./HostDashboard.module.scss";
import StripeModal from "./StripeModal.js";
import { Auth } from "aws-amplify";
import { useNavigate } from "react-router-dom";
import spinner from "../../images/spinnner.gif";
import info from "../../images/icons/info.png";
import editIcon from "../../images/icons/edit-05.png";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";
import { getAccessToken } from "../../services/getAccessToken.js";
import { toast } from "react-toastify";

function HostDashboard() {
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState({ email: "", name: "", address: "", phone: "", family: "" });
  const navigate = useNavigate();

  useEffect(() => {
    const checkStripeAccount = async () => {
      try {
        const userInfo = await Auth.currentAuthenticatedUser();
        const cognitoUserId = userInfo.attributes.sub;

        const response = await fetch(
          `https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists`,
          {
            method: "POST",
            headers: { "Content-type": "application/json; charset=UTF-8" },
            body: JSON.stringify({ sub: cognitoUserId }),
          }
        );
        const { hasStripeAccount } = await response.json();
        const parsedBody = JSON.parse(hasStripeAccount.body);
        setIsStripeModalOpen(!parsedBody);
      } catch (error) {
        console.error("Error fetching user's Stripe account status:", error);
      }
    };
    checkStripeAccount();
  }, []);

  useEffect(() => {
    const asyncConfigureUser = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        setUserId(userInfo.attributes.sub);
        setUser({
          email: userInfo.attributes.email,
          name: userInfo.attributes["given_name"],
          address: userInfo.attributes.address,
          phone: userInfo.attributes.phone_number,
          family: "2 adults - 2 kids",
        });
      } catch (error) {
        console.error("Error setting user id:", error);
      }
    };
    asyncConfigureUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchRecentAccommodations().catch(console.error);
    }
  }, [userId]);

  const fetchRecentAccommodations = async () => {
    setIsLoading(true);
    if (!userId) return;
    try {
      const response = await fetch(
        "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
        {
          method: "GET",
          headers: { Authorization: getAccessToken() },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setAccommodations(data);
    } catch (error) {
      console.error("Unexpected error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page-Host">
      <p className="page-Host-title">Dashboard</p>

      <div className="page-Host-content">
        <section className="host-pc-dashboard">
          <StripeModal isOpen={isStripeModalOpen} onClose={() => setIsStripeModalOpen(false)} />

          <div className={styles.dashboardContainer}>
            <div className={styles.dashboardLeft}>
              <div className={styles.topRow}>
                <div className={styles.leftHeader}>
                  <h3 className={styles.welcomeMsg}>Welcome {user.name}</h3>

                  <div className={styles.buttonBox}>
                    <button className={styles.greenBtn} onClick={fetchRecentAccommodations}>
                      Refresh
                    </button>
                    <button className={styles.greenBtn} onClick={() => navigate("/hostdashboard/listings")}>
                      Go to listing
                    </button>
                    <button className={styles.greenBtn} onClick={() => navigate("/hostonboarding")}>
                      Add accommodation
                    </button>
                  </div>
                </div>

                <div className={styles.personalInfoContent}>
                  <h3>Personal Information</h3>
                  <div className={styles.personalInfoBox}>
                    <img src={editIcon} alt="Email Icon" />
                    <span>Email:</span> {user.email}
                  </div>
                  <div className={styles.personalInfoBox}>
                    <img src={editIcon} alt="Name Icon" />
                    <span>Name:</span> {user.name}
                  </div>
                </div>
              </div>

              <h3>My recent listings:</h3>

              <div className={styles.infoBox}>
                <img className={styles.infoIcon} src={info} alt="Info" />
                <p>Click on your listed accommodations to see their listing details</p>
              </div>

              {isLoading ? (
                <div className={styles.loader}>
                  <img src={spinner} alt="Loading..." />
                </div>
              ) : accommodations.length > 0 ? (
                <div className={styles.cardsGrid}>
                  {accommodations.map((accommodation, index) => (
                    <div
                      key={accommodation?.property?.id || index}
                      className={styles.dashboardCard}
                      onClick={() =>
                        accommodation?.property?.status === "INACTIVE"
                          ? toast.warning("This listing is still in draft mode. Please publish it to make it live.")
                          : navigate(`/listingdetails?ID=${accommodation.property.id}`)
                      }>
                      {accommodation?.images?.length > 0 ? (
                        <img
                          src={`https://accommodation.s3.eu-north-1.amazonaws.com/${accommodation.images[0].key}`}
                          alt="Listing image"
                          className={styles.imgListedDashboard}
                        />
                      ) : (
                        <img src={placeholderImage} alt="No image available" className={styles.imgListedDashboard} />
                      )}

                      <div className={styles.accommodationText}>
                        <p className={styles.accommodationTitle}>{accommodation?.property?.title}</p>
                        <p className={styles.accommodationLocation}>{accommodation?.location?.city}</p>
                      </div>

                      <div className={styles.accommodationDetails}>
                        <span className={accommodation?.property?.status ? styles.status : styles.isLive}>
                          {accommodation?.property?.status === "INACTIVE" ? "Drafted" : "Live"}
                        </span>
                        <span>Listed on: {DateFormatterDD_MM_YYYY(accommodation?.property?.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <p>It looks like you do not have a property.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default HostDashboard;
