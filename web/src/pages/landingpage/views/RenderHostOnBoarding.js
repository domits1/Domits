import spinner from "../../../images/spinnner.gif";
import Camper from "../../../images/icons/camper-van.png";
import Select from "react-select";
import info from "../../../images/icons/info.png";
import CalendarComponent from "../../../features/hostdashboard/CalendarComponent";
import RegistrationNumber from "../../../features/verification/hostverification/HostVerifyRegistrationNumber";
import DateFormatterDD_MM_YYYY from "../../../utils/DateFormatterDD_MM_YYYY";
import React from "react";

export function renderHostOnBoarding(isLoading, isNew, accoTypes, selectedAccoType, changeAccoType, accommodationIcons, navigate, hasAccoType, pageUpdater, boatTypes, selectedBoatType, changeGuestAccess, boatIcons, camperTypes, selectedCamperType, formData, hasGuestAccess, options, handleCountryChange, handleInputChange, hasAddress, decrementAmount, incrementAmount, typeAmenities, allAmenities, separatePascalCase, handleAmenities, handleHouseRulesChange, handleFileChange, handleDelete, hasImages, camperCategories, changeCamperCategory, licenseTypes, setLicenseRequirement, handleCheckBoxChange, hasSpecs, handleInputRestrictions, updateDates, setFormData, setDrafted, hasStripe, setDeclarationChecked, setTermsChecked, isDeclarationChecked, isTermsChecked, handleSubmit, handleUpdate) {
    const renderPageContent = (page) => {
        switch (page) {
            case 0:
                if (isLoading) {
                    return (<main className="loading">
                            <h2 className="spinner-text">Please wait a moment...</h2>
                            <img className="spinner" src={spinner}/>
                        </main>);
                } else return (<main className="page-body">
                        <h2 className="onboardingSectionTitle">
                            {isNew ? "What best describes your accommodation?" : "Edit your accommodation type"}
                        </h2>
                        <section className="accommodation-types">
                            {accoTypes.map((option, index) => (<div
                                    key={index}
                                    className={`option ${selectedAccoType === option ? "selected" : ""}`}
                                    onClick={() => changeAccoType(option)}
                                >
                                    <img
                                        className="accommodation-icon"
                                        src={accommodationIcons[option]}
                                        alt={option}
                                    />
                                    {option}
                                </div>))}
                        </section>
                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => navigate("/hostdashboard")}
                                style={{opacity: "75%"}}
                            >
                                Go to dashboard
                            </button>
                            <button
                                className={!hasAccoType ? "onboarding-button-disabled" : "onboarding-button"}
                                disabled={!hasAccoType}
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>);
            case 1:
                return (<main className="container">
                        {selectedAccoType === "Boat" ? (<div>
                                <h2 className="onboardingSectionTitle">
                                    {isNew ? "What type of boat do you own?" : "Change the type of boat that you own"}
                                </h2>
                                <section className="boat-types">
                                    {boatTypes.map((option, index) => (<div
                                            key={index}
                                            className={`option ${selectedBoatType === option ? "selected" : ""}`}
                                            onClick={() => changeGuestAccess(option)}
                                        >
                                            <img
                                                className="accommodation-icon"
                                                src={boatIcons[option]}
                                                alt={option}
                                            />
                                            {option}
                                        </div>))}
                                </section>
                            </div>) : selectedAccoType === "Camper" ? (<div>
                                <h2 className="onboardingSectionTitle">
                                    {isNew ? "What type of camper do you own?" : "Change the type of camper that you own"}
                                </h2>
                                <section className="accommodation-types">
                                    {camperTypes.map((option, index) => (<div
                                            key={index}
                                            className={`option ${selectedCamperType === option ? "selected" : ""}`}
                                            onClick={() => changeGuestAccess(option)}
                                        >
                                            <img
                                                className="accommodation-icon"
                                                src={Camper}
                                                alt={option}
                                            />
                                            {option}
                                        </div>))}
                                </section>
                            </div>) : (<section className="guest-access">
                                <h2 className="onboardingSectionTitle">
                                    {isNew ? "What kind of space do your guests have access to?" : "Change the type of access your guests can have"}
                                </h2>
                                <div
                                    className={formData.GuestAccess === "Entire house" ? "guest-access-item-selected" : "guest-access-item"}
                                    onClick={() => changeGuestAccess("Entire house")}
                                >
                                    <h3 className="guest-access-header">Entire house</h3>
                                    <p>Guests have the entire space to themselves</p>
                                </div>
                                <div
                                    className={formData.GuestAccess === "Room" ? "guest-access-item-selected" : "guest-access-item"}
                                    onClick={() => changeGuestAccess("Room")}
                                >
                                    <h3 className="guest-access-header">Room</h3>
                                    <p>
                                        Guests have their own room in a house and share other spaces
                                    </p>
                                </div>
                                <div
                                    className={formData.GuestAccess === "Shared room" ? "guest-access-item-selected" : "guest-access-item"}
                                    onClick={() => changeGuestAccess("Shared room")}
                                >
                                    <h3 className="guest-access-header">A shared room</h3>
                                    <p>
                                        Guests sleep in a room or common area that they may share
                                        with you or others
                                    </p>
                                </div>
                            </section>)}
                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back
                            </button>
                            <button
                                className={!hasGuestAccess ? "onboarding-button-disabled" : "onboarding-button"}
                                disabled={!hasGuestAccess}
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>);
            case 2:
                return (<main className="page-body">
                        <h2 className="onboardingSectionTitle">
                            {isNew ? `Where can we find your ${selectedAccoType === "Boat" || selectedAccoType === "Camper" ? selectedAccoType.toLowerCase() : "accommodation"}?` : `Change the location of your ${formData.AccommodationType === "Boat" || "Camper" ? formData.AccommodationType.toLowerCase() : "accommodation"}`}
                        </h2>
                        <p className="onboardingSectionSubtitle">
                            We only share your address with guests after they have booked
                        </p>

                        <section className="acco-location">
                            <section className="location-left">
                                <label htmlFor="country">
                                    {`Country${selectedAccoType === "Boat" || selectedAccoType === "Camper" ? " of registration" : ""}*`}
                                </label>

                                <Select
                                    options={options.map((country) => ({
                                        value: country, label: country,
                                    }))}
                                    name="Country"
                                    className="locationText"
                                    value={{
                                        value: formData.Country, label: formData.Country || "",
                                    }}
                                    onChange={handleCountryChange}
                                    id="country"
                                    required={true}
                                />

                                <label htmlFor="city">City*</label>
                                <input
                                    className="textInput-field locationText"
                                    name="City"
                                    onChange={handleInputChange}
                                    value={formData.City || ""}
                                    id="city"
                                    placeholder="Select your city"
                                    required={true}
                                />

                                {selectedAccoType !== "Boat" ? (<>
                                        <label htmlFor="street">Street + house nr.*</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Street"
                                            value={formData.Street || ""}
                                            onChange={handleInputChange}
                                            id="street"
                                            placeholder="Enter your address"
                                            required={true}
                                        />

                                        <label htmlFor="postal">Postal Code*</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="PostalCode"
                                            onChange={handleInputChange}
                                            value={formData.PostalCode || ""}
                                            id="postal"
                                            placeholder="Enter your postal code"
                                            required={true}
                                            minLength={4}
                                            maxLength={7}
                                            pattern="[A-Za-z\s,]+"
                                        />
                                    </>) : (<>
                                        <label htmlFor="harbour">Harbour*</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Harbour"
                                            onChange={handleInputChange}
                                            value={formData.Harbour || ""}
                                            id="harbour"
                                            placeholder="Enter the name of the harbour"
                                            required={true}
                                        />
                                    </>)}
                            </section>
                        </section>

                        <section className="listing-info enlist-info">
                            <img src={info} className="info-icon" alt="info icon"/>
                            <p className="info-msg">Fields with * are mandatory</p>
                        </section>

                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back
                            </button>
                            <button
                                className={!hasAddress ? "onboarding-button-disabled" : "onboarding-button"}
                                disabled={!hasAddress}
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>);
            case 3:
                return (<main className="container">
                        <h2 className="onboardingSectionTitle">
                            {isNew ? "How many people can stay here?" : "Adjust the maximum amount of guests"}
                        </h2>
                        <section className="guest-amount">
                            <div className="guest-amount-item">
                                <p>Guests</p>
                                <div className="amount-btn-box">
                                    <button
                                        className="round-button"
                                        onClick={() => decrementAmount("GuestAmount")}
                                    >
                                        -
                                    </button>
                                    {formData.GuestAmount}
                                    <button
                                        className="round-button"
                                        onClick={() => incrementAmount("GuestAmount")}
                                        disabled={formData.GuestAmount >= 10}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {selectedAccoType === "Boat" ? (<div className="guest-amount-item">
                                    <p>Cabins</p>
                                    <div className="amount-btn-box">
                                        <button
                                            className="round-button"
                                            onClick={() => decrementAmount("Cabins")}
                                        >
                                            -
                                        </button>
                                        {formData.Cabins}
                                        <button
                                            className="round-button"
                                            onClick={() => incrementAmount("Cabins")}
                                            disabled={formData.Cabins >= 10}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>) : selectedAccoType === "Camper" ? (<div className="guest-amount-item">
                                    <p>Bedrooms</p>
                                    <div className="amount-btn-box">
                                        <button
                                            className="round-button"
                                            onClick={() => decrementAmount("Bedrooms")}
                                        >
                                            -
                                        </button>
                                        {formData.Bedrooms}
                                        <button
                                            className="round-button"
                                            onClick={() => incrementAmount("Bedrooms")}
                                            disabled={formData.Bedrooms >= 10}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>) : (<div className="guest-amount-item">
                                    <p>Bedrooms</p>
                                    <div className="amount-btn-box">
                                        <button
                                            className="round-button"
                                            onClick={() => decrementAmount("Bedrooms")}
                                        >
                                            -
                                        </button>
                                        {formData.Bedrooms}
                                        <button
                                            className="round-button"
                                            onClick={() => incrementAmount("Bedrooms")}
                                            disabled={formData.Bedrooms >= 20}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>)}
                            <div className="guest-amount-item">
                                <p>Bathrooms</p>
                                <div className="amount-btn-box">
                                    <button
                                        className="round-button"
                                        onClick={() => decrementAmount("Bathrooms")}
                                    >
                                        -
                                    </button>
                                    {formData.Bathrooms}
                                    <button
                                        className="round-button"
                                        onClick={() => incrementAmount("Bathrooms")}
                                        disabled={formData.Bathrooms >= 10}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div className="guest-amount-item">
                                <p>Beds</p>
                                <div className="amount-btn-box">
                                    <button
                                        className="round-button"
                                        onClick={() => decrementAmount("Beds")}
                                    >
                                        -
                                    </button>
                                    {formData.Beds}
                                    <button
                                        className="round-button"
                                        onClick={() => incrementAmount("Beds")}
                                        disabled={formData.Beds >= 10}
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        </section>
                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back
                            </button>
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>);
            case 4:
                return (<main className="page-body">
                        <h2 className="onboardingSectionTitle">
                            {isNew ? "Let guests know what your space has to offer." : "Edit your amenities"}
                        </h2>
                        <p className="onboardingSectionSubtitle">
                            You can add more facilities after publishing your listing
                        </p>
                        <div className="amenity-groups">
                            {typeAmenities && formData.Features && Object.keys(typeAmenities).length > 0 && Object.keys(allAmenities).length > 0 && Object.keys(typeAmenities).map((category) => {
                                const amenities = typeAmenities[category] || [];
                                const featuresArray = formData.Features[category] || [];

                                return (<div
                                        key={category}
                                        style={{
                                            marginBottom: "5%",
                                            boxShadow: "inset 0 0 20px 10px #dedede",
                                            padding: "5%",
                                            borderRadius: "2rem",
                                        }}
                                    >
                                        <h2 className="amenity-header">
                                            {separatePascalCase(category)}
                                        </h2>
                                        <section className="check-box">
                                            {amenities.map((amenity) => (<label key={amenity}>
                                                    <input
                                                        type="checkbox"
                                                        name={amenity}
                                                        onChange={(e) => handleAmenities(category, amenity, e.target.checked,)}
                                                        checked={featuresArray.includes(amenity)}
                                                    />
                                                    {separatePascalCase(amenity)}
                                                </label>))}
                                        </section>
                                    </div>);
                            })}
                        </div>

                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back
                            </button>
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>);
            case 5:
                return (<main className="page-body">
                        <h2 className="onboardingSectionTitle">House rules</h2>
                        <div className="houseRulesContainer">
                            <div className="toggle-container">
                                <label className="toggle">
                                    <span className="toggle-label">Allow smoking</span>
                                    <input
                                        className="toggle-checkbox"
                                        type="checkbox"
                                        checked={formData.AllowSmoking}
                                        onChange={(e) => handleHouseRulesChange("AllowSmoking", e.target.checked)}
                                    />
                                    <div className="toggle-switch"></div>
                                </label>

                                <label className="toggle">
                                    <span className="toggle-label">Allow pets</span>
                                    <input
                                        className="toggle-checkbox"
                                        type="checkbox"
                                        checked={formData.AllowPets}
                                        onChange={(e) => handleHouseRulesChange("AllowPets", e.target.checked)}
                                    />
                                    <div className="toggle-switch"></div>
                                </label>

                                <label className="toggle">
                                    <span className="toggle-label">Allow parties/events</span>
                                    <input
                                        className="toggle-checkbox"
                                        type="checkbox"
                                        checked={formData.AllowParties}
                                        onChange={(e) => handleHouseRulesChange("AllowParties", e.target.checked)}
                                    />
                                    <div className="toggle-switch"></div>
                                </label>
                            </div>
                            <hr/>
                            <label className="Check">
                                <div className="Check-label">Check-in</div>
                                <span>From</span>
                                <select
                                    className="Check-checkbox"
                                    value={formData.CheckIn.From}
                                    onChange={(e) => handleHouseRulesChange("CheckIn", e.target.value, "From")}
                                >
                                    {Array.from({length: 24}, (_, i) => {
                                        const time = i.toString().padStart(2, "0") + ":00";
                                        return (<option key={i} value={time}>
                                                {time}
                                            </option>);
                                    })}
                                </select>
                                <span>Til</span>
                                <select
                                    className="Check-checkbox"
                                    value={formData.CheckIn.Til}
                                    onChange={(e) => handleHouseRulesChange("CheckIn", e.target.value, "Til")}
                                >
                                    {Array.from({length: 24}, (_, i) => {
                                        const time = i.toString().padStart(2, "0") + ":00";
                                        return (<option key={i} value={time}>
                                                {time}
                                            </option>);
                                    })}
                                </select>
                            </label>

                            <label className="Check">
                                <div className="Check-label">Check-out</div>
                                <span>From</span>
                                <select
                                    className="Check-checkbox"
                                    value={formData.CheckOut.From}
                                    onChange={(e) => handleHouseRulesChange("CheckOut", e.target.value, "From")}
                                >
                                    {Array.from({length: 24}, (_, i) => {
                                        const time = i.toString().padStart(2, "0") + ":00";
                                        return (<option key={i} value={time}>
                                                {time}
                                            </option>);
                                    })}
                                </select>
                                <span>Til</span>
                                <select
                                    className="Check-checkbox"
                                    value={formData.CheckOut.Til}
                                    onChange={(e) => handleHouseRulesChange("CheckOut", e.target.value, "Til")}
                                >
                                    {Array.from({length: 24}, (_, i) => {
                                        const time = i.toString().padStart(2, "0") + ":00";
                                        return (<option key={i} value={time}>
                                                {time}
                                            </option>);
                                    })}
                                </select>
                            </label>
                        </div>
                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back
                            </button>
                            {/* <button
                                className={
                                    formData.CheckIn?.From && formData.CheckIn?.Til && formData.CheckOut?.From && formData.CheckOut?.Til
                                        ? 'onboarding-button'
                                        : 'onboarding-button-disabled'
                                }
                                disabled={
                                    !(formData.CheckIn?.From && formData.CheckIn?.Til && formData.CheckOut?.From && formData.CheckOut?.Til)
                                }
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button> */}

                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>);
            case 6:
                return (<main className="container">
                        <h2 className="onboardingSectionTitle">
                            {isNew ? `Add photos of your ${selectedAccoType.toLowerCase()}` : `Edit photos of your ${selectedAccoType.toLowerCase()}`}
                        </h2>

                        <section className="accommodation-photos">
                            {!formData.Images ? (<section className="image-upload">
                                    <h2>Drag your photos here</h2>
                                    <p>Choose at least five photos</p>
                                    <input
                                        type="file"
                                        onChange={(e) => handleFileChange(e.target.files[0], 0)}
                                        accept="image/*"
                                        className="file-input-thumbnail"
                                        required={true}
                                    />
                                </section>) : (<section className="accommodation-images">
                                    {[...Array(5)].map((_, index) => (<section key={index} className="images-container">
                                            <input
                                                type="file"
                                                onChange={(e) => handleFileChange(e.target.files[0], index)}
                                                accept="image/*"
                                                className="file-input"
                                                required={true}
                                            />
                                            {formData.Images[`image${index + 1}`] && (<>
                                                    <img
                                                        src={formData.Images[`image${index + 1}`]}
                                                        alt={`Image-${index + 1}`}
                                                        className={index === 0 ? "accommodation-thumbnail" : "file-image"}
                                                    />
                                                    <button
                                                        className="delete-button"
                                                        onClick={() => handleDelete(index)}
                                                    >
                                                        Delete
                                                    </button>
                                                </>)}
                                            {!formData.Images[`image${index + 1}`] && (
                                                <div className="placeholder">Image {index + 1}</div>)}
                                        </section>))}
                                </section>)}
                        </section>

                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back
                            </button>
                            <button
                                className={!hasImages() ? "onboarding-button-disabled" : "onboarding-button"}
                                disabled={!hasImages()}
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>);
            case 7:
                return (<main className="container">
                        <h2 className="onboardingSectionTitle">
                            {isNew ? `Name your ${selectedAccoType.toLowerCase()}` : `Edit the name of your ${selectedAccoType.toLowerCase()}`}
                        </h2>
                        <p className="onboardingSectionSubtitle">
                            A short title works best. Don't worry, you can always change it
                            later.
                        </p>

                        <section className="accommodation-title">
              <textarea
                  className="textInput locationText"
                  id="title"
                  name="Title"
                  onChange={handleInputChange}
                  value={formData.Title}
                  placeholder="Enter your title here..."
                  required={true}
                  maxLength={128}
              />
                            <p>{formData.Title.length}/128</p>
                        </section>
                        <h2 className="onboardingSectionTitle">
                            {isNew ? "Give it a suitable subtitle" : "Edit your subtitle"}
                        </h2>
                        <section className="accommodation-title">
              <textarea
                  className="textInput locationText"
                  id="Subtitle"
                  name="Subtitle"
                  onChange={handleInputChange}
                  value={formData.Subtitle}
                  placeholder="Enter your subtitle here..."
                  required={true}
                  maxLength={128}
              />
                            <p>{formData.Subtitle.length}/128</p>
                        </section>
                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back
                            </button>
                            <button
                                className={!(formData.Title && formData.Subtitle) ? "onboarding-button-disabled" : "onboarding-button"}
                                disabled={!(formData.Title && formData.Subtitle)}
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>);
            case 8:
                return (<main className="container">
                        <h2 className="onboardingSectionTitle">
                            {isNew ? "Provide a description" : "Edit your description"}
                        </h2>
                        <p className="onboardingSectionSubtitle">
                            Share what makes your boat special.
                        </p>

                        <section className="accommodation-title">
              <textarea
                  className="textInput locationText title-input"
                  id="description"
                  name="Description"
                  onChange={handleInputChange}
                  value={formData.Description}
                  placeholder="Enter your title here..."
                  required={true}
                  maxLength={500}
              />
                            <p>{formData.Description.length}/500</p>
                        </section>
                        {selectedAccoType === "Boat" ? (<div className="accommodation-specification">
                                <h1>General</h1>
                                <section className="accommodation-general">
                                    <label>Are you a professional?</label>
                                    <div className="radioBtn-box">
                                        <label>
                                            <input
                                                type="radio"
                                                name="isPro"
                                                onChange={handleInputChange}
                                                checked={formData.isPro}
                                            />
                                            Yes
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="isPro"
                                                onChange={handleInputChange}
                                                checked={!formData.isPro}
                                            />
                                            No
                                        </label>
                                    </div>
                                    <label htmlFor="city">Manufacturer*</label>
                                    <input
                                        className="textInput-field locationText"
                                        name="Manufacturer"
                                        onChange={handleInputChange}
                                        value={formData.Manufacturer}
                                        id="manufacturer"
                                        placeholder="Enter the manufacturer of your boat"
                                        required={true}
                                    />
                                    <label htmlFor="city">Model*</label>
                                    <input
                                        className="textInput-field locationText"
                                        name="Model"
                                        onChange={handleInputChange}
                                        value={formData.Model}
                                        id="model"
                                        placeholder="Enter the name of the model"
                                        required={true}
                                    />
                                    <label htmlFor="city">
                                        Is your boat rented with a skipper?
                                    </label>
                                    <div className="radioBtn-box">
                                        <label>
                                            <input
                                                type="radio"
                                                name="RentedWithSkipper"
                                                onChange={handleInputChange}
                                                checked={formData.RentedWithSkipper}
                                            />
                                            Yes
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="RentedWithSkipper"
                                                onChange={handleInputChange}
                                                checked={!formData.RentedWithSkipper}
                                            />
                                            No
                                        </label>
                                    </div>
                                    <label htmlFor="city">
                                        Does your boat need a boating license?
                                    </label>
                                    <div className="radioBtn-box">
                                        <label>
                                            <input
                                                type="radio"
                                                name="HasLicense"
                                                onChange={handleInputChange}
                                                checked={formData.HasLicense}
                                            />
                                            Yes
                                        </label>
                                        <label>
                                            <input
                                                type="radio"
                                                name="HasLicense"
                                                onChange={handleInputChange}
                                                checked={!formData.HasLicense}
                                            />
                                            No
                                        </label>
                                    </div>
                                    <label htmlFor="GPI">General periodic inspection*</label>
                                    <input
                                        type="date"
                                        className="textInput-field locationText"
                                        name="GPI"
                                        onChange={handleInputChange}
                                        value={formData.GPI}
                                        id="gpi"
                                        placeholder="DD/MM/YYYY"
                                        required={true}
                                    />
                                </section>
                                <h1>Technical</h1>
                                <section className="accommodation-technical">
                                    <div>
                                        <label htmlFor="capacity">Capacity (allowed)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Capacity"
                                            onChange={handleInputChange}
                                            value={formData.Capacity}
                                            id="capacity"
                                            required={true}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="length">Length (m)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Length"
                                            onChange={handleInputChange}
                                            value={formData.Length}
                                            id="length"
                                            required={true}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="fuel">Fuel (L/h)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="FuelTank"
                                            onChange={handleInputChange}
                                            value={formData.FuelTank}
                                            id="fueltank"
                                            required={true}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="speed">Top speed (Km)</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Speed"
                                            onChange={handleInputChange}
                                            value={formData.Speed}
                                            id="speed"
                                            required={true}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="YOC">Year of construction</label>
                                        <input
                                            type="number"
                                            className="textInput-field locationText"
                                            name="YOC"
                                            onChange={handleInputChange}
                                            value={formData.YOC}
                                            id="yoc"
                                            required={true}
                                            min={1900}
                                            max={new Date().getFullYear()}
                                            placeholder="YYYY"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="renovated">Renovated</label>
                                        <input
                                            type="number"
                                            className="textInput-field locationText"
                                            name="Renovated"
                                            onChange={handleInputChange}
                                            value={formData.Renovated}
                                            id="renovated"
                                            required={true}
                                            min={1900}
                                            max={new Date().getFullYear()}
                                            placeholder="YYYY"
                                        />
                                    </div>
                                </section>
                            </div>) : (selectedAccoType === "Camper" && (<div className="accommodation-specification">
                                    <h1>General</h1>
                                    <section className="accommodation-general">
                                        <label>Category</label>
                                        <div className="radioBtn-box">
                                            {camperCategories.map((category, index) => (<>
                                                    <label key={index}>
                                                        <input
                                                            type="radio"
                                                            name="Category"
                                                            onChange={() => changeCamperCategory(category)}
                                                            checked={formData.Category === category}
                                                        />
                                                        {category}
                                                    </label>
                                                </>))}
                                        </div>
                                        <label htmlFor="city">License plate*</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="LicensePlate"
                                            onChange={handleInputChange}
                                            value={formData.LicensePlate}
                                            id="licensePlate"
                                            placeholder="Enter the characters of your license plate"
                                            required={true}
                                        />
                                        <label htmlFor="city">Brand*</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="CamperBrand"
                                            onChange={handleInputChange}
                                            value={formData.CamperBrand}
                                            id="camperbrand"
                                            placeholder="Enter the brand of your camper"
                                            required={true}
                                        />
                                        <label htmlFor="city">Model*</label>
                                        <input
                                            className="textInput-field locationText"
                                            name="Model"
                                            onChange={handleInputChange}
                                            value={formData.Model}
                                            id="model"
                                            placeholder="Enter the name of the model"
                                            required={true}
                                        />
                                        <label>Required driver’s license</label>
                                        <Select
                                            options={licenseTypes.map((licenseType) => ({
                                                value: licenseType, label: licenseType,
                                            }))}
                                            name="Requirement"
                                            className="locationText"
                                            value={{
                                                value: formData.Requirement,
                                                label: `${formData.Requirement ? formData.Requirement : "Select the required license type"}`,
                                            }}
                                            onChange={setLicenseRequirement}
                                            id="requirement"
                                            required={true}
                                        />
                                        <label style={{marginTop: "5%"}} htmlFor="GPI">
                                            General periodic inspection*
                                        </label>
                                        <input
                                            type="date"
                                            className="textInput-field locationText"
                                            name="GPI"
                                            onChange={handleInputChange}
                                            value={formData.GPI}
                                            id="gpi"
                                            placeholder="DD/MM/YYYY"
                                            required={true}
                                        />
                                    </section>
                                    <h1>Technical</h1>
                                    <section className="accommodation-technical">
                                        <div>
                                            <label htmlFor="length">Length (m)</label>
                                            <input
                                                className="textInput-field locationText"
                                                name="Length"
                                                onChange={handleInputChange}
                                                value={formData.Length}
                                                id="length"
                                                required={true}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="length">Height (m)</label>
                                            <input
                                                className="textInput-field locationText"
                                                name="Height"
                                                onChange={handleInputChange}
                                                value={formData.Height}
                                                id="height"
                                                required={true}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="fuel">Transmission</label>
                                            <input
                                                className="textInput-field locationText"
                                                name="Transmission"
                                                onChange={handleInputChange}
                                                value={formData.Transmission}
                                                id="transmission"
                                                required={true}
                                                placeholder="Manual or Automatic"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="fuel">Fuel (L/h)</label>
                                            <input
                                                className="textInput-field locationText"
                                                name="FuelTank"
                                                onChange={handleInputChange}
                                                value={formData.FuelTank}
                                                id="fueltank"
                                                required={true}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="YOC">Year of construction</label>
                                            <input
                                                type="number"
                                                className="textInput-field locationText"
                                                name="YOC"
                                                onChange={handleInputChange}
                                                value={formData.YOC}
                                                id="yoc"
                                                required={true}
                                                min={1900}
                                                max={new Date().getFullYear()}
                                                placeholder="YYYY"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="renovated">Renovated</label>
                                            <input
                                                type="number"
                                                className="textInput-field locationText"
                                                name="Renovated"
                                                onChange={handleInputChange}
                                                value={formData.Renovated}
                                                id="renovated"
                                                required={true}
                                                min={1900}
                                                max={new Date().getFullYear()}
                                                placeholder="YYYY"
                                            />
                                        </div>
                                        <div className="check-box-vertical">
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    name="FWD"
                                                    onChange={handleCheckBoxChange}
                                                    checked={formData.FWD}
                                                />
                                                4 x 4 Four-Wheel Drive
                                            </label>
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    name="SelfBuilt"
                                                    onChange={handleCheckBoxChange}
                                                    checked={formData.SelfBuilt}
                                                />
                                                My camper is self-built
                                            </label>
                                        </div>
                                    </section>
                                </div>))}
                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back
                            </button>
                            {selectedAccoType === "Boat" || selectedAccoType === "Camper" ? (<button
                                    className={!(formData.Description && hasSpecs) ? "onboarding-button-disabled" : "onboarding-button"}
                                    disabled={!(formData.Description && hasSpecs)}
                                    onClick={() => pageUpdater(page + 1)}
                                >
                                    Confirm and proceed
                                </button>) : (<button
                                    className={!formData.Description ? "onboarding-button-disabled" : "onboarding-button"}
                                    disabled={!formData.Description}
                                    onClick={() => pageUpdater(page + 1)}
                                >
                                    Confirm and proceed
                                </button>)}
                        </nav>
                    </main>);
            case 9:
                return (<main className="container">
                        <h2 className="onboardingSectionTitle">
                            {isNew ? "Now set your rate" : "Edit your rate"}
                        </h2>
                        <h2 className="acco-price">
                            {!isNaN(parseFloat(formData.Rent)) ? `€ ${parseFloat(formData.Rent).toFixed(0)}` : "Enter your base rate"}
                        </h2>
                        <section className="accommodation-pricing">
                            <div className="pricing-row">
                                <label>Base rate</label>
                                <input
                                    className="pricing-input"
                                    type="number"
                                    name="Rent"
                                    onChange={handleInputChange}
                                    onInput={handleInputRestrictions}
                                    value={formData.Rent}
                                    min={1}
                                    step={0.1}
                                    required={true}
                                />
                            </div>
                            {formData.Features.ExtraServices.includes("Cleaning service (add service fee manually)",) && (
                                <div className="pricing-row">
                                    <label>Cleaning fee</label>
                                    <input
                                        className="pricing-input"
                                        type="number"
                                        name="CleaningFee"
                                        onChange={handleInputChange}
                                        onInput={handleInputRestrictions}
                                        defaultValue={formData.CleaningFee ? formData.CleaningFee : 1}
                                        min={1}
                                        step={0.1}
                                        required={true}
                                    />
                                </div>)}
                            <div className="pricing-row">
                                <label>Service fees</label>
                                <p className="pricing-input">
                                    €
                                    {(!isNaN(parseFloat(formData.ServiceFee)) ? parseFloat(formData.ServiceFee) : 0).toFixed(2)}
                                </p>
                            </div>
                            <hr/>
                            <div className="pricing-row">
                                <label>Guest's price</label>
                                <p className="pricing-input">
                                    €
                                    {((!isNaN(parseFloat(formData.Rent)) ? parseFloat(formData.Rent) : 0) + (!isNaN(parseFloat(formData.CleaningFee)) ? parseFloat(formData.CleaningFee) : 0) + (!isNaN(parseFloat(formData.ServiceFee)) ? parseFloat(formData.ServiceFee) : 0)).toFixed(2)}
                                </p>
                            </div>
                        </section>
                        <section className="accommodation-pricing">
                            <div className="pricing-row">
                                <label>You earn</label>
                                <p className="pricing-input">
                                    €
                                    {((!isNaN(parseFloat(formData.Rent)) ? parseFloat(formData.Rent) : 0) + (!isNaN(parseFloat(formData.CleaningFee)) ? parseFloat(formData.CleaningFee) : 0)).toFixed(2)}
                                </p>
                            </div>
                        </section>
                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back
                            </button>
                            <button
                                className={!formData.Rent ? "onboarding-button-disabled" : "onboarding-button"}
                                disabled={!formData.Rent}
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>);
            case 10:
                return (<main className="container">
                        <h2 className="onboardingSectionTitle">
                            {isNew ? "Share your first availability" : "Edit your availability"}
                        </h2>
                        <p className="onboardingSectionSubtitle">
                            You can edit and delete availabilities later within your dashboard
                        </p>
                        <section className="listing-calendar">
                            <CalendarComponent
                                passedProp={formData}
                                isNew={true}
                                updateDates={updateDates}
                                componentView={false}
                            />
                        </section>
                        <nav className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back
                            </button>
                            <button
                                className={"onboarding-button"}
                                onClick={() => pageUpdater(page + 1)}
                            >
                                Confirm and proceed
                            </button>
                        </nav>
                    </main>);
                const address = {
                    Country: formData.Country,
                    City: formData.City,
                    PostalCode: formData.PostalCode,
                    Street: formData.Street,
                };
                return (<RegistrationNumber
                        Address={address}
                        Next={() => pageUpdater(page + 1)}
                        Previous={() => pageUpdater(page - 1)}
                        setFormData={setFormData}
                        RegistrationNumber={formData.RegistrationNumber}
                    />);
            case 11:
                return (<div className="container" id="summary" style={{width: "80%"}}>
                        <h2>Please check if everything is correct</h2>
                        <table className="accommodation-summary">
                            <tbody>
                            <tr>
                                <th>
                                    <h3>Property Details:</h3>
                                </th>
                            </tr>
                            <tr>
                                <td>Title:</td>
                                <td>{formData.Title}</td>
                            </tr>
                            <tr>
                                <td>Description:</td>
                                <td>{formData.Description}</td>
                            </tr>
                            <tr>
                                <td>Rent:</td>
                                <td>{formData.Rent}</td>
                            </tr>

                            <tr>
                                <td>Cleaning fee:</td>
                                <td>{formData.CleaningFee}</td>
                            </tr>
                            <tr>
                                <td>Accommodation Type:</td>
                                <td>{selectedAccoType}</td>
                            </tr>
                            <tr>
                                <td>Date Range:</td>
                                <td>
                                    {formData.DateRanges.length > 0 ? `Available from ${DateFormatterDD_MM_YYYY(formData.DateRanges[0].startDate)} 
                                        to ${DateFormatterDD_MM_YYYY(formData.DateRanges[formData.DateRanges.length - 1].endDate)}` : "Date range not set"}
                                </td>
                            </tr>
                            <tr>
                                <td>Number of Guests:</td>
                                <td>{formData.GuestAmount}</td>
                            </tr>
                            {selectedAccoType === "Boat" ? (<tr>
                                    <td>Number of Cabins:</td>
                                    <td>{formData.Cabins}</td>
                                </tr>) : selectedAccoType === "Camper" ? (<tr>
                                    <td>Number of Bedrooms:</td>
                                    <td>{formData.Bedrooms}</td>
                                </tr>) : (<tr>
                                    <td>Number of Bedrooms:</td>
                                    <td>{formData.Bedrooms}</td>
                                </tr>)}
                            <tr>
                                <td>Number of Bathrooms:</td>
                                <td>{formData.Bathrooms}</td>
                            </tr>
                            <tr>
                                <td>Number of Fixed Beds:</td>
                                <td>{formData.Beds}</td>
                            </tr>
                            <tr>
                                <td>{`Country${selectedAccoType === "Boat" || selectedAccoType === "Camper" ? " of registration" : ""}:`}</td>
                                <td>{formData.Country}</td>
                            </tr>
                            <tr>
                                <td>City:</td>
                                <td>{formData.City}</td>
                            </tr>
                            {selectedAccoType === "Boat" ? (<tr>
                                    <td>Harbour:</td>
                                    <td>{formData.Harbour}</td>
                                </tr>) : (<>
                                    <tr>
                                        <td>Postal Code:</td>
                                        <td>{formData.PostalCode}</td>
                                    </tr>
                                    <tr>
                                        <td>Street + House Nr.:</td>
                                        <td>{formData.Street}</td>
                                    </tr>
                                    <tr>
                                        <td>Smoking:</td>
                                        <td>{formData.AllowSmoking ? "Yes" : "No"}</td>
                                    </tr>

                                    <tr>
                                        <td>Pets:</td>
                                        <td>{formData.AllowPets ? "Yes" : "No"}</td>
                                    </tr>

                                    <tr>
                                        <td>Parties/events:</td>
                                        <td>{formData.AllowParties ? "Yes" : "No"}</td>
                                    </tr>

                                    <tr>
                                        <td>Checkin:</td>
                                        <td>
                                            From: {formData.CheckIn.From} Til:{" "}
                                            {formData.CheckIn.Til}
                                        </td>
                                    </tr>

                                    <tr>
                                        <td>Checkout:</td>
                                        <td>
                                            From: {formData.CheckOut.From} Til:{" "}
                                            {formData.CheckOut.Til}
                                        </td>
                                    </tr>
                                </>)}
                            </tbody>
                        </table>
                        {selectedAccoType === "Boat" ? (<>
                                <th>
                                    <h3>Specifications:</h3>
                                </th>
                                <table style={{width: "100%", borderCollapse: "collapse"}}>
                                    <tbody>
                                    <tr>
                                        <td>Manufacturer:</td>
                                        <td>{formData.Manufacturer}</td>
                                    </tr>
                                    <tr>
                                        <td>Model:</td>
                                        <td>{formData.Model}</td>
                                    </tr>
                                    <tr>
                                        <td>General periodic inspection:</td>
                                        <td>{DateFormatterDD_MM_YYYY(formData.GPI)}</td>
                                    </tr>
                                    <tr>
                                        <td>Maximum capacity:</td>
                                        <td>
                                            {formData.Capacity}
                                            {formData.Capacity > 1 ? "People" : "Person"}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Length in meters:</td>
                                        <td>{formData.Length} meter</td>
                                    </tr>
                                    <tr>
                                        <td>Fuel usage:</td>
                                        <td>{formData.FuelTank} Liter(s) per hour</td>
                                    </tr>
                                    <tr>
                                        <td>Top speed:</td>
                                        <td>{formData.Speed} Kilometers per hour</td>
                                    </tr>
                                    <tr>
                                        <td>Year of construction:</td>
                                        <td>{DateFormatterDD_MM_YYYY(formData.YOC)}</td>
                                    </tr>
                                    {formData.Renovated && (<tr>
                                            <td>Renovated on:</td>
                                            <td>{DateFormatterDD_MM_YYYY(formData.Renovated)}</td>
                                        </tr>)}
                                    </tbody>
                                </table>
                            </>) : (selectedAccoType === "Camper" && (<>
                                    <th>
                                        <h3>Specifications:</h3>
                                    </th>
                                    <table style={{width: "100%", borderCollapse: "collapse"}}>
                                        <tbody>
                                        <tr>
                                            <td>License plate characters:</td>
                                            <td>{formData.LicensePlate}</td>
                                        </tr>
                                        <tr>
                                            <td>Brand:</td>
                                            <td>{formData.CamperBrand}</td>
                                        </tr>
                                        <tr>
                                            <td>Model:</td>
                                            <td>{formData.Model}</td>
                                        </tr>
                                        <tr>
                                            <td>Required type of driver's license:</td>
                                            <td>{formData.Requirement}</td>
                                        </tr>
                                        <tr>
                                            <td>General periodic inspection:</td>
                                            <td>{DateFormatterDD_MM_YYYY(formData.GPI)}</td>
                                        </tr>
                                        <tr>
                                            <td>Height in meters:</td>
                                            <td>{formData.Height} meter</td>
                                        </tr>
                                        <tr>
                                            <td>Length in meters:</td>
                                            <td>{formData.Length} meter</td>
                                        </tr>
                                        <tr>
                                            <td>Fuel usage:</td>
                                            <td>{formData.FuelTank} Liter(s) per hour</td>
                                        </tr>
                                        <tr>
                                            <td>Transmission:</td>
                                            <td>{formData.Transmission}</td>
                                        </tr>

                                        <tr>
                                            <td>4 x 4 Four-Wheel Drive:</td>
                                            <td>{formData.FWD ? "Yes" : "No"}</td>
                                        </tr>

                                        <tr>
                                            <td>SelfBuilt:</td>
                                            <td>{formData.SelfBuilt ? "Yes" : "No"}</td>
                                        </tr>

                                        <tr>
                                            <td>Year of construction:</td>
                                            <td>{DateFormatterDD_MM_YYYY(formData.YOC)}</td>
                                        </tr>
                                        {formData.Renovated && (<tr>
                                                <td>Renovated on:</td>
                                                <td>{DateFormatterDD_MM_YYYY(formData.Renovated)}</td>
                                            </tr>)}
                                        </tbody>
                                    </table>
                                </>))}
                        {!Object.values(formData.Features).every((arr) => arr.length === 0,) && (<>
                                <th>
                                    <h3>Features:</h3>
                                </th>
                                <table style={{width: "100%", borderCollapse: "collapse"}}>
                                    <tbody>
                                    {Object.keys(formData.Features).map((category) => (<>
                                            {formData.Features[category].length > 0 && (<tr key={category}>
                                                    <td
                                                        colSpan={2}
                                                        style={{
                                                            fontWeight: "bold", borderBottom: "1px solid #ccc",
                                                        }}
                                                    >
                                                        {category}:
                                                    </td>
                                                </tr>)}
                                            {formData.Features[category].map((amenity, index) => (
                                                <tr key={`${category}-${index}`}>
                                                    <td style={{borderBottom: "1px solid #ccc"}}>
                                                        {amenity}
                                                    </td>
                                                    <td style={{borderBottom: "1px solid #ccc"}}>
                                                        Yes
                                                    </td>
                                                </tr>))}
                                        </>))}
                                    </tbody>
                                </table>
                            </>)}
                        <p>Your accommodation ID: {formData.ID}</p>
                        <p>
                            {formData.Drafted ? "Guests cannot book your accommodation before you set it live via Hostdashboard -> Listing" : "Guests can book your accommodation anytime now!"}
                        </p>
                        <label>
                            <input
                                type="checkbox"
                                className="radioInput"
                                name="Drafted"
                                onChange={() => setDrafted(!formData.Drafted)}
                                disabled={!(formData.DateRanges.length > 0 && hasStripe)}
                                checked={formData.Drafted}
                            />
                            Mark as draft (Stripe account and date range is required)
                        </label>
                        <div className="verifyCheck">
                            <label>
                                <input
                                    type="checkbox"
                                    onChange={(e) => setDeclarationChecked(e.target.checked)}
                                />
                                I declare that this property is legitimate, complete with
                                required licenses and permits, which can be displayed upon
                                request. Domits B.V. reserves the right to verify and
                                investigate your registration information.
                            </label>
                            <div>
                                <label>
                                    <input
                                        type="checkbox"
                                        onChange={(e) => setTermsChecked(e.target.checked)}
                                    />
                                    I confirm that I have read and accept the{" "}
                                    <a className="termsCondition" href="#">
                                        General Terms and Conditions
                                    </a>
                                    .
                                </label>
                            </div>
                        </div>
                        <div className="onboarding-button-box">
                            <button
                                className="onboarding-button"
                                onClick={() => pageUpdater(page - 1)}
                                style={{opacity: "75%"}}
                            >
                                Go back to change
                            </button>
                            <button
                                className={!(isDeclarationChecked && isTermsChecked) ? "onboarding-button-disabled" : "onboarding-button"}
                                onClick={isNew ? () => {
                                    handleSubmit();
                                    pageUpdater(page + 1);
                                } : () => {
                                    handleUpdate();
                                    pageUpdater(page + 1);
                                }}
                                disabled={!(isDeclarationChecked && isTermsChecked)}
                            >
                                {isNew ? "Confirm" : "Confirm and update"}
                            </button>
                        </div>
                    </div>);
            case 12:
                if (isLoading) {
                    return (<main className="loading">
                            <h2 className="spinner-text">Please wait a moment...</h2>
                            <img className="spinner" src={spinner}/>
                        </main>);
                } else {
                    return (<div className="container">
                            <h2>Congratulations! Your accommodation is being listed</h2>
                            <p className="onboardingSectionSubtitle">
                                It may take a while before your accommodation is verified
                            </p>
                            <div className="button-box-last">
                                <button
                                    className="onboarding-button"
                                    onClick={() => navigate("/hostdashboard/listings")}
                                >
                                    Go to my listings
                                </button>
                                <button
                                    className="onboarding-button"
                                    onClick={() => navigate("/hostdashboard")}
                                >
                                    Go to dashboard
                                </button>
                            </div>
                        </div>);
                }
            default:
                return null;
        }
    };
    return renderPageContent;
}
