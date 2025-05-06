import friends from "../Images/friends.webp";
import couples from "../Images/couples.webp";
import family from "../Images/family.webp";
import solo from "../Images/solo.webp";
import senior from "../Images/senior.webp";
import petFriendly from "../Images/petfriendly.webp";
import { useContext } from "react";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";

const contentByLanguage = {
  en,
  nl,
};

export const useCategories = () => {
    const { language } = useContext(LanguageContext);    
    const groups = contentByLanguage[language]?.homepage.filters.groups;
    
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