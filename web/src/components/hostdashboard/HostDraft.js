import React, {useState} from 'react';
import Pages from "./Pages.js";
import info from "../../images/icons/info.png";

const HostDraft = () => {
    const [options] = useState(["Drafted", "Live"]);
    const [selectedOption, setSelectedOption] = useState("Drafted");
    const handleOptionClick = (option) => {
        setSelectedOption(option);
    };



    return (
        <main className="container">
            <section className='host-pc' style={{
                display: "flex",
                flexDirection: "row"
            }}>
                <Pages />
                <section className="reservation-content">
                    <h1 className="header">Manage drafts</h1>
                    <div className="reservation-info">
                        <img src={info} className="info-icon"/>
                        <p className="info-msg">You can manage your drafted accommodations here</p>
                    </div>
                    <section className="reservation-selector">
                        {options.map((option, index) => (
                            <div
                                key={index}
                                className={`option ${selectedOption === option ? 'selected' : ''}`}
                                onClick={() => handleOptionClick(option)}
                            >
                                {option}
                            </div>
                        ))}
                    </section>
                </section>
            </section>
        </main>
    );
}

export default HostDraft;
