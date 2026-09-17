import React from "react";
import { Link } from "react-router-dom";

function GuestBanner() {
    return (
        <div className="guest-banner">
            <span className="guest-banner-text">
                ⚠️ You are using <strong>Guest Mode</strong>. Your notes are saved locally (Trash kept for 7 days). 
                <Link to="/register" className="banner-link">Sign Up</Link> or <Link to="/login" className="banner-link">Log In</Link> to sync them to the cloud.
            </span>
        </div>
    );
}

export default React.memo(GuestBanner);
