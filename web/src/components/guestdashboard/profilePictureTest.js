import React, { useState } from "react";
import { Storage } from "aws-amplify";

const S3_BUCKET_NAME = 'cognitodata';

const UserProfile = () => {
    const [profilePicture, setProfilePicture] = useState(null);

    const handleProfilePictureUpload = async (event) => {
        const file = event.target.files[0];
        const filename = `${Date.now()}-${file.name}`;

        try {
            const result = await Storage.put(filename, file, {
                bucket: S3_BUCKET_NAME,
                contentType: file.type
            });
            const imageUrls = await Storage.get(result.key, { bucket: S3_BUCKET_NAME })

            setProfilePicture(imageUrls);
        } catch (error) {
            console.error('Error uploading profile picture:', error)
        }
    };

    return (
        <div>
            <h1>User profile pictures</h1>
            {profilePicture &&
                <img
                    src={profilePicture}
                    alt="Profile Picture"
                    style={{ width: '200px', height: '200px', borderRadius: '50%' }}
                />}
            <input
                type="file"
                accept="image/*"
                onChange={handleProfilePictureUpload}
            />
        </div>
    );
};

export default UserProfile;