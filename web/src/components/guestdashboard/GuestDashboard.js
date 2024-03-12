import React, { useEffect } from "react";
import accommodationImg from "../../images/accommodationtestpic1.png";
import editIcon from "../../images/icons/edit-05.png";
import { useNavigate } from 'react-router-dom';
import { API, graphqlOperation } from "aws-amplify";
import Pages from "./Pages.js";

const listAccommodationsQuery = `
query ListAccommodations {
  listAccommodations {
    items {
      id
      accommodation
      description
      createdAt
      updatedAt
    }
    nextToken
  }
}
`;

const fetchAccommodations = async () => {
    try {
        const response = await API.graphql(graphqlOperation(listAccommodationsQuery));
        console.log("Accommodations:", response.data.listAccommodations.items);
    } catch (error) {
        console.error("Error listing accommodations:", error);
    }
};

const GuestDashboard = () => {
    useEffect(() => {
        fetchAccommodations();
    }, []);
    const navigate = useNavigate();

    return (
        <div className="guestdashboard">
            <div className="dashboard">
                <Pages />
                <div className="content">
                    <div className="leftContent">
                        <div className="bookingBox">
                            <h3>Current Booking</h3>
                            <p>Tropical 12 person villa with pool</p>
                            <img src={accommodationImg} alt="Booking" />
                            <p>Host: John Doe</p>
                        </div>
                        <div className="messageBox">
                            <h3>Messages (9+)</h3>
                            <p>Go to message centre</p>
                            <button>Go</button>
                        </div>
                    </div>
                    <div className="personalInfoContent">
                        <h3>Personal Information</h3>
                        <div className="infoBox"><img src={editIcon} alt="Email Icon" /><span>Email:</span> Lotte_summer@gmail.com</div>
                        <div className="infoBox"><img src={editIcon} alt="Name Icon" /><span>Name:</span> Lotte Summer</div>
                        <div className="infoBox"><img src={editIcon} alt="Address Icon" /><span>Address:</span> Kinderhuissingel 6K, Haarlem</div>
                        <div className="infoBox"><img src={editIcon} alt="Phone Icon" /><span>Phone:</span> +31 6 09877890</div>
                        <div className="infoBox"><img src={editIcon} alt="Family Icon" /><span>Family:</span> 2 adults - 2 kids</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default GuestDashboard;
