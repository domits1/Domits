import React from 'react';
import './datasafety.css';

function Datasafety() {
  return (
    <div className="datasafety">
      <h1 className="datasafety__header">Data Safety</h1>
      <div className="datasafety__section">
        <h2 className="datasafety__section-header">1. Infrastructure</h2>
        <p className="datasafety__section-paragraph">Our servers are securely housed in multiple European data centers. In the event of any malfunctions, technicians are always available to tackle the problem immediately. Amazon Web Services' online infrastructure guarantees the security and confidentiality of our cloud services. Learn more about AWS cloud infrastructure security.</p>
        <ul className="datasafety__section-list">
          <li className="datasafety__section-list-item">Our data is stored in two different data centers.</li>
          <li className="datasafety__section-list-item">In the event of malfunctions, Domits automatically switches to another data center.</li>
          <li className="datasafety__section-list-item">An uptime of 99.995%.</li>
        </ul>
      </div>
      <div className="datasafety__section">
        <h2 className="datasafety__section-header">2. Theft and privacy</h2>
        <p className="datasafety__section-paragraph">Domits is fully committed to ensuring that your data is safe and protected from hackers. Each customer has their own, separate database at Domits, making it impossible for other users to access other people's data.</p>
        <ul className="datasafety__section-list">
          <li className="datasafety__section-list-item">When using Domits the connection is secured.</li>
          <li className="datasafety__section-list-item">It is impossible for outsiders to intercept data traffic.</li>
        </ul>
      </div>
      <div className="datasafety__section">
        <h2 className="datasafety__section-header">3. Back-ups</h2>
        <p className="datasafety__section-paragraph">At Domits we do everything we can to ensure that our system is always operational and your data is always secured. Backups of the data are made daily so that nothing is ever lost. In the event of disruptions, all your data is stored securely and our team ensures that your account can be restored.</p>
        <ul className="datasafety__section-list">
          <li className="datasafety__section-list-item">Guarantee against data loss</li>
          <li className="datasafety__section-list-item">Daily recovery of data up to six months ago</li>
          <li className="datasafety__section-list-item">Secure data backups</li>
        </ul>
      </div>
    </div>
  );
}

export default Datasafety;
