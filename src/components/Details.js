import React from "react";
import eventimg from '../images/landingpagebg.png';
import detailbigimg from './accobigimg.png';
import detailimg1 from './accoimg1.png';
import detailimg2 from './accoimg2.png';
import detailimg3 from './accoimg3.png';
import detailimg4 from './accoimg4.png';

const Details = () => {
    return ( 
        <div className="detailpage">
            <div className="topdetails">
                <button></button>
                <h2>Minimalistic and cozy place in Haarlem</h2>
                <ul>
                    <li>Domits verified host</li>
                    <li>Historical          </li>
                    <li>Arrival gift        </li>
                    <li>Classic interior    </li>
                    <li>Premium beds        </li>
                </ul>
            </div>

            <div className="imagesacco">
                <div className="bigimg">
                    <img src={detailbigimg} alt="detailbigimg"/>
                </div>
                <div className="sideimgtop">
                    <img src={detailimg1} alt="detailimg1"/>
                    <img src={detailimg2} alt="detailimg2"/>
                    <img src={detailimg3} alt="detailimg3"/>
                    <img src={detailimg4} alt="detailimg4"/>
                    <img src={detailimg4} alt="detailimg4"/>
                </div>
            </div>

            <div className="accodetails">
                <h2>Accommmodation details</h2>
                <h3 id="ondertitel">Rooms:</h3>
                {/* <img src={eventimg} alt="test"/> */}
                <div className="box1details">
                    <div id="boxheader"></div><h3>2 persons bedroom - double bed</h3>
                    <p>Free for families with kids under 16 years old</p>
                    <p>Always wanted to milk a goat? Drink the freshest milk you ever drank? Timo is welcoming visitors for over 5 years. 
                    At his farm you will be given a tour, feed the animals and talk about his goats the entire time!</p>
                </div>
                <div className="box2details">
                    <div id="boxheader"><h3>Living room - sleeping couch</h3> </div>
                    <p>$35 p.p including Segway rent </p>
                    <p>Tour through the beautiful historical streets of Haarlem together with Mohammed, a Segway master.
                    A safe, relaxing and fun drive for small groups. </p>
                </div>
                <h4>House and room rules</h4>
            </div>

            <br />
            <br />

            <div className="events">
                <h2>The Netherlands, Haarlem</h2>
                <h3 id="ondertitel">Things to do closeby:</h3>
                <div className="box1details">
                    <h3>Goat milking at Timo's farm</h3>
                    <p>Free for families with kids under 16 years old</p>
                    <p>Always wanted to milk a goat? Drink the freshest milk you ever drank? Timo is welcoming visitors for over 5 years. 
                    At his farm you will be given a tour, feed the animals and talk about his goats the entire time!</p>
                    <img src="https://s3-alpha-sig.figma.com/img/b7dd/f018/e3bf0987b1f03b3abb9786fe4e70a0b5?Expires=1704067200&Signature=TmePPv8yQL9BGjWNSlhTA5J4GdtZnTqoXt6BVHSt5ObnwcOPPY94e9sAvPssPjddgTpr6uwpMP~FA1nzMFtgQjGB0d9FvHFHVmScPezboBDHA5nFUYTozU7KctJi2wRHrfonydexafv4NGSAk3XcJmh74WYBD2UhnLm2GJWIBdx6TVJEfKTs3aAuyeWbz8MgIq6Rtv2FxI5tYohIPOIDTSn2lKIJQjEhngOJjnq0Z8xdqossXZc-phDKlPGz6aMbLxg5L0MnvJYJ08ZODzOSt82bYHGmXWzuM4x7IC~i48nM4p1JjmryPGKuo2qqX8MXwIZ9ZUID8Lr9IJ-i0O69-Q__&Key-Pair-Id=APKAQ4GOSFWCVNEHN3O4" alt="goated" />
                </div>
                
                <div className="box2details">
                    <h3>Segway tour through Haarlem</h3>
                    <p>$35 p.p including Segway rent</p>
                    <p>Tour through the beautiful historical streets of Haarlem together with Mohammed, a Segway master.
                    A safe, relaxing and fun drive for small groups. </p>
                </div>
                <h4>More things to do</h4>
            </div>

            <br />
            <br />

            <div className="reviews">
                <h2>Reviews</h2>
                <div className="reviewbox1">
                    <h3 id="reviewscore1">Clint Eastwood<p>5,00</p></h3>
                    <p>Stefan, the host, is a good host. He is kind and also offers free fruit.
                       The mornings in the office are a bit chilly though.</p>
                </div>
                <div className="reviewbox1">
                     <h3 id="reviewscore2">East Clintwood <p>4,50</p></h3>
                    <p>Such a beautiful location. Much green and a nice park nearby.
                       Good location for conveniences close by.</p>
                </div>
                <div className="reviewbox1">
                    <h3 id="reviewscore1">Clint Eastwood<p>5,00</p></h3>
                    <p>Stefan, the host, is a good host. He is kind and also offers free fruit.
                       The mornings in the office are a bit chilly though.</p>
                </div>
                <div className="reviewbox1">
                    <h3 id="reviewscore2">East Clintwood<p>4,50</p></h3>
                    <p>Such a beautiful location. Much green and a nice park nearby. 
                       Good location for conveniences close by.</p>
                </div>
                <h4>More reviews</h4>
            </div>
        </div>
     );
}
 
export default Details;