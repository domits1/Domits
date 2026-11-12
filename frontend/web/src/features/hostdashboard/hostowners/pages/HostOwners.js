import React, { useCallback, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { LanguageContext } from "../../../../context/LanguageContext";
import { listOwners } from "../services/ownerService";
import OwnersTable from "../components/OwnersTable";
import OwnerFormModal from "../components/OwnerFormModal";
import { resolveOwnerContent } from "../utils/ownerContent";
import { ARCHIVED_OWNER_STATUS } from "../utils/ownerFormRules";
import { canRetryLoad, fillTemplate, loadErrorText, ownerName } from "../utils/ownerText";
import "../styles/HostOwners.scss";

const TITLE_ID = "host-owners-title";

const upsertOwner = (owners, saved) =>
  owners.some((owner) => owner.id === saved.id)
    ? owners.map((owner) => (owner.id === saved.id ? saved : owner))
    : [...owners, saved];

const HostOwners = () => {
  const { language } = useContext(LanguageContext);
  const { activeLanguage, t } = resolveOwnerContent(language);

  const [loadState, setLoadState] = useState({ status: "loading" });
  const [showArchived, setShowArchived] = useState(false);
  const [editor, setEditor] = useState(null);

  const closeEditor = useCallback(() => setEditor(null), []);

  const handleSaved = (saved) => {
    const template = editor?.owner ? t.form.updatedToast : t.form.createdToast;
    setLoadState((previous) =>
      previous.status === "ready" ? { ...previous, owners: upsertOwner(previous.owners, saved) } : previous
    );
    setEditor(null);
    toast.success(fillTemplate(template, { name: ownerName(saved) }));
  };

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
          <p>{loadErrorText(loadState.error, t)}</p>
          {canRetryLoad(loadState.error) ? (
            <button type="button" className="host-owners-button" onClick={loadOwners}>
              {t.retry}
            </button>
          ) : null}
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

    const visibleOwners = showArchived ? owners : owners.filter((owner) => owner.status !== ARCHIVED_OWNER_STATUS);

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
            <OwnersTable
              owners={visibleOwners}
              t={t}
              language={activeLanguage}
              labelledBy={TITLE_ID}
              onEdit={(owner) => setEditor({ owner })}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="page-body host-owners">
      <div className="host-owners-header">
        <h2 id={TITLE_ID} className="host-owners-title">
          {t.title}
        </h2>
        {loadState.status === "ready" ? (
          <button type="button" className="host-owners-button" onClick={() => setEditor({ owner: null })}>
            {t.addOwner}
          </button>
        ) : null}
      </div>
      {renderContent()}
      {editor ? <OwnerFormModal owner={editor.owner} t={t} onClose={closeEditor} onSaved={handleSaved} /> : null}
    </div>
  );
};

export default HostOwners;
