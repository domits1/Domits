import React from "react";
import './release.css'
import FAQ from "../landingpage/Faq";

function Release() {
    return (
        <main className="release">
            <article className="releasecontainer">
                <section className="releaseheader">
                   <h1>Release</h1>
              </section>
               <article className="releaseversion">
                 <h2>Release 1.0.0 - V 22.01.2024</h2>
                 <ul>
                      <li>Delete border strokes and replace with shadows (web and app)</li>
                      <li>Add "Travel Innovation Lab" into guest header (web)</li>
                      <li>Create a declining page after payment failed (web and app)</li>
                 </ul>
             </article>
             <article className="releaseversion">
                  <h2>Release 1.1.0 - V 26.01.2024</h2>
                </article>
                <div style={{ height: "500px" }}></div>
            </article>
        </main>


);
}

export default Release;