import React from "react";
import"./details.css";
import detailbigimg from '../../images/accobigimg.png';
import detailimg1 from '../../images/accoimg1.png';
import detailimg2 from '../../images/accoimg2.png';
import accomap from '../../images/accomap.png';
import detailimg3 from '../../images/accoimg3.png';
import detailimg4 from '../../images/accoimg4.png';
import adultroom from '../../images/adultacco.png';
import teenroom from '../../images/teenacco.jpg';
import kidroom from '../../images/kidacco.jpg';
import back from '../../images/arrowleft.png';
import { Link } from "react-router-dom";
import telescope from "../../images/telescope.png";
import tv from "../../images/tv.png";
import sauna from "../../images/thermometer.png";
import vault from "../../images/vault.png";
import wifi from "../../images/wifi.png";
import gift from "../../images/gift.png";
import light from "../../images/light.png";
import goated from "../../images/goated.jpg"
import bookarrow from "../../images/whitearrow.png"


const hostEmail = "nabilsalimi0229@gmail.com";

const Details = () => {

    const handleClick = () => {
        history.push(`/guestdashboard/chatprototype?recipient=${hostEmail}`);
      };

    return (
        <div className="detailpage">
            <div className="topdetails">
                <Link to="/home">
                    <button>
                        <img src={back} alt="backarrow" />Back
                    </button>
                </Link>
                <h2>Minimalistic and cozy place in Haarlem</h2>
            </div>

            <div className="booking">
                <div className="bookh2">
                    <h2>Check in</h2>
                    <h2>Check out</h2>
                </div>
                <div className="checkinp">
                    <p>15 december 2023</p>
                    <p>23 december 2023</p>
                </div>
                <div className="bookh2">
                    <h2>Guests</h2>
                    <h2>Pets</h2>
                </div>
                <div className="guests">
                    <p>2 adults</p>
                    <p> 2 kids</p>
                    <div className="pets">
                        <p>Select...</p>
                    </div>

                </div>
               
                <div className="email">
                    <Link to={`/guestdashboard/chatprototype?recipient=${hostEmail}`}>
                    <img src={wifi} alt="" />
                    </Link>
                </div>
                <button>Book* <img id="buttonimg" src={bookarrow} alt="" /></button>
                <p id="footbutton">*You wont be charged yet</p>
                <hr />
                <div className="bookh2">
                    <p>7 nights x $1400 a night</p>
                    <p>$98,-</p>
                </div>
                <div className="bookh2">
                    <p>Season booking discount</p>
                    <p>-$75,-</p>
                </div>
                <div className="bookh2">
                    <p>Cleaning fee</p>
                    <p>$100</p>
                </div>
                <div className="bookh2">
                    <p>Domits service fee</p>
                    <p>$98</p>
                </div>
                <div  className="bookh2">
                    <h2>Total</h2>
                    <h2>$9923</h2>
                </div>
            </div>

            <div className="imagesacco">
                <div className="bigimg">
                    <img src={detailbigimg} alt="detailbigimg" />
                </div>
                <div className="sideimg">
                    <img src={detailimg1} alt="detailimg1" />
                    <img src={accomap} alt="detailimg2" id="toprightimg" />
                    <img src={detailimg3} alt="detailimg3" />
                    <img src={detailimg4} alt="detailimg4" id="darkimg"/>
                </div>
            </div>
            <div className="roominfo">
                <h2>$1400 night</h2>
                <p>8 guests - 8 beds - 4 bedrooms - 4 bathrooms</p>
            </div>
            <div className="roomdetails">
                <h1>Accommodation details</h1>
                <h2 id="ondertitelroom">Rooms</h2>
                <div className="roomcards">
                    <div className="roomcard1">
                        <h3>2 person bedroom</h3>
                        <h3>Double bed</h3>
                        <p>Enjoy the double bed and sleep like a king!</p>
                        <img src={adultroom} alt="adultroom" />
                    </div>
                    <div className="roomcard">
                        <h3>Teenagers room</h3>
                        <h3>Bunker bed</h3>
                        <p>A room with a bunker bed for your teenagers</p>
                        <img src={teenroom} alt="teenroom" />
                    </div>
                    <div className="roomcard2">
                        <h3>Kids themed room</h3>
                        <h3>2 single beds</h3>
                        <p>2 single kids themed beds with a nice vibe</p>
                        <img src={kidroom} alt="kidroom" />
                    </div>
                </div>
            </div>
            <br />
            <br />
            <div className="icons">
                <h2>This place offers the following</h2>
                <div className="iconcards">
                    <div className="iconcard">
                        <img src={tv} alt="" />
                        <p>Smart TV</p>
                    </div>
                    <div className="iconcard">
                        <img src={sauna} alt="" />
                        <p>Sauna</p>
                    </div>
                    <div className="iconcard">
                        <img src={vault} alt="" />
                        <p>Vault</p>
                    </div>
                    <div className="iconcard">
                        <img src={gift} alt="" />
                        <p>Welcome gift</p>
                    </div>
                    <div className="iconcard">
                        <img src={light} alt="" />
                        <p>Dimmable lights</p>
                    </div>
                    <div className="iconcard">
                        <img src={telescope} alt="" />
                        <p>Telescope</p>
                    </div>
                    <div className="iconcard">
                        <img src={wifi} alt="" />
                        <p>Super fast WiFi</p>
                    </div>
                </div>

            </div>
            <br />
            <br />
            <div className="reviews">
                <h2>Reviews</h2>
                <div className="reviewbox1">
                    <h3 id="reviewscore">Clint Eastwood<p>5,00</p></h3>
                    <p>Stayed from: 27/11/’23 - 03/12/’23</p>
                    <p>Mr. Homer, the host, is a good host. He is kind and also offers free fruit.
                        The mornings in the office are a bit chilly though.</p>
                </div>
                <div className="reviewbox1">
                    <h3 id="reviewscore">East Clintwood <p>4,50</p></h3>
                    <p>Stayed from: 27/11/’23 - 03/12/’23</p>
                    <p>Such a beautiful location. Much green and a nice park nearby.
                        Good location for conveniences close by.</p>
                </div>
                <div className="reviewbox1">
                    <h3 id="reviewscore">Clint Eastwood<p>5,00</p></h3>
                    <p>Stayed from: 27/11/’23 - 03/12/’23</p>
                    <p>Mr. Homer, the host, is a good host. He is kind and also offers free fruit.
                        The mornings in the office are a bit chilly though.</p>
                </div>
                <h4>Show more</h4>
            </div>

            <div className="events">
                <h2>The Netherlands, Haarlem</h2>
                <h3 id="ondertitel">Things to do closeby:</h3>
                <div className="boxdetails">
                    <h3>Goat milking at Timo's farm</h3>
                    <p>Always wanted to milk a goat? Drink the freshest milk you ever drank? Timo is welcoming visitors for over 5 years.
                        At his farm you will be given a tour, feed the animals and talk about his goats the entire time!</p>
                     <img src={goated} alt="goat" />
                gi    <h4>More info</h4>
                </div>
            </div>
        </div>
    );
}
export default Details;
export { hostEmail };