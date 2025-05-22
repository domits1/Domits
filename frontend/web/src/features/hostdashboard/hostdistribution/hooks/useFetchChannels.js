import { useEffect, useState } from "react";
import { fetchChannels } from "../services/fetchChannelsService.js";

const useFetchChannels = (userId) => {
    const [channelData, setChannelData] = useState([]);

    useEffect(() => {
        if (!userId) return;
        const loadChannels = async () => {
            const channels = await fetchChannels(userId);
            setChannelData(channels);
        };
        loadChannels();
    }, [userId]);

    return channelData;
};

export default useFetchChannels;
