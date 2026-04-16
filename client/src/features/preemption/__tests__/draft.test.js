import {
  makeEmptyPreemptionDraft,
  draftFromPreemptionConfig,
} from "../draft";

describe("makeEmptyPreemptionDraft", () => {
  test("returns a blank draft when no default id is given", () => {
    expect(makeEmptyPreemptionDraft()).toEqual({
      name: "",
      sourceSpatZoneId: "",
      controllerIp: "",
      status: "active",
    });
  });

  test("coerces the default SPaT zone id to a string", () => {
    expect(makeEmptyPreemptionDraft(42)).toEqual({
      name: "",
      sourceSpatZoneId: "42",
      controllerIp: "",
      status: "active",
    });
  });

  test("treats empty string and 0 as no default", () => {
    expect(makeEmptyPreemptionDraft("").sourceSpatZoneId).toBe("");
    expect(makeEmptyPreemptionDraft(0).sourceSpatZoneId).toBe("");
  });
});

describe("draftFromPreemptionConfig", () => {
  test("maps all config fields into the draft shape", () => {
    expect(
      draftFromPreemptionConfig({
        name: "MLK Fire Route",
        spatZoneId: 7,
        controllerIp: "10.0.0.1",
        status: "inactive",
      }),
    ).toEqual({
      name: "MLK Fire Route",
      sourceSpatZoneId: "7",
      controllerIp: "10.0.0.1",
      status: "inactive",
    });
  });

  test("fills sensible defaults when fields are missing or null", () => {
    expect(draftFromPreemptionConfig(null)).toEqual({
      name: "",
      sourceSpatZoneId: "",
      controllerIp: "",
      status: "active",
    });
    expect(
      draftFromPreemptionConfig({
        name: null,
        spatZoneId: null,
        controllerIp: null,
        status: null,
      }),
    ).toEqual({
      name: "",
      sourceSpatZoneId: "",
      controllerIp: "",
      status: "active",
    });
  });

  test("preserves 0 as a valid spatZoneId", () => {
    expect(
      draftFromPreemptionConfig({ spatZoneId: 0 }).sourceSpatZoneId,
    ).toBe("0");
  });
});
