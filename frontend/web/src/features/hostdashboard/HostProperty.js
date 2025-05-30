import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Pages from "./Pages";
import styles from "./HostProperty.module.css";
import Back from "@mui/icons-material/KeyboardBackspace";

export default function HostProperty() {
  const [isLoading, setIsLoading] = useState(true);
  const [accommodationData, setAccommodationData] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [activeTab, setActiveTab] = useState("Details");
  const [selectedSection, setSelectedSection] = useState(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const accommodationID = params.get("ID");

  useEffect(() => {
    if (!accommodationID) return;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodation",
          {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ID:accommodationID})}
        );
        if(!res.ok) throw new Error("Failed to fetch accommodation data");
        const responseData = await res.json();
        const data = JSON.parse(responseData.body);
        setAccommodationData(data);
        setEditedData(data);
      } catch(e){console.error(e);} 
      finally{setIsLoading(false);}
    })();
  }, [accommodationID]);

  const handleChange = (field,value) => {
    setEditedData(prev => ({...prev,[field]:value}));
  };
  const handleSave = async() => {
    try {
      setIsLoading(true);
      const res = await fetch(
        "https://ms26uksm37.execute-api.eu-north-1.amazonaws.com/dev/EditAccommodation",
        {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(editedData)}
      );
      if(!res.ok) throw new Error("Failed to update accommodation");
      setAccommodationData(editedData);
      alert("Accommodation updated successfully!");
    } catch(e){console.error(e);}
    finally{setIsLoading(false);}
  };
  const addPhoto = () => {
    if(!newPhotoUrl.trim()) return;
    setEditedData(prev => {
      const images = prev.Images ? [...prev.Images] : [];
      images.push(newPhotoUrl.trim());
      return {...prev,Images:images};
    });
    setNewPhotoUrl("");
  };
  const removePhoto = i => {
    setEditedData(prev => {
      const images = prev.Images ? [...prev.Images] : [];
      images.splice(i,1);
      return {...prev,Images:images};
    });
  };
  const TabSwitch = () => (
    <div className={styles.switch}>
      <button className={`${styles.switchButton} ${activeTab==="Details"?styles.active:""}`} onClick={()=>setActiveTab("Details")}>Details</button>
      <button className={`${styles.switchButton} ${activeTab==="Rules"?styles.active:""}`} onClick={()=>setActiveTab("Rules")}>Rules</button>
    </div>
  );
  const LeftPanel = () => {
    if(activeTab==="Details") {
      return(
        <>
          <button>
            <h4>🔴Complete required steps</h4>
            <p>Complete these final tasks to publish your listing and start getting bookings.</p>
          </button>
          <button onClick={()=>setSelectedSection("Photos")}>
            <h4>Photos</h4>
            <p>Add, remove, or edit photos of your accommodation.</p>
          </button>
          <button onClick={()=>setSelectedSection("Add a new room or space")}>
            <h4>Add a new room or space</h4>
            <p style={{display:"inline",marginRight:8}}>{accommodationData?.GuestAmount} guests</p>
            <p style={{display:"inline",marginRight:8}}>{accommodationData?.Bedrooms} bedrooms</p>
            <p style={{display:"inline"}}>{accommodationData?.Beds} beds</p>
          </button>
          <button onClick={()=>setSelectedSection("Title")}>
            <h4>Title</h4>
            <p>{accommodationData?.Title||"No title available"}</p>
          </button>
          <button onClick={()=>setSelectedSection("AccommodationType")}>
            <h4>Accommodation Type</h4>
            <p>{accommodationData?.AccommodationType||"No type available"}</p>
          </button>
        </>
      );
    }
    return(
      <>
        <button onClick={()=>setSelectedSection("Smoking")}>
          <h4>Smoking</h4>
          <p>{accommodationData?.AllowSmoking?"Allowed":"Not Allowed"}</p>
        </button>
        <button onClick={()=>setSelectedSection("Parties")}>
          <h4>Parties</h4>
          <p>{accommodationData?.AllowParties?"Allowed":"Not Allowed"}</p>
        </button>
        <button onClick={()=>setSelectedSection("Pets")}>
          <h4>Pets</h4>
          <p>{accommodationData?.AllowPets?"Allowed":"Not Allowed"}</p>
        </button>
        <button onClick={()=>setSelectedSection("CheckInOut")}>
          <h4>Check-in/out</h4>
          <p>{accommodationData?.CheckIn?`${accommodationData.CheckIn.From} - ${accommodationData.CheckIn.Til}`:"N/A"}</p>
          <p>{accommodationData?.CheckOut?`${accommodationData.CheckOut.From} - ${accommodationData.CheckOut.Til}`:"N/A"}</p>
        </button>
      </>
    );
  };
  const SectionEditor = () => {
    if(!selectedSection) return null;
    const decrement = field => handleChange(field,Math.max((editedData[field]||0)-1,0));
    const increment = field => handleChange(field,(editedData[field]||0)+1);
    return (
      <div className={styles.editBox}>
        <h2>Edit Information</h2>
        <p>{selectedSection}</p>
        {selectedSection==="Photos"&&(
          <div>
            <div className={styles.photosContainer}>
              {editedData?.Images&&editedData.Images.length>0?(
                editedData.Images.map((img,i)=>(
                  <div key={i} className={styles.photoWrapper}>
                    <img src={img} alt={`Photo ${i}`} className={styles.photo}/>
                    <button onClick={()=>removePhoto(i)} className={styles.deleteButton}>Delete</button>
                  </div>
                ))
              ):(<p>No photos available</p>)}
            </div>
            <div className={styles.addPhotoSection}>
              <input type="text" placeholder="Enter photo URL" value={newPhotoUrl} onChange={e=>setNewPhotoUrl(e.target.value)} className={styles.photoInput}/>
              <button onClick={addPhoto} className={styles.addPhotoButton}>Add Photo</button>
            </div>
          </div>
        )}
        {selectedSection==="Title"&&<input type="text" value={editedData?.Title||""} onChange={e=>handleChange("Title",e.target.value)}/>}
        {selectedSection==="AccommodationType"&&(
          <select value={editedData?.AccommodationType||""} onChange={e=>handleChange("AccommodationType",e.target.value)}>
            <option value="Apartment">Apartment</option>
            <option value="House">House</option>
            <option value="Vila">Vila</option>
            <option value="Boat">Boat</option>
            <option value="Camper">Camper</option>
            <option value="Cottage">Cottage</option>
          </select>
        )}
        {selectedSection==="Smoking"&&(
          <select value={editedData?.AllowSmoking?"Allowed":"Not Allowed"} onChange={e=>handleChange("AllowSmoking",e.target.value==="Allowed")}>
            <option value="Allowed">Allowed</option>
            <option value="Not Allowed">Not Allowed</option>
          </select>
        )}
        {selectedSection==="Parties"&&(
          <select value={editedData?.AllowParties?"Allowed":"Not Allowed"} onChange={e=>handleChange("AllowParties",e.target.value==="Allowed")}>
            <option value="Allowed">Allowed</option>
            <option value="Not Allowed">Not Allowed</option>
          </select>
        )}
        {selectedSection==="Pets"&&(
          <select value={editedData?.AllowPets?"Allowed":"Not Allowed"} onChange={e=>handleChange("AllowPets",e.target.value==="Allowed")}>
            <option value="Allowed">Allowed</option>
            <option value="Not Allowed">Not Allowed</option>
          </select>
        )}
        {selectedSection==="CheckInOut"&&(
          <div className={styles.checkInOutSection}>
            <div>
              <label>Check-in From:</label>
              <input type="time" value={editedData?.CheckIn?.From||""} onChange={e=>handleChange("CheckIn",{...editedData.CheckIn,From:e.target.value})}/>
            </div>
            <div>
              <label>Check-in Til:</label>
              <input type="time" value={editedData?.CheckIn?.Til||""} onChange={e=>handleChange("CheckIn",{...editedData.CheckIn,Til:e.target.value})}/>
            </div>
            <div>
              <label>Check-out From:</label>
              <input type="time" value={editedData?.CheckOut?.From||""} onChange={e=>handleChange("CheckOut",{...editedData.CheckOut,From:e.target.value})}/>
            </div>
            <div>
              <label>Check-out Til:</label>
              <input type="time" value={editedData?.CheckOut?.Til||""} onChange={e=>handleChange("CheckOut",{...editedData.CheckOut,Til:e.target.value})}/>
            </div>
          </div>
        )}
        {selectedSection==="Add a new room or space"&&(
          <div>
            <div>
              <label>Bedrooms:</label>
              <div style={{display:"inline-block",margin:"0 8px"}}>
                <button type="button" onClick={()=>decrement("Bedrooms")}>-</button>
                <span style={{margin:"0 8px"}}>{editedData?.Bedrooms||0}</span>
                <button type="button" onClick={()=>increment("Bedrooms")}>+</button>
              </div>
            </div>
            <div>
              <label>Beds:</label>
              <div style={{display:"inline-block",margin:"0 8px"}}>
                <button type="button" onClick={()=>decrement("Beds")}>-</button>
                <span style={{margin:"0 8px"}}>{editedData?.Beds||0}</span>
                <button type="button" onClick={()=>increment("Beds")}>+</button>
              </div>
            </div>
            <div>
              <label>Guests:</label>
              <div style={{display:"inline-block",margin:"0 8px"}}>
                <button type="button" onClick={()=>decrement("GuestAmount")}>-</button>
                <span style={{margin:"0 8px"}}>{editedData?.GuestAmount||0}</span>
                <button type="button" onClick={()=>increment("GuestAmount")}>+</button>
              </div>
            </div>
          </div>
        )}
        <button onClick={handleSave} className={styles.saveButton} disabled={isLoading}>{isLoading?"Saving...":"Save"}</button>
      </div>
    );
  };
  return(
    <div className={styles.container}>
      <div className={styles.sidebar}><Pages/></div>
      <main className={styles.content}>
        <div className={styles.propertyHeader}>
          <Back/>
          <h1>Property Editor</h1>
        </div>
        <div className={styles.mainSection}>
          <div className={styles.left}>
            <TabSwitch/>
            <LeftPanel/>
          </div>
          <div className={styles.right}>
            <SectionEditor/>
          </div>
        </div>
      </main>
    </div>
  );
}
