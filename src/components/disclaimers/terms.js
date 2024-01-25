import React, { useState, useEffect, useRef } from "react";
import Mark from "mark.js";
import './disclaimer.css';

const Terms = () => {
    const [searchText, setSearchText] = useState("");
    const privacyPolicyRef = useRef(null);
    const markInstanceRef = useRef(null);

    useEffect(() => {
        const target = privacyPolicyRef.current;

        if (!target) return;

        target.innerHTML = target.innerHTML.replace(/<mark>(.*?)<\/mark>/g, "$1");

        // If search text is empty, do nothing
        if (!searchText.trim()) return;

        markInstanceRef.current = markInstanceRef.current || new Mark(target);
        markInstanceRef.current.mark(searchText, {
            element: "mark",
        });

        return () => {
            markInstanceRef.current.unmark();
        };
    }, [searchText]);

    const handleKeyDown = (e) => {
        if (e.key === "Enter") {
            setSearchText(e.target.value);
        }
    };

    return(
        <div className="terms">
            <h1>Domits Terms and Conditions</h1>
            <input
                type="text"
                placeholder="Search within terms and conditions..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <br />
            
            <div id="privacyPolicy" ref={privacyPolicyRef}>
                  <h3>Disclaimer</h3>
                <p>Last updated: December 28, 2023 </p>
                <h3>Interpretation and Definitions </h3>

                    <p>Interpretation</p>
                <p>The words of which the initial letter is capitalized have meanings defined under the following conditions.
                The following definitions shall have the same meaning regardless of whether they appear in singular or in plural. </p>
                    <br />
                <h3>Definitions </h3>
                For the purposes of this Disclaimer: 

                    <p>· Company (referred to as either "the Company", "We", "Us" or "Our" in this Disclaimer) refers to Domits, Kinderhuissingel 6-K, Haarlem 2013 AS. </p>
                <p>· Service refers to the Website. </p>
                <p>· You means the individual accessing the Service, or the company, or other legal entity on behalf of which such individual is accessing or using the Service, as applicable.</p>
                <p>· Website refers to Domits.com, accessible from domits.com </p>
                    <br />
                <h3>Disclaimer The information </h3>
                
                contained on the Service is for general information purposes only. 
                The Company assumes no responsibility for errors or omissions in the contents of the Service. In no event shall the Company be liable for any special, direct, indirect, consequential,
                or incidental damages or any damages whatsoever, whether in an action of contract, negligence or other tort, 
                arising out of or in connection with the use of the Service or the contents of the Service. 
                The Company reserves the right to make additions, deletions,
                or modifications to the contents on the Service at any time without prior notice.
                The Company does not warrant that the Service is free of viruses or other harmful components.
                    <br />
                <h3>External Links Disclaimer</h3>
                
                 The Service may contain links to external websites that are not provided or maintained by or in any way affiliated with the Company.
                Please note that the Company does not guarantee the accuracy, relevance, timeliness, or completeness of any information on these external websites. 
                    <br />
                <h3>Errors and Omissions Disclaimer </h3>
                
                The information given by the Service is for general guidance on matters of interest only. Even if the Company takes every precaution to ensure that the content of the Service is both current and accurate, errors can occur.
                Plus, given the changing nature of laws, rules and regulations, there may be delays, omissions or inaccuracies in the information contained on the Service. The Company is not responsible for any errors or omissions, or for the results obtained from the use of this information.
                   <br />
                <h3>Fair Use Disclaimer</h3>
                
                The Company may use copyrighted material which has not always been specifically authorized by the copyright owner. The Company is making such material available for criticism, comment, news reporting, teaching, scholarship, or research. 
                If You wish to use copyrighted material from the Service for your own purposes that go beyond fair use, You must obtain permission from the copyright owner.  
            </div>
        </div>
    );
}

export default Terms;