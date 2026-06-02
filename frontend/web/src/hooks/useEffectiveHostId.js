import { useState, useEffect } from "react";
import { Auth } from "aws-amplify";
import { useUser } from "../features/auth/UserContext";
import { ROLES } from "../features/auth/roles";

export default function useEffectiveHostId() {
    const { role, isPOM, memberships, isLoading: userLoading } = useUser();
    const [ownId, setOwnId] = useState(null);
    const [idLoading, setIdLoading] = useState(true);

    useEffect(() => {
        Auth.currentAuthenticatedUser({ bypassCache: false })
            .then((user) => setOwnId(user?.attributes?.sub || null))
            .catch(() => setOwnId(null))
            .finally(() => setIdLoading(false));
    }, []);

    const isPurelyPOM = isPOM && role === ROLES.PROPERTY_OPERATIONS_MANAGER;

    const managedHostId =
        isPOM && Array.isArray(memberships) && memberships.length > 0
            ? memberships[0].host_id
            : null;

    const effectiveHostId = isPurelyPOM ? (managedHostId ?? ownId) : ownId;

    return { effectiveHostId, ownId, managedHostId, isPurelyPOM, loading: idLoading || userLoading };
}
