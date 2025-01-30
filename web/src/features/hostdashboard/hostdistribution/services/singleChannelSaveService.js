export const handelSingleChannelSave = async (
    channelId,
    setChannelData,
    setTempListedAccommodations,
    setActiveThreeDotsDropdown
) => {
    const channel = channelData.find(channel => channel.id.S === channelId);

    if (!channel) {
        console.error(`Channel with ID ${channelId} not found`);
        return;
    }

    const accommodationsToSync = tempListedAccommodations[channelId] || [];

    if (accommodationsToSync.length === 0) {
        try {
            const response = await fetch('https://9uv5o7aiz6.execute-api.eu-north-1.amazonaws.com/dev/Host-ChannelManagement-Production-Update-Channel', {
                method: 'PUT',
                body: JSON.stringify({
                    id: channelId,
                    APIKey: channel.APIKey.S,
                    ChannelName: channel.ChannelName.S,
                    ListedAccommodations: channel.ListedAccommodations || { L: [] },
                    Status: channel.Status.BOOL,
                    UserId: channel.UserId.S
                }),
                headers: {
                    'Content-type': 'application/json; charset=UTF-8'
                }
            });

            const result = await response.json();

            if (result.statusCode === 200) {
                alert('Channel synced successfully!');
            } else {
                alert('Failed to sync the channel');
            }
        } catch (error) {
            console.error('Error syncing the channel without changes:', error);
        }

        setActiveThreeDotsDropdown(null);
        return;
    }

    const currentListedAccommodations = channel.ListedAccommodations?.L || [];
    const updatedListedAccommodations = [
        ...currentListedAccommodations,
        ...accommodationsToSync.map(acc => ({
            M: {
                AccommodationId: { S: acc.AccommodationId.S },
                Title: { S: acc.Title.S },
                GuestAmount: { N: acc.GuestAmount.N },
                Rent: { S: acc.Rent.S },
                Availability: { S: acc.Availability.S }
            }
        }))
    ];

    try {
        const response = await fetch('https://9ejo73yw68.execute-api.eu-north-1.amazonaws.com/default/EditSingleChannel', {
            method: 'PUT',
            body: JSON.stringify({
                id: channelId,
                APIKey: channel.APIKey.S,
                ChannelName: channel.ChannelName.S,
                ListedAccommodations: { L: updatedListedAccommodations },
                Status: channel.Status.BOOL,
                UserId: channel.UserId.S
            }),
            headers: {
                'Content-type': 'application/json; charset=UTF-8'
            }
        });

        const result = await response.json();

        if (result.statusCode === 200) {
            alert('Accommodations synced successfully!');

            // Clear the temporary accommodations after syncing
            setTempListedAccommodations(prevState => {
                const newState = { ...prevState };
                delete newState[channelId];
                return newState;
            });

            // Update channel data
            setChannelData(prevState => {
                const updatedChannels = [...prevState];
                const channelIndex = updatedChannels.findIndex(ch => ch.id.S === channelId);
                if (channelIndex !== -1) {
                    updatedChannels[channelIndex].ListedAccommodations.L = updatedListedAccommodations;
                }
                return updatedChannels;
            });

            setActiveThreeDotsDropdown(null);
        } else {
            alert('Failed to sync accommodations');
        }
    } catch (error) {
        console.error('Error syncing accommodations:', error);
    }
};
