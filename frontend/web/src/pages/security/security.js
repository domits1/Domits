import React from "react";
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  MapPin,
  Server,
  Shield,
  CloudUpload,
  CheckCircle,
  Settings,
  Headphones,
} from "lucide-react";

const ICON_SIZE = 28;

const BADGES = [
  { Icon: ShieldCheck, title: "Secure Infrastructure", subtitle: "Reliable & monitored" },
  { Icon: Lock,        title: "Encrypted Data",        subtitle: "End-to-end protection" },
  { Icon: RefreshCw,   title: "Daily Backups",          subtitle: "Always protected" },
  { Icon: MapPin,      title: "EU Hosted",              subtitle: "GDPR complied" },
];

const SECTIONS = [
  {
    Icon: Server,
    title: "1. Infrastructure",
    description:
      "Our servers are securely housed in multiple European data centers. In the event of any malfunctions, technicians are always available to tackle the problem immediately. Amazon Web Services' online infrastructure guarantees the security and confidentiality of our cloud services.",
    bullets: [
      "Our data is stored in two different data centers.",
      "In the event of malfunctions, Domits automatically switches to another data center.",
      "An uptime of 99.995%.",
    ],
  },
  {
    Icon: Shield,
    title: "2. Theft and Privacy",
    description:
      "Domits is fully committed to ensuring that your data is safe and protected from hackers. Each customer has their own, separate database at Domits, making it impossible for other users to access other people's data.",
    bullets: [
      "When using Domits, the connection is secured.",
      "GDPR compliant data handling and storage",
      "It is impossible for outsiders to intercept data traffic.",
    ],
  },
  {
    Icon: CloudUpload,
    title: "3. Back-ups",
    description:
      "At Domits, we do everything we can to ensure that our system is always operational and your data is always secured. Backups of the data are made daily so that nothing is ever lost. In the event of disruptions, all your data is stored securely and our team ensures that your account can be restored.",
    bullets: [
      "Guarantee against data loss",
      "Daily recovery of data up to six months ago",
      "Secure data backups",
    ],
  },
];

const FACTS = [
  {
    Icon: CheckCircle,
    title: "Vision",
    text: "We believe that everyone deserves transparent and accessible security. Our vision is to create a digital environment where users can trust that their data is protected without needing to understand complex technical details.",
  },
  {
    Icon: Settings,
    title: "What We Do",
    text: "We continuously monitor, update, and improve our security infrastructure. Our dedicated team works around the clock to identify potential threats, implement the latest security standards, and ensure your data remains protected at all times.",
  },
];

function Security() {
  return (
    <div className="security">
      <div className="security__hero">
        <span className="security__label">SECURITY</span>
        <h1 className="security__title">
          Your safety comes <span className="security__title--accent">first.</span>
        </h1>
      </div>

      <div className="security__badges">
        {BADGES.map(({ Icon, title, subtitle }) => (
          <div className="security__badge" key={title}>
            <div className="security__badge-icon">
              <Icon size={ICON_SIZE} />
            </div>
            <div>
              <p className="security__badge-title">{title}</p>
              <p className="security__badge-subtitle">{subtitle}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="security__sections">
        {SECTIONS.map(({ Icon, title, description, bullets }) => (
          <div className="security__section-card" key={title}>
            <div className="security__section-icon">
              <Icon size={ICON_SIZE} />
            </div>
            <div className="security__section-content">
              <h2 className="security__section-title">{title}</h2>
              <p className="security__section-description">{description}</p>
              <ul className="security__section-list">
                {bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="security__factsbox">
        {FACTS.map(({ Icon, title, text }) => (
          <div className="security__fact" key={title}>
            <div className="security__fact-icon">
              <Icon size={ICON_SIZE} />
            </div>
            <p className="security__fact-title">{title}</p>
            <p className="security__fact-text">{text}</p>
          </div>
        ))}
      </div>

      <div className="security__cta">
        <div className="security__cta-left">
          <div className="security__cta-icon">
            <Headphones size={ICON_SIZE} />
          </div>
          <h3 className="security__cta-title">Questions about security?</h3>
        </div>
        <div className="security__cta-buttons">
          <a href="/contact" className="security__cta-btn security__cta-btn--outline">Contact support</a>
          <a href="/how-it-works" className="security__cta-btn security__cta-btn--filled">Learn more</a>
        </div>
      </div>
    </div>
  );
}

export default Security;
