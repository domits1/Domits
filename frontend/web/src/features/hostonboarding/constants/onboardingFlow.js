export const ACCOMMODATION_TYPES = ["Villa", "House", "Apartment", "Cottage"]

export const FLOW_KEYS = {
  accommodation: "accommodation",
  boat: "boat",
  camper: "camper",
}

export const ONBOARDING_FLOW_STEPS = {
  [FLOW_KEYS.accommodation]: [
    { id: "type", path: "/hostonboarding" },
    { id: "access", path: "/hostonboarding/accommodation" },
    { id: "address", path: "/hostonboarding/accommodation/address" },
    { id: "capacity", path: "/hostonboarding/accommodation/capacity" },
    { id: "amenities", path: "/hostonboarding/accommodation/amenities" },
    { id: "rules", path: "/hostonboarding/accommodation/rules" },
    { id: "photos", path: "/hostonboarding/accommodation/photos" },
    { id: "title", path: "/hostonboarding/accommodation/title" },
    { id: "pricing", path: "/hostonboarding/accommodation/pricing" },
    { id: "availability", path: "/hostonboarding/accommodation/availability" },
    { id: "registration", path: "/hostonboarding/legal/registrationnumber" },
    { id: "summary", path: "/hostonboarding/summary" },
  ],
  [FLOW_KEYS.boat]: [
    { id: "type", path: "/hostonboarding" },
    { id: "boatType", path: "/hostonboarding/boat" },
    { id: "address", path: "/hostonboarding/boat/address" },
    { id: "capacity", path: "/hostonboarding/boat/capacity" },
    { id: "amenities", path: "/hostonboarding/boat/amenities" },
    { id: "rules", path: "/hostonboarding/boat/rules" },
    { id: "photos", path: "/hostonboarding/boat/photos" },
    { id: "title", path: "/hostonboarding/boat/title" },
    { id: "description", path: "/hostonboarding/boat/description" },
    { id: "pricing", path: "/hostonboarding/boat/pricing" },
    { id: "availability", path: "/hostonboarding/boat/availability" },
    { id: "summary", path: "/hostonboarding/summary" },
  ],
  [FLOW_KEYS.camper]: [
    { id: "type", path: "/hostonboarding" },
    { id: "camperType", path: "/hostonboarding/camper" },
    { id: "address", path: "/hostonboarding/camper/address" },
    { id: "capacity", path: "/hostonboarding/camper/capacity" },
    { id: "amenities", path: "/hostonboarding/camper/amenities" },
    { id: "rules", path: "/hostonboarding/camper/rules" },
    { id: "photos", path: "/hostonboarding/camper/photos" },
    { id: "title", path: "/hostonboarding/camper/title" },
    { id: "description", path: "/hostonboarding/camper/description" },
    { id: "pricing", path: "/hostonboarding/camper/pricing" },
    { id: "availability", path: "/hostonboarding/camper/availability" },
    { id: "summary", path: "/hostonboarding/summary" },
  ],
}

export const normalizeOnboardingPath = (pathname = "") => {
  const withoutHost = pathname.startsWith("/hostdashboard")
    ? pathname.replace("/hostdashboard", "")
    : pathname
  const trimmed = withoutHost.endsWith("/") && withoutHost !== "/"
    ? withoutHost.slice(0, -1)
    : withoutHost
  return trimmed || "/"
}

export const getFlowKeyFromType = (type) => {
  if (type === "Boat") return FLOW_KEYS.boat
  if (type === "Camper") return FLOW_KEYS.camper
  if (ACCOMMODATION_TYPES.includes(type)) return FLOW_KEYS.accommodation
  return FLOW_KEYS.accommodation
}

export const getFlowKeyFromPath = (pathname, selectedType) => {
  const path = normalizeOnboardingPath(pathname)
  if (path.startsWith("/hostonboarding/boat")) return FLOW_KEYS.boat
  if (path.startsWith("/hostonboarding/camper")) return FLOW_KEYS.camper
  if (path.startsWith("/hostonboarding/accommodation")) return FLOW_KEYS.accommodation
  if (path.startsWith("/hostonboarding/legal")) return FLOW_KEYS.accommodation
  if (path.startsWith("/hostonboarding/summary")) return getFlowKeyFromType(selectedType)
  if (path === "/hostonboarding") return getFlowKeyFromType(selectedType)
  return getFlowKeyFromType(selectedType)
}

export const findStepIndex = (steps, pathname, flowKey) => {
  const currentPath = normalizeOnboardingPath(pathname)
  const directIndex = steps.findIndex(
    (step) => normalizeOnboardingPath(step.path) === currentPath
  )
  if (directIndex !== -1) return directIndex

  const flowBase = `/hostonboarding/${flowKey}`
  const fallbackIndex = steps.findIndex((step) => {
    const stepPath = normalizeOnboardingPath(step.path)
    if (stepPath === "/hostonboarding") return currentPath === "/hostonboarding"
    if (stepPath.startsWith(flowBase)) {
      const suffix = stepPath.slice(flowBase.length)
      if (!suffix) return currentPath.startsWith(flowBase)
      return currentPath.endsWith(suffix)
    }
    return currentPath.endsWith(stepPath)
  })

  return fallbackIndex
}
