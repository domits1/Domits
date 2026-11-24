// The first check of every Distribution route (design note section 6, #506): the listing exists and
// belongs to the signed-in host. Not found comes before not owned only for a listing that does not
// exist at all, so a stranger learns nothing else about someone else's listing.
const bad = (statusCode, response) => ({ statusCode, response });

export const refuseUnlessHostListing = (listing, userId) => {
  if (!listing) return bad(404, { error: "Listing not found.", errorCode: "DISTRIBUTION_LISTING_NOT_FOUND" });
  if (listing.hostId !== userId) {
    return bad(403, { error: "This listing belongs to another host.", errorCode: "DISTRIBUTION_LISTING_NOT_OWNED" });
  }
  return null;
};
