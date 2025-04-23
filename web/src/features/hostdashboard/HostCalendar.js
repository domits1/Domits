import React, { useEffect, useState } from "react";
import Pages from "./Pages";
import "./HostHomepage.css";
import { Auth } from "aws-amplify";
import spinner from "../../images/spinnner.gif";
import CalendarComponent from "./CalendarComponent";
import styles from "./HostDashboard.module.css";
import calenderStyles from "./HostCalendar.module.css";
import { generateUUID } from "../../utils/generateUUID.js";
import { formatDate, uploadICalToS3 } from "../../utils/iCalFormatHost";
import { getAccessToken } from "../../services/getAccessToken.js";

function HostCalendar() {
  const [accommodations, setAccommodations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);

  const handleSelectAccommodation = (event) => {
    const accommodationId = event.target.value;
    const accommodation = accommodations.find(
      (accommodation) => accommodation.ID === accommodationId
    );
    setSelectedAccommodation(accommodation);
  };

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

  const updateDates = (dateRanges) => {};

  useEffect(() => {
    const fetchAccommodations = async () => {
      setIsLoading(true);
      if (!userId) {
        console.log("No user id");
        return;
      } else {
        try {
          const response = await fetch(
            `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property`,
            {
              method: "GET",
              headers: {
                "Content-type": "application/json; charset=UTF-8",
                "Authorization": getAccessToken()
              },
            }
          );
          if (!response.ok) {
            throw new Error("Failed to fetch");
          }
          const data = await response.json();
          console.log(data);

          setAccommodations(data);
        } catch (error) {
          console.error("Unexpected error:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (userId) {
      fetchAccommodations().catch(console.error);
    }
  }, [userId]);

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("The URL has been copied to your clipboard: " + text);
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
      });
  };

  const handleICal = async (e) => {
    e.preventDefault();

    let uid;
    let dtStamp;
    let dtStart;
    let dtEnd;
    let accommodationId;
    let street;
    let city;
    let country;
    let harbour;
    let location;
    let status;
    let summary;
    let ownerId;

    let params;

    let listOfAccommodations = [];

    for (let i = 0; i < accommodations.length; i++) {
      for (let j = 0; j < accommodations[i].DateRanges.length; j++) {
        uid = generateUUID();
        dtStamp = formatDate(new Date());
        dtStart = formatDate(
          new Date(accommodations[i].DateRanges[j].startDate)
        );
        dtEnd = formatDate(new Date(accommodations[i].DateRanges[j].endDate));
        accommodationId = accommodations[i].ID;
        street = accommodations[i].Street || "";
        harbour = accommodations[i].Harbour || "";
        city = accommodations[i].City;
        country = accommodations[i].Country;
        if (accommodations[i].AccommodationType === "Boat") {
          location = harbour + ", " + city + ", " + country;
        } else {
          location = street + ", " + city + ", " + country;
        }
        if (accommodations[i].Drafted === true) {
          status = "Unavailable";
        } else if (accommodations[i].Drafted === false) {
          status = "Available";
        }
        summary = accommodations[i].Title + " - " + status;
        ownerId = accommodations[i].OwnerId;

        params = {
          UID: uid,
          Dtstamp: dtStamp,
          Dtstart: dtStart,
          Dtend: dtEnd,
          Summary: summary,
          Location: location,
          AccommodationId: accommodationId,
          OwnerId: ownerId,
        };
        listOfAccommodations.push(params);
      }
    }

    try {
      const uploadURL = await uploadICalToS3(listOfAccommodations, userId);
      if (uploadURL) {
        copyToClipboard(uploadURL);
      } else {
        console.error("Failed to POST iCal data");
      }
    } catch (error) {
      console.error("Failed to POST iCal data:", error);
    }
  };

  return (
    <div className="page-body">
      <h2>Calendar</h2>
      <div className={styles.dashboardHost}>
        <Pages />
        {isLoading ? (
          <div className="loading-spinner-calender">
            <img src={spinner} />
          </div>
        ) : accommodations.length < 1 ? (
          <p>No accommodations found...</p>
        ) : (
          <div className={calenderStyles.contentContainerCalendar}>
            <div className={calenderStyles.calendarHeader}>
              <button
                className={calenderStyles.exportICal}
                onClick={handleICal}
              >
                Export to calender
              </button>
            </div>
            <div className={calenderStyles.calendarDropdown}>
              <div>
                <select
                  className={calenderStyles.locationBox}
                  onChange={handleSelectAccommodation}
                >
                  <option value="" className={calenderStyles.selectOption}>
                    Select your Accommodation
                  </option>
                  {accommodations.map((accommodation) => (
                    <option key={accommodation.property.id} value={accommodation.property.id}>
                      {accommodation.property.title}
                    </option>
                  ))}
                </select>
              </div>
              {selectedAccommodation !== null &&
              selectedAccommodation !== undefined ? (
                <div>
                  <p>
                    Booking availability for
                    {" " + selectedAccommodation.Title}
                  </p>
                  <div className={calenderStyles.locationBox}>
                    <CalendarComponent
                      passedProp={selectedAccommodation}
                      isNew={false}
                      updateDates={updateDates}
                      componentView={true}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.alertMessage}>
                  Please select your Accommodation first
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HostCalendar;
