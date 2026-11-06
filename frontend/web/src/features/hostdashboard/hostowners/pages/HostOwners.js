import React, { useCallback, useContext, useEffect, useState } from "react";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import { listOwners } from "../services/ownerService";
import OwnersTable from "../components/OwnersTable";
import "../styles/HostOwners.scss";

const contentByLanguage = { en, nl, de, es };
const DEFAULT_LANGUAGE = "en";
const TITLE_ID = "host-owners-title";
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;
const ARCHIVED_STATUS = "archived";

const resolveLanguage = (language) => (contentByLanguage[language]?.hostOwners ? language : DEFAULT_LANGUAGE);

const errorTextFor = (error, t) => {
  if (error?.status === STATUS_UNAUTHORIZED) {
    return t.errorSignedOut;
  }
  if (error?.status === STATUS_FORBIDDEN) {
    return t.errorForbidden;
  }
  return t.errorGeneric;
};

const HostOwners = () => {
  const { language } = useContext(LanguageContext);
  const activeLanguage = resolveLanguage(language);
  const t = contentByLanguage[activeLanguage].hostOwners;

  const [loadState, setLoadState] = useState({ status: "loading" });
  const [showArchived, setShowArchived] = useState(false);
  const loadOwners = useCallback(async () => {
    setLoadState({ status: "loading" });
    try {
      const owners = await listOwners();
      setLoadState(Array.isArray(owners) ? { status: "ready", owners } : { status: "error", error: null });
    } catch (error) {
      setLoadState({ status: "error", error });
    }
  }, []);

  useEffect(() => {
    void loadOwners();
  }, [loadOwners]);

  const renderContent = () => {
    if (loadState.status === "loading") {
      return <PulseBarsLoader message={t.loading} />;
    }

    if (loadState.status === "error") {
      return (
        <div className="host-owners-message" role="alert">
          <p>{errorTextFor(loadState.error, t)}</p>
          <button type="button" className="host-owners-button" onClick={loadOwners}>
            {t.retry}
          </button>
        </div>
      );
    }

    const { owners } = loadState;
    if (owners.length === 0) {
      return (
        <div className="host-owners-message">
          <p>{t.empty}</p>
        </div>
      );
    }

    const visibleOwners = showArchived ? owners : owners.filter((owner) => owner.status !== ARCHIVED_STATUS);

    return (
      <>
        <label className="host-owners-toggle">
          <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
          <span>{t.showArchived}</span>
        </label>
        {visibleOwners.length === 0 ? (
          <div className="host-owners-message">
            <p>{t.allArchived}</p>
          </div>
        ) : (
          <div className="host-owners-card">
            <OwnersTable owners={visibleOwners} t={t} language={activeLanguage} labelledBy={TITLE_ID} />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="page-body host-owners">
      <h2 id={TITLE_ID} className="host-owners-title">
        {t.title}
      </h2>
      {renderContent()}
    </div>
  );
};

export default HostOwners;
