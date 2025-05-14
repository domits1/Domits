import React, { useEffect, useState } from "react";
import Pages from "./Pages";
import styles from "./HostDashboard.module.scss";
import add from "../../images/icons/host-add.png";
import { useLocation, useNavigate } from "react-router-dom";
import { Auth } from "aws-amplify";
import spinner from "../../images/spinnner.gif";
import { useSetLiveEligibility } from "./hooks/useSetLiveEligibility";
import { getAccessToken } from "../../services/getAccessToken.js";
import { toast } from "react-toastify";
import DateFormatterDD_MM_YYYY from "../../utils/DateFormatterDD_MM_YYYY";

function HostListings() {
  const [accommodations, setAccommodations] = useState([]);
  const [bankDetailsProvided, setBankDetailsProvided] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    const setUserIdAsync = async () => {
      try {
        const userInfo = await Auth.currentUserInfo();
        await setUserId(userInfo.attributes.sub);
      } catch (error) {
        console.error("Error setting user id:", error);
      }
    };

    setUserIdAsync();
  }, []);
  useEffect(() => {
    const checkHostStripeAcc = async (hostID) => {
      try {
        const response = await fetch(
          `https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists`,
          {
            method: "POST",
            headers: {
              "Content-type": "application/json; charset=UTF-8",
            },
            body: JSON.stringify({ sub: hostID }),
          }
        );
        const data = await response.json();
        const parsedBody = JSON.parse(data.body);

        if (parsedBody.hasStripeAccount) {
          setBankDetailsProvided(parsedBody.bankDetailsProvided);
        }
      } catch (error) {
        console.error("Error fetching user data or Stripe status:", error);
      }
    };
    checkHostStripeAcc(userId);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchAccommodations().catch(console.error);
    }
  }, [userId]);
  const fetchAccommodations = async () => {
    setIsLoading(true);
    if (!userId) {
      return;
    } else {
      try {
        const response = await fetch(
          "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/hostDashboard/all",
          {
            method: "GET",
            headers: {
              Authorization: getAccessToken(),
            },
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch");
        }
        const data = await response.json();
        setAccommodations(data);
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const asyncEditAccommodation = async (accoId, accoTitle) => {
    if (confirm(`Do you wish to edit ${accoTitle}?`)) {
      if (accoId) {
        navigate(`/hostdashboard/property?ID=${accoId}`);
      }
    }
  };

  const { liveEligibility, liveEligibilityError, liveEligibilityLoading, fetchVerificationStatus } =
    useSetLiveEligibility({ userId });

  useEffect(() => {
    fetchVerificationStatus();
  }, [userId]);

  const asyncChangeAccommodationStatus = async (id, drafted) => {
    let status = drafted ? "Draft" : "Live";
    if (status === "Live") {
      if (liveEligibilityLoading) {
        alert("Checking your verification status, please wait...");
        return;
      }

      if (liveEligibilityError) {
        alert(liveEligibilityError);
        return;
      }

      if (!liveEligibility) {
        navigate("/verify", {
          state: {
            userId: userId,
            accommodationId: id,
          },
        });
        return;
      }
    }
    if (confirm(`Do you wish to set this accommodation as ${status}?`) === true) {
      const options = {
        ID: id,
        Status: drafted,
      };

      try {
        const response = await fetch("https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property", {
          method: "PATCH",
          body: JSON.stringify({ property: id }),
          headers: {
            Authorization: getAccessToken(),
          },
        });
        if (!response.ok) {
          alert("Something went wrong, please try again later...");
          throw new Error("Failed to fetch");
        }
        await fetchAccommodations();
        toast.success("Update successful");
      } catch (error) {
        toast.error("Unexpected error:", error);
      }
    }
  };
  const asyncDeleteAccommodation = async (accommodation) => {
    if (confirm("Are you sure you want to remove this item from your listing?") === true) {
      let accId = accommodation.ID;
      let accImages = accommodation.Images;

      const options = {
        id: accId,
        images: accImages,
      };
      setIsLoading(true);
      try {
        const response = await fetch(
          "https://hfsqawwfu0.execute-api.eu-north-1.amazonaws.com/default/DeleteAccommodation",
          {
            method: "DELETE",
            body: JSON.stringify(options),
            headers: {
              "Content-type": "application/json; charset=UTF-8",
            },
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        setAccommodations((prevAccommodations) => prevAccommodations.filter((item) => item.ID !== accId));
        toast.warning("This item has been successfully removed from your listing!");
      } catch (error) {
        toast.error(error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="page-body">
      <h2>Listings</h2>
      <div className={styles.dashboardHost}>
        <Pages />
        <div className={styles.hostListingContainer}>
          {isLoading ? (
            <div>
              <img src={spinner} />
            </div>
          ) : (
            <div className={styles.listingBody}>
              <div className={styles.buttonBox}>
                <button className={styles.greenBtn} onClick={() => navigate("/hostonboarding")}>
                  Add new accommodation
                </button>
                <button className={styles.greenBtn} onClick={fetchAccommodations}>
                  Refresh
                </button>
              </div>
              <section className={styles.listingsDisplay}>
                <p className={styles.header}>Listed listings</p>

                {isLoading ? (
                  <div className={styles.loader}>
                    <img src={spinner} alt="Loading…" />
                  </div>
                ) : accommodations.length > 0 ? (
                  accommodations
                    .filter((accommodation) => accommodation.property.status === "ACTIVE")
                    .map((accommodation, index) => (
                      <div
                        key={accommodation.property.id || index}
                        className={styles.dashboardCard}
                        onClick={() => {
                          if (accommodation.property.status !== "ACTIVE") {
                            toast.warning("This listing is still in draft mode. Please publish it to make it live.");
                          } else {
                            navigate(`/listingdetails?ID=${accommodation.property.id}`);
                          }
                        }}>
                        {accommodation.images?.length > 0 ? (
                          <img
                            src={`https://accommodation.s3.eu-north-1.amazonaws.com/${accommodation.images[0].key}`}
                            alt="No image available"
                            className="img-listed-dashboard"
                          />
                        ) : (
                          <img src={placeholderImage} alt="No image available" />
                        )}

                        <div className={styles.accommodationText}>
                          <p className={styles.accommodationTitle}>{accommodation.property.title}</p>
                          <p className={styles.accommodationLocation}>{accommodation.location.city}</p>
                        </div>

                        <div className={styles.accommodationDetails}>
                          <span className={accommodation.property.status ? styles.status : styles.isLive}>
                            {accommodation.property.status === "ACTIVE" ? "Live" : "Drafted"}
                          </span>
                          <span> on: {DateFormatterDD_MM_YYYY(accommodation.property.createdAt)}</span>
                        </div>
                                                <div className={styles.buttonBox}>
                          <button
                            className={styles.greenBtn}>
                            Details
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className={styles.emptyState}>
                    <p>You havent placed any accommodation yet.</p>
                  </div>
                )}
              </section>
              <section className={styles.listingsDisplay}>
                <p className={styles.header}>Drafted listings</p>
                {isLoading ? (
                  <div className={styles.loader}>
                    <img src={spinner} alt="Loading…" />
                  </div>
                ) : accommodations.length > 0 ? (
                  accommodations
                    .filter((accommodation) => accommodation.property.status === "INACTIVE")
                    .map((accommodation, index) => (
                      <div
                        key={accommodation.property.id || index}
                        className={styles.dashboardCard}
                        onClick={() => {
                          if (accommodation.property.status !== "ACTIVE") {
                            toast.warning("This listing is still in draft mode. Please publish it to make it live.");
                          } else {
                            navigate(`/listingdetails?ID=${accommodation.property.id}`);
                          }
                        }}>
                        {accommodation.images?.length > 0 ? (
                          <img
                            src={`https://accommodation.s3.eu-north-1.amazonaws.com/${accommodation.images[0].key}`}
                            alt="No image available"
                            className="img-listed-dashboard"
                          />
                        ) : (
                          <img src={placeholderImage} alt="No image available" />
                        )}

                        <div className={styles.accommodationText}>
                          <p className={styles.accommodationTitle}>{accommodation.property.title}</p>
                          <p className={styles.accommodationLocation}>{accommodation.location.city}</p>
                        </div>

                        <div className={styles.accommodationDetails}>
                          <span className={accommodation.property.status ? styles.status : styles.isLive}>
                            {accommodation.property.status ? "Drafted" : "Live"}
                          </span>
                          <span> on: {DateFormatterDD_MM_YYYY(accommodation.property.createdAt)}</span>
                        </div>
                        <div className={styles.buttonBox}>
                          <button
                            className={styles.greenBtn}
                            onClick={() =>
                              asyncChangeAccommodationStatus(accommodation.property.id, accommodation.property.status)
                            }>
                            Set as live
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className={styles.emptyState}>
                    <p>You havent placed any accommodation yet.</p>
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HostListings;
