import React, { useState, useEffect } from "react";
import "./release-Updates.css";
import { TwitterTweetEmbed } from 'react-twitter-embed';
import axios from "axios";

function ReleaseUpdates() {
  const [embedError, setEmbedError] = useState(false);
  const [tweets, setTweets] = useState([]);
  const [error, setError] = useState(false);
 
  const fetchTweets = async () => {
    try {
      const response = await axios.get("https://3s9jeu0laf.execute-api.eu-north-1.amazonaws.com/default/FetchTweetsinDB");

      // Log the response object to see its structure
      console.log("Full response object:", response);

      if (response.data && response.data.tweetIds) {
        setTweets(response.data.tweetIds); // Set the data only if it's valid
        console.log("✅ Fetched tweets:", response.data.tweetIds);
      } else {
        console.log("❌ No tweetIds found in the response.");
        setError(true); // Mark error if data is missing
      }
    } catch (error) {
      console.error("❌ Error fetching tweets:", error);
      setError(true);
    }
  };

  useEffect(() => {
    fetchTweets(); // Call function when component mounts
  }, []);

  useEffect(() => {
    console.log("📦 Tweets updated:", tweets);
  }, [tweets]);

  return (
    <div className="updates-container"> 
      <h1>Product Updates</h1>
      <p>{embedError && "An error occurred while loading the tweet."}</p>
      <div className="embed-container">
        {tweets.map((tweetId, index) => (
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
