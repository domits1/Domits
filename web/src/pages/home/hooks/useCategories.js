import content from "../../../content/content.json";
import friends from "../Images/friends.webp";
import couples from "../Images/couples.webp";
import family from "../Images/family.webp";
import solo from "../Images/solo.webp";
import senior from "../Images/senior.webp";
import petFriendly from "../Images/petfriendly.webp";
import { useContext } from "react";
import { LanguageContext } from "../../../context/LanguageContext.js";

export const useCategories = () => {
    const { language } = useContext(LanguageContext);
    const {vacationrentalLbl,friendsLbl,couplesLbl,familyChildFriendlyLbl,soloLbl,seniorLbl,petFriendlyLbl
    } = content[language].homepage;    
    
    return [
       {
           name: `${friendsLbl}`,
           img: friends,
           description: `${vacationrentalLbl}`,
         },
         {
           name: `${couplesLbl}`,
           img: couples,
           description: `${vacationrentalLbl}`,
         },
         {
           name: `${familyChildFriendlyLbl}`,
           img: family,
           description: `${vacationrentalLbl}`,
         },
         {
           name: `${soloLbl}`,
           img: solo,
           description: `${vacationrentalLbl}`,
         },
         {
           name: `${seniorLbl}`,
           img: senior,
           description: `${vacationrentalLbl}`,
         },
         {
           name: `${petFriendlyLbl}`,
           img: petFriendly,
           description: `${vacationrentalLbl}`,
         }, 
    ];
};