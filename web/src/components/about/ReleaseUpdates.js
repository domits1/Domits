import React, { useState } from "react";
import "./release-Updates.css";
import { TwitterTweetEmbed } from 'react-twitter-embed';

function ReleaseUpdates() {
  const [embedError, setEmbedError] = useState(false);

  // Array of Twitter URLs
  const twitterUrls = [
    "1848735303080497277",
    "1836033944933863521",
    "1798979282028712125",
    "1796461135090315768",
    "1795443789844136263",
    "1793952270226264519",
    "1793187248512331973",
    "1786342625571643755",
    "1785634255713804567",
    "1785315941720408469",
    // Add more Tweet IDs here
  ];

  return (
    <div className="updates-container"> 
      <h1>Product Updates</h1>
      <p>{embedError && "An error occurred while loading the tweet."}</p>
      <div className="embed-container">
        {twitterUrls.map((tweetId, index) => (
          <TwitterTweetEmbed
            key={index}
            tweetId={tweetId}
            options={{ width: "325" }}
            onError={() => setEmbedError(true)}
          />
        ))}
      </div>
    </div>
  );
}

export default ReleaseUpdates;