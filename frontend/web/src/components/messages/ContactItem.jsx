import useUpdateContactRequest from '../../features/hostdashboard/hostmessages/hooks/useUpdateContactRequest';
import profileImage from './domits-logo.jpg';


const ContactItem = ({ contact, isPending, setContacts, selected, userId, dashboardType }) => {
    const isGuest = dashboardType === 'guest';
    const { updateContactRequest } = useUpdateContactRequest(setContacts);
    const accoImage = contact.accoImage;
    const bookingStatus = contact.bookingStatus;

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
        <div className={`contact-item-content ${selected ? 'selected' : ''} ${!accoImage ? 'no-accommodation-image' : ''}`}>
            <div className="contact-item-image-container">
                {accoImage && (
                    <img src={accoImage} alt="Accommodation" className="contact-item-accommodation-image" />
                )}
                <img src={contact.profileImage || profileImage} alt="Profile" className="contact-item-profile-image" />
            </div>

            <div className="contact-item-text-container">
                <p className="contact-item-full-name">{contact.givenName}</p>

                {!isPending && (
                    <p className="contact-item-subtitle">
                        {bookingStatus === "Accepted" && <p id='status'>Reservation approved</p>}
                        {bookingStatus === "Pending" && <p id='status'>Inquiry sent</p>}
                        {bookingStatus === "Failed" && <p id='status'>Reservation unsuccessful</p>}
                        {contact.latestMessage?.text
                            ? contact.latestMessage.text
                            : "No message history yet"}
                    </p>
                )}

                {isPending && setContacts && (
                    <div className="contact-item-buttons-container">
                        <button onClick={handleAccept} className="accept-button">Accept</button>
                        <button onClick={handleReject} className="reject-button">Deny</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactItem;
