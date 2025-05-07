import React, { useState } from 'react';
import profileImage from '../domits-logo.jpg';
import useUpdateContactRequest from "../hooks/useUpdateContactRequest";
import useFetchBookingDetails from '../hooks/useFetchBookingDetails';
import ContactItem from '../../../../components/messages/ContactItem';


const HostContactItem = ({ contact, isPending, setContacts, selected }) => {
    const [error, setError] = useState(null);
    const { updateContactRequest } = useUpdateContactRequest(setContacts);
    const { bookingDetails, accommodation } = useFetchBookingDetails(contact.hostId, contact.recipientId);
    const accoImage = accommodation?.Images?.image1;
    

    const handleAccept = async () => {
        try {
            await updateContactRequest(contact.ID, 'accepted');
        } catch (err) {
            setError('Error accepting the contact request.');
        }
    };

    const handleReject = async () => {
        try {
            await updateContactRequest(contact.ID, 'rejected');
        } catch (err) {
            setError('Error rejecting the contact request.');
        }
    };

    return (
        <ContactItem
            contact={contact}
            isPending={isPending}
            setContacts={setContacts}
            selected={selected}
            handleAccept={handleAccept}
            handleReject={handleReject}
            accoImage={accoImage}
            profileImage={profileImage}
            bookingDetails={bookingDetails}
            
            
        />
    );
};

export default HostContactItem;
