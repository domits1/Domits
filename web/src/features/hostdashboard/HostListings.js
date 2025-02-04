import React, { useEffect, useState } from "react";
import Pages from "./Pages";
import styles from './HostDashboard.module.css';
import add from "../../images/icons/host-add.png";
import {useLocation, useNavigate} from 'react-router-dom';
import { Auth } from "aws-amplify";
import spinner from "../../images/spinnner.gif";
import PageSwitcher from "../../utils/PageSwitcher";

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
                const response = await fetch(`https://0yxfn7yjhh.execute-api.eu-north-1.amazonaws.com/default/General-Payments-Production-Read-CheckIfStripeExists`, {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    },
                    body: JSON.stringify({ sub: hostID }),
                });
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
        fetchAccommodations();
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
                const response = await fetch('https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/FetchAccommodation', {
                    method: 'POST',
                    body: JSON.stringify({ OwnerId: userId }),
                    headers: {'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch');
                }
                const data = await response.json();
                if (data.body && typeof data.body === 'string') {
                    const accommodationsArray = JSON.parse(data.body);
                    if (Array.isArray(accommodationsArray)) {
                        setAccommodations(accommodationsArray);
                    } else {
                        console.error("Parsed data is not an array:", accommodationsArray);
                        setAccommodations([]);
                    }
                }
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
                navigate(`/enlist?ID=${accoId}`)
            }
        }
    }

    const {
        liveEligibility,
        liveEligibilityError,
        liveEligibilityLoading,
        fetchVerificationStatus
      } = useSetLiveEligibility({userId});

      useEffect(() => {
        fetchVerificationStatus();
      }, [userId]);

    const asyncChangeAccommodationStatus = async (id, drafted) => {
        let status = drafted ? 'Draft' : 'Live';
        if (status === "Live"){
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
                    }
                  })
                return;
              }
        }
        if(confirm(`Do you wish to set this accommodation as ${status}?`) === true) {
            const options = {
                ID: id,
                Status: drafted
            };

            try {
                const response = await fetch('https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/ChangeAccommodationStatues', {
                    method: 'PUT',
                    body: JSON.stringify(options),
                    headers: {'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    alert("Something went wrong, please try again later...")
                    throw new Error('Failed to fetch');
                }
                await fetchAccommodations();
            } catch (error) {
                console.error("Unexpected error:", error);
            } finally {
                alert("Update successful")
            }
        }
    }
    const asyncDeleteAccommodation = async (accommodation) => {
        if(confirm("Are you sure you want to remove this item from your listing?") === true) {
            let accId = accommodation.ID;
            let accImages = accommodation.Images;

            const options = {
                id: accId,
                images: accImages
            };
            setIsLoading(true);
            try {
                const response = await fetch('https://hfsqawwfu0.execute-api.eu-north-1.amazonaws.com/default/DeleteAccommodation', {
                    method: 'DELETE',
                    body: JSON.stringify(options),
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8',
                    }
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                setAccommodations(prevAccommodations => prevAccommodations.filter(item => item.ID !== accId));
                alert('This item has been successfully removed from your listing!');
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        }
    }


    return (
        <div className="page-body">
            <h2>Listings</h2>
            <div className={styles.dashboardHost}>
                <Pages />
                <div className={styles.hostListingContainer}>
                    {isLoading ? (
                        <div>
                            <img src={spinner}/>
                        </div>
                    ) : (
                        <div className={styles.listingBody}>
                            <div className={styles.buttonBox}>
                                <button className={styles.greenBtn} onClick={() => navigate("/enlist")}>Add new
                                    accommodation
                                </button>
                                <button className={styles.greenBtn} onClick={fetchAccommodations}>Refresh</button>
                            </div>
                            <section className={styles.listingsDisplay}>
                                <p className={styles.header}>Current listings</p>
                                {accommodations.length > 0 ? (
                                    <PageSwitcher
                                        accommodations={accommodations.filter(acco => acco.Drafted === false)}
                                        amount={3}
                                        bankDetailsProvided={bankDetailsProvided}
                                        onEdit={asyncEditAccommodation}
                                        onDelete={asyncDeleteAccommodation}
                                        onUpdate={asyncChangeAccommodationStatus}
                                    />
                                ) : (
                                    <div>
                                        <p>It appears that you have not listed any accommodations yet...</p>
                                    </div>
                                )}
                            </section>
                            <section className={styles.listingsDisplay}>
                                <p className={styles.header}>Drafted listings</p>
                                {isLoading ? (
                                    <div className={styles.loadingContainer}>
                                        <img className={styles.spinner} src={spinner}/>
                                    </div>
                                ) : accommodations.length > 0 ? (
                                    <PageSwitcher accommodations={accommodations.filter(acco => acco.Drafted === true)}
                                                  amount={3}
                                                  bankDetailsProvided={bankDetailsProvided}
                                                  onEdit={asyncEditAccommodation}
                                                  onDelete={asyncDeleteAccommodation}
                                                  onUpdate={asyncChangeAccommodationStatus}/>
                                ) : (
                                    <div>
                                        <p>It appears that you have not drafted any accommodations yet...</p>
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
