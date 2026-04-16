export function makeEmptyPreemptionDraft(defaultSpatZoneId = "") {
  return {
    name: "",
    sourceSpatZoneId: defaultSpatZoneId ? String(defaultSpatZoneId) : "",
    controllerIp: "",
    status: "active",
  };
}

export function draftFromPreemptionConfig(config) {
  return {
    name: config?.name || "",
    sourceSpatZoneId:
      config?.spatZoneId != null ? String(config.spatZoneId) : "",
    controllerIp: config?.controllerIp || "",
    status: config?.status || "active",
  };
}
