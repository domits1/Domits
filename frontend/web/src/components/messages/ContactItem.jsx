import useUpdateContactRequest from '../../features/hostdashboard/hostmessages/hooks/useUpdateContactRequest';
import fallbackProfileImage from './domits-logo.jpg';


const ContactItem = ({ contact, isPending, setContacts, selected, userId, dashboardType }) => {
    const isGuest = dashboardType === 'guest';
    const { updateContactRequest } = useUpdateContactRequest(setContacts);
    const accoImage = contact.accoImage;
    const bookingStatus = contact.bookingStatus;
    const profileSrc = contact.profileImage || fallbackProfileImage;

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
                <img src={profileSrc} alt="Profile" className="contact-item-profile-image" />
            </div>

            <div className="contact-item-text-container">
                <p className="contact-item-full-name">{contact.givenName}</p>

                {!isPending && (
                    <div className="contact-item-message-info">
                        {bookingStatus && (
                            <span className={`booking-status ${bookingStatus.toLowerCase()}`}>
                                {bookingStatus === "Accepted" && "✓ Reservation approved"}
                                {bookingStatus === "Pending" && "⏳ Inquiry sent"}
                                {bookingStatus === "Failed" && "✗ Reservation unsuccessful"}
                            </span>
                        )}
                        <div className="latest-message-preview">
                            <span className="message-text">
                                {contact.latestMessage?.text
                                    ? (contact.latestMessage.text.length > 50
                                        ? `${contact.latestMessage.text.substring(0, 50)}...`
                                        : contact.latestMessage.text)
                                    : contact.latestMessage?.fileUrls?.length === 1
                                        ? "📷 Image"
                                        : contact.latestMessage?.fileUrls?.length > 1
                                            ? `📷 ${contact.latestMessage.fileUrls.length} Images`
                                            : "💬 Start conversation"}
                            </span>
                            {contact.latestMessage?.createdAt && (
                                <span className="message-time">
                                    {new Date(contact.latestMessage.createdAt).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                        {contact.unreadCount > 0 && (
                            <span className="unread-badge">{contact.unreadCount}</span>
                        )}
                    </div>
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
