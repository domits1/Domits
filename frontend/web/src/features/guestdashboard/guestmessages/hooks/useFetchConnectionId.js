import { useState, useEffect } from "react";

const useFetchConnectionId = (userId) => {
    const [connectionId, setConnectionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userId) return;

        const fetchConnectionId = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await fetch("https://zdbf732tke.execute-api.eu-north-1.amazonaws.com/General-Messaging-Production-Read-ConnectionId", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ userId })
                });

                
                const data = await response.json();

                if (!data.connectionId) {
                    console.warn("User is offline.");
                    setConnectionId(null);
                    return;
                }

                setConnectionId(data.connectionId);
            } catch (err) {
                if (err.message.includes("404")) {
                    console.warn("User is offline, no connection ID found.");
                } else {
                    console.error("Failed to fetch connection ID:", err);
                }
                setConnectionId(null);
                setError("Failed to fetch connection ID");
            } finally {
                setLoading(false);
            }
        };

        fetchConnectionId();
    }, [userId]);

    return { connectionId, loading, error };
};

export default useFetchConnectionId;
