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
        <main className="detailpage">
            <article className="topdetails">
                <Link to="/home">
                    <button>
                        <img src={back} alt="backarrow" />Back
                    </button>
                </Link>
                <h2>Minimalistic and cozy place in Haarlem</h2>
            </article>

            <section className="booking">
                <article className="bookh2">
                    <h2>Check in</h2>
                    <h2>Check out</h2>
                </article>
                <article className="checkinp">
                    <p>15 december 2023</p>
                    <p>23 december 2023</p>
                </article>
                <article className="bookh2">
                    <h2>Guests</h2>
                    <h2>Pets</h2>
                </article>
                <article className="guests">
                    <p>2 adults</p>
                    <p> 2 kids</p>
                    <article className="pets">
                        <p>Select...</p>
                    </article>

                </article>
               
                <article className="email">
                    <Link to={`/guestdashboard/chatprototype?recipient=${hostEmail}`}>
                    <img src={wifi} alt="" />
                    </Link>
                </article>
                <button>Book* <img id="buttonimg" src={bookarrow} alt="" /></button>
                <p id="footbutton">*You wont be charged yet</p>
                <hr />
                <article className="bookh2">
                    <p>7 nights x $1400 a night</p>
                    <p>$98,-</p>
                </article>
                <article className="bookh2">
                    <p>Season booking discount</p>
                    <p>-$75,-</p>
                </article>
                <article className="bookh2">
                    <p>Cleaning fee</p>
                    <p>$100</p>
                </article>
                <article className="bookh2">
                    <p>Domits service fee</p>
                    <p>$98</p>
                </article>
                <article  className="bookh2">
                    <h2>Total</h2>
                    <h2>$9923</h2>
                </article>
            </section>

            <article className="imagesacco">
                <article className="bigimg">
                    <img src={detailbigimg} alt="detailbigimg" />
                </article>
                <article className="sideimg">
                    <img src={detailimg1} alt="detailimg1" />
                    <img src={accomap} alt="detailimg2" id="toprightimg" />
                    <img src={detailimg3} alt="detailimg3" />
                    <img src={detailimg4} alt="detailimg4" id="darkimg"/>
                </article>
            </article>
            <article className="roominfo">
                <h2>$1400 night</h2>
                <p>8 guests - 8 beds - 4 bedrooms - 4 bathrooms</p>
            </article>
            <section className="roomdetails">
                <h1>Accommodation details</h1>
                <h2 id="ondertitelroom">Rooms</h2>
                <article className="roomcards">
                    <article className="roomcard1">
                        <h3>2 person bedroom</h3>
                        <h3>Double bed</h3>
                        <p>Enjoy the double bed and sleep like a king!</p>
                        <img src={adultroom} alt="adultroom" />
                    </article>
                    <article className="roomcard">
                        <h3>Teenagers room</h3>
                        <h3>Bunker bed</h3>
                        <p>A room with a bunker bed for your teenagers</p>
                        <img src={teenroom} alt="teenroom" />
                    </article>
                    <article className="roomcard2">
                        <h3>Kids themed room</h3>
                        <h3>2 single beds</h3>
                        <p>2 single kids themed beds with a nice vibe</p>
                        <img src={kidroom} alt="kidroom" />
                    </article>
                </article>
            </section>
            <br />
            <br />
            <section className="icons">
                <h2>This place offers the following</h2>
                <article className="iconcards">
                    <article className="iconcard">
                        <img src={tv} alt="" />
                        <p>Smart TV</p>
                    </article>
                    <article className="iconcard">
                        <img src={sauna} alt="" />
                        <p>Sauna</p>
                    </article>
                    <article className="iconcard">
                        <img src={vault} alt="" />
                        <p>Vault</p>
                    </article>
                    <article className="iconcard">
                        <img src={gift} alt="" />
                        <p>Welcome gift</p>
                    </article>
                    <article className="iconcard">
                        <img src={light} alt="" />
                        <p>Dimmable lights</p>
                    </article>
                    <article className="iconcard">
                        <img src={telescope} alt="" />
                        <p>Telescope</p>
                    </article>
                    <article className="iconcard">
                        <img src={wifi} alt="" />
                        <p>Super fast WiFi</p>
                    </article>
                </article>

            </section>
            <br />
            <br />
            <section className="reviews">
                <h2>Reviews</h2>
                <article className="reviewbox1">
                    <h3 id="reviewscore">Clint Eastwood<p>5,00</p></h3>
                    <p>Stayed from: 27/11/’23 - 03/12/’23</p>
                    <p>Mr. Homer, the host, is a good host. He is kind and also offers free fruit.
                        The mornings in the office are a bit chilly though.</p>
                </article>
                <article className="reviewbox1">
                    <h3 id="reviewscore">East Clintwood <p>4,50</p></h3>
                    <p>Stayed from: 27/11/’23 - 03/12/’23</p>
                    <p>Such a beautiful location. Much green and a nice park nearby.
                        Good location for conveniences close by.</p>
                </article>
                <article className="reviewbox1">
                    <h3 id="reviewscore">Clint Eastwood<p>5,00</p></h3>
                    <p>Stayed from: 27/11/’23 - 03/12/’23</p>
                    <p>Mr. Homer, the host, is a good host. He is kind and also offers free fruit.
                        The mornings in the office are a bit chilly though.</p>
                </article>
                <h4>Show more</h4>
            </section>

            <article className="events">
                <h2>The Netherlands, Haarlem</h2>
                <h3 id="ondertitel">Things to do closeby:</h3>
                <article className="boxdetails">
                    <h3>Goat milking at Timo's farm</h3>
                    <p>Always wanted to milk a goat? Drink the freshest milk you ever drank? Timo is welcoming visitors for over 5 years.
                        At his farm you will be given a tour, feed the animals and talk about his goats the entire time!</p>
                     <img src={goated} alt="goat" />
                gi    <h4>More info</h4>
                </article>
            </article>
        </main>
    );
}
export default Details;
export { hostEmail };