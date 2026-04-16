import {
  fetchPreemptionZoneConfigs,
  createPreemptionZoneConfig,
} from "../services/preemptionZoneConfigs";

const RAW_ROW = {
  id: 12,
  intersection_id: 3,
  intersection_name: "MLK & Georgia",
  name: "Fire route",
  spat_zone_id: 9,
  spat_zone_name: "North approach",
  controller_ip: "10.0.0.1",
  lane_ids: [1, 2, 3],
  signal_group: 5,
  status: "active",
  polygon: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
    ],
  },
  entry_line: {
    type: "LineString",
    coordinates: [
      [0, 0],
      [1, 0],
    ],
  },
  exit_line: {
    type: "LineString",
    coordinates: [
      [1, 1],
      [0, 1],
    ],
  },
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-02T00:00:00Z",
};

function mockFetchOk(data) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
  });
}

describe("fetchPreemptionZoneConfigs", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("normalizes server rows to camelCase and flattens polygon/line geometry", async () => {
    global.fetch = mockFetchOk([RAW_ROW]);
    const rows = await fetchPreemptionZoneConfigs(3);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      id: 12,
      intersectionId: 3,
      intersectionName: "MLK & Georgia",
      name: "Fire route",
      spatZoneId: 9,
      spatZoneName: "North approach",
      controllerIp: "10.0.0.1",
      laneIds: [1, 2, 3],
      signalGroup: 5,
      status: "active",
      polygon: [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 0],
      ],
      entryLine: [
        [0, 0],
        [1, 0],
      ],
      exitLine: [
        [1, 1],
        [0, 1],
      ],
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-02T00:00:00Z",
    });
  });

  test("sends intersection_id as a query param when provided", async () => {
    const fetchMock = mockFetchOk([]);
    global.fetch = fetchMock;
    await fetchPreemptionZoneConfigs(42);
    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toContain("intersection_id=42");
  });

  test("returns [] when the server does not respond with an array", async () => {
    global.fetch = mockFetchOk({ error: "nope" });
    expect(await fetchPreemptionZoneConfigs(3)).toEqual([]);
  });

  test("throws with the server error message on non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    });
    await expect(fetchPreemptionZoneConfigs(3)).rejects.toThrow("boom");
  });
});

describe("createPreemptionZoneConfig", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("rewrites camelCase payload keys to snake_case for the server", async () => {
    const fetchMock = mockFetchOk(RAW_ROW);
    global.fetch = fetchMock;

    await createPreemptionZoneConfig({
      intersectionId: 3,
      name: "Fire route",
      sourceSpatZoneId: "9",
      controllerIp: "  10.0.0.1  ",
      status: "active",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({
      name: "Fire route",
      intersection_id: 3,
      source_spat_zone_id: 9,
      controller_ip: "10.0.0.1",
      status: "active",
    });
  });
});
