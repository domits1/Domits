import React from "react";
import { render, screen } from "@testing-library/react";
import { WebsiteEditorActionMenu } from "../editor/WebsiteEditorStates";

const renderActionMenu = (overrides = {}) =>
  render(
    <WebsiteEditorActionMenu
      actionMenuRef={{ current: null }}
      isActionMenuOpen
      toggleActionMenu={jest.fn()}
      hasLiveSite
      primarySiteDomain={{ domain: "cliff-house.domits.com" }}
      openLiveWebsiteLink={jest.fn()}
      updateLiveSiteChanges={jest.fn()}
      isMutatingDraft={false}
      hasLiveSyncPending={false}
      canUpdateLiveSite={false}
      isUpdatingLiveSite={false}
      publishLiveSite={jest.fn()}
      canPublishSite={false}
      isPublishingSite={false}
      unpublishLiveSite={jest.fn()}
      canUnpublishSite
      isUnpublishingSite={false}
      discardDraftChanges={jest.fn()}
      isDiscardingChanges={false}
      {...overrides}
    />
  );

describe("WebsiteEditorActionMenu", () => {
  it("enables only the live site update when the listing is stale without editor changes", () => {
    renderActionMenu({ hasLiveSyncPending: false, canUpdateLiveSite: true });

    expect(screen.getByRole("menuitem", { name: "Update live site" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Discard all changes" })).toBeDisabled();
  });
});
