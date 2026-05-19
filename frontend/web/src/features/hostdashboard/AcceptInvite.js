import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useUser } from "../auth/UserContext";
import { acceptTeamInvite } from "./services/teamService";

const AcceptInvite = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const { user, isLoading } = useUser();
    const [status, setStatus] = useState("idle");

    useEffect(() => {
        if (isLoading || !user || !token || status !== "idle") return;
        setStatus("loading");
        acceptTeamInvite(token)
            .then(() => setStatus("success"))
            .catch(() => setStatus("error"));
    }, [isLoading, user, token, status]);

    if (!token) {
        return (
            <div className="accept-invite-page">
                <div className="accept-invite-card">
                    <h2>Invalid invitation link</h2>
                    <p>This link is missing a token. Make sure you copied the full link from your email.</p>
                    <Link to="/" className="accept-invite-btn">Go to homepage</Link>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="accept-invite-page">
                <div className="accept-invite-card">
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        const encodedRedirect = encodeURIComponent(`/team/accept?token=${token}`);
        return (
            <div className="accept-invite-page">
                <div className="accept-invite-card">
                    <h2>You have been invited to a team on Domits</h2>
                    <p>Log in or create an account to accept this invitation.</p>
                    <Link to={`/login?redirect=${encodedRedirect}`} className="accept-invite-btn">
                        Log in to accept
                    </Link>
                    <Link to={`/register?redirect=${encodedRedirect}`} className="accept-invite-btn accept-invite-btn--secondary">
                        Create account
                    </Link>
                </div>
            </div>
        );
    }

    if (status === "loading") {
        return (
            <div className="accept-invite-page">
                <div className="accept-invite-card">
                    <p>Accepting invitation...</p>
                </div>
            </div>
        );
    }

    if (status === "success") {
        return (
            <div className="accept-invite-page">
                <div className="accept-invite-card">
                    <h2>Invitation accepted</h2>
                    <p>You now have access to the host dashboard. Log out and back in to activate your new role.</p>
                    <Link to="/hostdashboard" className="accept-invite-btn">Go to host dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="accept-invite-page">
            <div className="accept-invite-card">
                <h2>Something went wrong</h2>
                <p>This invitation may have already been used or is no longer valid.</p>
                <Link to="/" className="accept-invite-btn">Go to homepage</Link>
            </div>
        </div>
    );
};

export default AcceptInvite;
