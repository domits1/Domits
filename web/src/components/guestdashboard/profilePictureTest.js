import React, { useState, useEffect } from 'react';
import { Storage, Auth } from 'aws-amplify';

const S3_BUCKET_NAME = 'cognitodata';
const region = 'eu-north-1';

const UserProfile = () => {
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setUserId(user.attributes.sub);
        console.log(user.attributes.sub);
      } catch (error) {
        console.error('Error fetching user ID:', error);
      }
    };
    
    fetchUserId();
  }, []);

  const handleFileSelect = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const uploadFileToS3 = async () => {
    if (!selectedFile) {
      alert('Please select a file first.');
      return;
    }

    const filename = `${userId}/${Date.now()}-${selectedFile.name}`;

    try {
      await Storage.put(filename, selectedFile, {
        bucket: S3_BUCKET_NAME,
        region: region,
        contentType: selectedFile.type
      });

      const imageUrl = await Storage.get(filename, { bucket: S3_BUCKET_NAME });

      setProfilePicture(imageUrl);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    }
  };

  return (
    <div>
      <h1>User Profile</h1>
      {profilePicture && <img src={profilePicture} alt="Profile" style={{ width: '200px', height: '200px', borderRadius: '50%' }} />}
      <input type="file" accept="image/*" onChange={handleFileSelect} />
      <button onClick={uploadFileToS3}>Upload Profile Picture</button>
    </div>
  );
};

export default UserProfile;
