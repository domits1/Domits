import React, { useState } from "react";
import { Storage } from "aws-amplify";

const S3_BUCKET_NAME = 'cognitodata';

const UserProfile = () => {
    const [profilePicture, setProfilePicture] = useState(null);
    
    return (
        <h1>Hello World</h1>
    )
}

export default UserProfile;