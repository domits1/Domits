import React from "react";
import { useParams } from "react-router-dom";
import PageNotFound from "../../../utils/error/404NotFound";
import WebsitePublicSitePage from "./WebsitePublicSitePage";
import { isSitePagePath } from "./rendering/websitePages";

export default function WebsiteLiveSiteRoute() {
  const { "*": sitePath = "" } = useParams();
  return isSitePagePath(sitePath) ? <WebsitePublicSitePage /> : <PageNotFound />;
}
