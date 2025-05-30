export const getChannelLogo = (channelName) => {
    const logos = {
        'Airbnb': '/images/icon-airbnb.png',
        'Booking.com': '/images/icon-booking.png',
        'Expedia': '/images/icon-expedia.png',
        'HomeAway': '/images/icon-homeaway.png',
        'TripAdvisor': '/images/icon-tripadvisor.png',
        'Vrbo': '/images/icon-vrbo.png'
    };
    return logos[channelName] || '';
};
