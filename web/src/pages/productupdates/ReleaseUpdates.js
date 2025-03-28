import React, { useState, useEffect } from "react";
import "./release-Updates.css";
import { TwitterTweetEmbed } from 'react-twitter-embed';
import axios from "axios";

function ReleaseUpdates() {
  const [embedError, setEmbedError] = useState(false);
  const [tweets, setTweets] = useState([]);
  const [error, setError] = useState(false);
  const BEARER_TOKEN = "AAAAAAAAAAAAAAAAAAAAAASN0AEAAAAAMHlN%2F8Mcv%2F8xYFyqeP3jQ4lWxkc%3DfKDS4Bacc1V8Zs152hl2JSqLjCQvhrNQYHaDT4ov9Dm83feVhY";

  // Array of Twitter URLs
  const twitterUrls = [
    // Add more Tweet IDs here
    // "1897981256601645559",
    // "1879062001433112582",
    // "1871785101635592671",
    // "1862071434496950433",
    // "1848735303080497277",
    // "1836033944933863521",
    // "1805597517528068345",
    // "1798979282028712125",  
    "1796461135090315768",
    "1795443789844136263",

    "1793952270226264519",
    "1793187248512331973",
    "1786342625571643755",
    "1785634255713804567",
    "1785315941720408469",
  ];

  // useEffect(() => {
  //   axios.get("https://api.twitter.com/2/users/1720359275644547072/tweets?max_results=5", {       
  //     headers: {
  //        Authorization: `Bearer ${BEARER_TOKEN}`,
  //     },
  //   })
  //   .then((response) => response.json())
  //   .then((data) => setTweets(data))
  //   .catch(() => setError(true));
  // }, []);

  const fetchTweets = async (setTweets, setError) => {
    try {
      const response = await axios.get("http://localhost:5052/get-tweets");
      setTweets(response.data);
    } catch (error) {
      console.error("Error fetching tweets:", error);
      setError(true);
    }
  }


  useEffect(() => {
    fetchTweets(setTweets, setError);
  });

  console.log("this is the data:" +tweets);
  console.log("this is the error:" + error);

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
