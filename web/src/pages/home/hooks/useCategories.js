import friends from "../Images/friends.webp";
import couples from "../Images/couples.webp";
import family from "../Images/family.webp";
import solo from "../Images/solo.webp";
import senior from "../Images/senior.webp";
import petFriendly from "../Images/petfriendly.webp";
import content from "../../../content/content.json";
import content2 from "../../../content/content2.json";
import { useContext } from "react";
import { LanguageContext } from "../../../context/LanguageContext.js";

export const useCategories = () => {
    const { language } = useContext(LanguageContext);    
    const groups = content2[language].homepage.filters.groups;
    
    return [
       {
           name: `${groups.friends}`,
           img: friends,
           description: `${groups.description}`,
         },
         {
           name: `${groups.couples}`,
           img: couples,
           description: `${groups.description}`,
         },
         {
           name: `${groups.family}`,
           img: family,
           description: `${groups.description}`,
         },
         {
           name: `${groups.solo}`,
           img: solo,
           description: `${groups.description}`,
         },
         {
           name: `${groups.senior}`,
           img: senior,
           description: `${groups.description}`,
         },
         {
           name: `${groups.petFriendly}`,
           img: petFriendly,
           description: `${groups.description}`,
         }, 
    ];
};