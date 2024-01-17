import React, { useState } from 'react';
import { API, graphqlOperation } from 'aws-amplify'; // Import specific modules

import { createAccommodation } from '../graphql/mutations';

const Booking = () => {
    const [accommodationData, setAccommodationData] = useState(/* initial data */);

    const createAccommodationEntry = async () => {
        try {
            // Use the GraphQL API to create an entry
            const response = await API.graphql(
                graphqlOperation(createAccommodation, { input: accommodationData })
            );

            // Handle the response as needed
            console.log('Accommodation created:', response);
        } catch (error) {
            console.error('Error creating accommodation:', error);
        }
    };

    return (
        <div>
            <button onClick={createAccommodationEntry}>Create Accommodation</button>
        </div>
    );
};

export default Booking;
