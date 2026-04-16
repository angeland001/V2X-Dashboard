# Preemption Work Handoff

Branch: `preemption`

This note captures what was completed in this session, what was verified manually, and what should happen next.

## Goal

Move preemption toward named multi-row configs in `preemption_zone_configs` that:

- belong to an existing intersection
- can be created from a selected SPaT zone
- preserve copied geometry, lane ids, and signal group from that SPaT source
- support multiple preemption zones per intersection
- have no separate legacy compatibility row anymore

## Canonical Intersection ID Migration Plan

Preemption UI Phase 3 is intentionally paused until the app uses one clear intersection identity.

Chosen canonical model:

- user-entered `intersection_id` is the real app-facing intersection ID
- child tables will eventually use that same `intersection_id`
- internal `intersections.id` stays only as a hidden surrogate during migration

Locked decisions:

- `intersection_id` must be unique
- `intersection_id` must be immutable after creation
- old test intersections can be deleted instead of preserved
- MAP import will require a user-supplied canonical `intersection_id`
- incoming MAP IDs are not automatically adopted as canonical IDs

Phased migration order:

- Phase 0: docs
- Phase 1: data reset and migration prep
- Phase 2: DB migration to canonical `intersection_id`
- Phase 3: server/API cutover
- Phase 4: client/UI cutover
- Phase 5: cleanup/de-legacy
- Phase 6: resume preemption UI Phase 3

Every phase should be tested and explicitly passed before moving to the next one.

## Completed

### Phase 1

Sidebar-first navigation split for Map Editor:

- `Map Editor` in the main sidebar is now a collapsible section
- submenu items:
  - `Create Intersection`
  - `Create SPaT Zone`
  - `Create Preemption`
- routes added:
  - `/geofencing/intersection`
  - `/geofencing/spat-zone`
  - `/geofencing/preemption`
- `/geofencing` redirects to `/geofencing/intersection`
- the existing `GeoFencingMap` is reused with an `editorMode` prop

Verified manually by the user: all three routes worked and the sidebar flow felt correct.

Relevant files:

- [client/src/components/navigation/SidebarNav.js](/Users/xhn461/KeplerDeliverable/client/src/components/navigation/SidebarNav.js)
- [client/src/App.js](/Users/xhn461/KeplerDeliverable/client/src/App.js)
- [client/src/components/maps/GeoFencingMap.js](/Users/xhn461/KeplerDeliverable/client/src/components/maps/GeoFencingMap.js)

### Phase 2A

Independent `preemption_zones` schema was added alongside the legacy `preemption_zone_configs` table.

New schema files:

- [server/database/002_create_preemption_zones.sql](/Users/xhn461/KeplerDeliverable/server/database/002_create_preemption_zones.sql)
- [server/database/init.sql](/Users/xhn461/KeplerDeliverable/server/database/init.sql)
- [server/database/v2x_mapdata_schema.sql](/Users/xhn461/KeplerDeliverable/server/database/v2x_mapdata_schema.sql)

Important:

- legacy `preemption_zone_configs` was intentionally kept in place
- new `preemption_zones.intersection_id` is a foreign key to `intersections.id`
- each `preemption_zones.id` is its own unique row id

### Phase 2B

Read-only backend endpoints were added for independent preemption zones:

- `GET /api/preemption-zones`
- `GET /api/preemption-zones/:id`

Supports filtering by:

- `intersection_id` = DB row id from `intersections.id`
- `intersection_number` = existing business identifier from `intersections.intersection_id`

Relevant files:

- [server/routes/preemption_zones.js](/Users/xhn461/KeplerDeliverable/server/routes/preemption_zones.js)
- [server/index.js](/Users/xhn461/KeplerDeliverable/server/index.js)

### Phase 2C

Write endpoints were added for independent preemption zones:

- `POST /api/preemption-zones`
- `PUT /api/preemption-zones/:id`
- `DELETE /api/preemption-zones/:id`

Important backend behavior:

- creation supports `source_spat_zone_id`
- when `source_spat_zone_id` is provided, geometry, lane ids, and signal group are copied from the SPaT zone
- the source SPaT zone must belong to the same intersection
- after creation, the preemption zone is independent
- `intersection_id` cannot be changed by update
- duplicate names are blocked within the same intersection

Relevant file:

- [server/routes/preemption_zones.js](/Users/xhn461/KeplerDeliverable/server/routes/preemption_zones.js)

### Phase 2D

Client service layer added for independent preemption zones, without wiring the UI yet.

New file:

- [client/src/services/preemptionZones.js](/Users/xhn461/KeplerDeliverable/client/src/services/preemptionZones.js)

Implemented helpers:

- `fetchPreemptionZones(intersectionId?)`
- `fetchPreemptionZone(id)`
- `createPreemptionZone(payload)`
- `updatePreemptionZone(id, payload)`
- `deletePreemptionZone(id)`

Important behavior:

- backend snake_case fields are normalized into camelCase for the client
- response normalization includes:
  - `intersectionId`
  - `intersectionNumber`
  - `intersectionName`
  - `controllerIp`
  - `laneIds`
  - `signalGroup`
  - `polygon`
  - `entryLine`
  - `exitLine`
- request payloads can use camelCase keys like:
  - `intersectionId`
  - `sourceSpatZoneId`
  - `controllerIp`
  - `laneIds`
  - `signalGroup`
  - `entryLine`
  - `exitLine`
- raw polygon/line coordinate arrays are converted back into GeoJSON automatically for create/update requests

### Canonical Intersection ID Cleanup

#### Phase 1

Completed.

- Added unique enforcement for `intersections.intersection_id`
- Made `intersection_id` immutable at the intersection API layer
- Added [003_prepare_canonical_intersection_id_phase1.sql](/Users/xhn461/KeplerDeliverable/server/database/003_prepare_canonical_intersection_id_phase1.sql)
- Reset the dev intersection-related tables and verified they were empty again

#### Phase 2

Completed using a safe transitional DB strategy.

- Added `canonical_intersection_id` to these child tables:
  - `lanes`
  - `crosswalks`
  - `map_data_exports`
  - `spat_zones`
  - `preemption_zones`
  - `preemption_zone_configs`
- Kept the current child `intersection_id` columns in place for compatibility
- Added DB sync triggers so either child identifier can populate the other during the migration
- Added [004_add_canonical_child_intersection_ids.sql](/Users/xhn461/KeplerDeliverable/server/database/004_add_canonical_child_intersection_ids.sql)
- Updated schema sources so fresh environments include the transitional canonical child-ID layer

Verified manually:

- current server still created:
  - intersection
  - lane
  - crosswalk
  - SPaT zone
  - independent preemption zone
  - legacy preemption zone config
  - map data export
- all child tables stored:
  - internal `intersection_id = 1`
  - `canonical_intersection_id = 3001`
- after verification, the dev DB was reset clean again

#### Phase 3

Completed.

Server/API behavior was cut over to canonical user-entered `intersection_id`.

Completed server work:

- intersection routes now resolve by canonical `intersection_id`
- public intersection responses now expose canonical `id`
- lanes and crosswalks now read/write through `canonical_intersection_id`
- SPaT routes now read/write through canonical `intersection_id`
- legacy `preemption-zone-config` now resolves by canonical `intersection_id`
- independent `preemption-zones` now resolve by canonical `intersection_id`
- confirm and mapdata routes now use canonical `intersection_id`
- MAP import now requires caller-supplied canonical `intersection_id`
- old `intersection_number` query usage was removed from SPaT and preemption APIs

Added helper:

- [server/utils/intersectionIdentity.js](/Users/xhn461/KeplerDeliverable/server/utils/intersectionIdentity.js)

Verified manually against the running backend:

- `POST /api/intersections` returned `id = 4101` for canonical `intersection_id = 4101`
- `PUT /api/intersections/4101` updated normally
- attempts to change `intersection_id` were rejected
- lanes created and listed with `intersection_id = 4101`
- crosswalks created and listed with `intersection_id = 4101`
- SPaT zones created and listed with `intersection_id = 4101`
- `PUT /api/preemption-zone-config` worked with canonical `intersection_id`
- `POST /api/preemption-zones` worked with canonical `intersection_id`
- `/api/intersections/4101/confirm` and `/api/intersections/4101/mapdata` both worked
- `intersection_number` query params now fail on SPaT/preemption routes instead of silently working
- temporary test data for intersection `4101` was removed afterward and the DB was returned to a clean state

#### Phase 4

Completed.

Client/UI behavior was cut over to canonical user-entered `intersection_id`.

Completed client work:

- the map editor now normalizes intersections into a canonical client shape
- active intersection selection is keyed off canonical `intersection_id`
- lane, crosswalk, SPaT, and preemption fetches now consistently use the canonical intersection ID path
- stale UI wording about “DB id” versus “number” was removed from the map editor
- the intersections dashboard card now displays the canonical intersection ID directly
- unused `intersectionNumber` handling was removed from the new preemption zone client service

Relevant files:

- [client/src/components/maps/GeoFencingMap.js](/Users/xhn461/KeplerDeliverable/client/src/components/maps/GeoFencingMap.js)
- [client/src/components/dashboard/pages/geofences/GeofenceZones.jsx](/Users/xhn461/KeplerDeliverable/client/src/components/dashboard/pages/geofences/GeofenceZones.jsx)
- [client/src/services/preemptionZones.js](/Users/xhn461/KeplerDeliverable/client/src/services/preemptionZones.js)

Verified:

- `node -c` passed for [GeoFencingMap.js](/Users/xhn461/KeplerDeliverable/client/src/components/maps/GeoFencingMap.js)
- `npm run build` completed successfully
- build finished with pre-existing unrelated warnings, but no new Phase 4 build breakages were introduced

#### Phase 5

Completed.

The temporary dual-ID child-table compatibility layer was removed.

Completed backend/schema cleanup:

- added [005_cleanup_legacy_child_intersection_ids.sql](/Users/xhn461/KeplerDeliverable/server/database/005_cleanup_legacy_child_intersection_ids.sql)
- removed child-table sync triggers and the `public.sync_child_intersection_identity()` helper
- collapsed child tables to a single canonical `intersection_id` column
- removed server-route reads and writes that still depended on `canonical_intersection_id`
- updated schema source files so fresh databases now create only the final single-ID child-table shape
- fixed the schema source definitions for legacy `preemption_zone_configs` so they include `lane_ids` and `signal_group`

Relevant files:

- [server/database/005_cleanup_legacy_child_intersection_ids.sql](/Users/xhn461/KeplerDeliverable/server/database/005_cleanup_legacy_child_intersection_ids.sql)
- [server/database/init.sql](/Users/xhn461/KeplerDeliverable/server/database/init.sql)
- [server/database/v2x_mapdata_schema.sql](/Users/xhn461/KeplerDeliverable/server/database/v2x_mapdata_schema.sql)
- [server/routes/intersectionroutes/lanes.js](/Users/xhn461/KeplerDeliverable/server/routes/intersectionroutes/lanes.js)
- [server/routes/intersectionroutes/crosswalks.js](/Users/xhn461/KeplerDeliverable/server/routes/intersectionroutes/crosswalks.js)
- [server/routes/intersectionroutes/lane_connections.js](/Users/xhn461/KeplerDeliverable/server/routes/intersectionroutes/lane_connections.js)
- [server/routes/intersectionroutes/intersections.js](/Users/xhn461/KeplerDeliverable/server/routes/intersectionroutes/intersections.js)
- [server/routes/spat_zones.js](/Users/xhn461/KeplerDeliverable/server/routes/spat_zones.js)
- [server/routes/preemption_zones.js](/Users/xhn461/KeplerDeliverable/server/routes/preemption_zones.js)

Verified:

- all updated route files passed `node -c`
- the new migration applied successfully to the shared Postgres database
- a temporary backend on port `3002` returned the expected canonical-only API shapes
- the live schema now shows only `intersection_id` on child tables:
  - `lanes`
  - `crosswalks`
  - `map_data_exports`
  - `spat_zones`
  - `preemption_zone_configs`
  - `preemption_zones`
- the current saved data still reads correctly:
  - intersection `1`
  - one lane
  - one crosswalk
  - one SPaT zone
  - one legacy preemption config
  - zero independent preemption zones

Follow-up verification after clearing the workflow tables:

- the intersection workflow tables were truncated and reset cleanly
- the user recreated the flow from scratch:
  - created a new intersection
  - created one lane
  - created one crosswalk
  - created one SPaT zone
  - saved preemption through the current UI
- direct DB snapshot confirmed the recreated state:
  - `intersections`: 1 row
  - `lanes`: 1 row
  - `crosswalks`: 1 row
  - `spat_zones`: 1 row
- `preemption_zone_configs`: 1 row
- `preemption_zones`: 0 rows
- `map_data_exports`: 1 row
- important product note:
  - this snapshot was taken before the Phase 6D UI cutover
  - the current forward path is now plural `preemption_zone_configs`
  - `preemption_zones` remains only as a deprecated side path until cleanup

#### Phase 6A

Completed.

Direction change:

- `preemption_zone_configs` is now the forward path for multi-preemption support
- `preemption_zones` is now a deprecation path, not the target architecture
- existing integrations remain pinned to a reserved legacy row named `__legacy__`

Completed schema work:

- added [server/database/006_expand_preemption_zone_configs_for_multi_zone.sql](/Users/xhn461/KeplerDeliverable/server/database/006_expand_preemption_zone_configs_for_multi_zone.sql)
- expanded `preemption_zone_configs` with:
  - `name`
  - `polygon`
  - `entry_line`
  - `exit_line`
  - `status`
- changed uniqueness from `UNIQUE (intersection_id)` to `UNIQUE (intersection_id, name)`
- backfilled the existing row to:
  - `name = "__legacy__"`
  - copied geometry from its linked SPaT zone
- updated the singular legacy route so it only reads and writes the `__legacy__` row

Verified:

- migration `006_expand_preemption_zone_configs_for_multi_zone.sql` applied successfully to the shared database
- current row exists as `__legacy__`
- current uniqueness rule is `UNIQUE (intersection_id, name)`

#### Phase 6B

Completed.

Plural backend APIs were added on `preemption_zone_configs`.

New route:

- [server/routes/preemption_zone_configs_plural.js](/Users/xhn461/KeplerDeliverable/server/routes/preemption_zone_configs_plural.js)

Mounted endpoint:

- `/api/preemption-zone-configs`

Implemented behavior:

- `GET /api/preemption-zone-configs?intersection_id=...`
- `GET /api/preemption-zone-configs/:id`
- `POST /api/preemption-zone-configs`
- `PUT /api/preemption-zone-configs/:id`
- `DELETE /api/preemption-zone-configs/:id`
- plural endpoints hide the reserved `__legacy__` row
- create requires:
  - `intersection_id`
  - `name`
  - `source_spat_zone_id`
- create copies from the selected SPaT zone:
  - `lane_ids`
  - `signal_group`
  - `polygon`
  - `entry_line`
  - `exit_line`
- update currently allows:
  - `name`
  - `controller_ip`
  - `status`
- update explicitly rejects geometry/source changes in this phase

Relevant files:

- [server/routes/preemption_zone_configs_plural.js](/Users/xhn461/KeplerDeliverable/server/routes/preemption_zone_configs_plural.js)
- [server/index.js](/Users/xhn461/KeplerDeliverable/server/index.js)

Verified:

- `node -c` passed for the new plural route
- the singular legacy route existed at this phase and was removed later in Phase 7
- plural backend contract is now consumed by the Phase 6D UI

#### Phase 6C

Completed.

Plural client service was added for `preemption_zone_configs`.

New client file:

- [client/src/services/preemptionZoneConfigs.js](/Users/xhn461/KeplerDeliverable/client/src/services/preemptionZoneConfigs.js)

Implemented client helpers:

- `fetchPreemptionZoneConfigs(intersectionId)`
- `fetchPreemptionZoneConfigById(id)`
- `createPreemptionZoneConfig(payload)`
- `updatePreemptionZoneConfigById(id, payload)`
- `deletePreemptionZoneConfigById(id)`

Behavior:

- targets `/api/preemption-zone-configs`
- normalizes plural config rows into the map-editor-friendly shape
- converts polygon and line arrays into GeoJSON when needed for request payloads
- originally left the singular legacy service untouched; that service was removed later in Phase 7

Relevant files:

- [client/src/services/preemptionZoneConfigs.js](/Users/xhn461/KeplerDeliverable/client/src/services/preemptionZoneConfigs.js)

Verified:

- new client service file added cleanly
- this service became the data layer used by the Phase 6D page cutover

#### Phase 6D

Completed.

The `Create Preemption` page in `GeoFencingMap` was cut over to the plural `preemption_zone_configs` flow.

Completed client/UI work:

- removed the old singular preemption selection flow from the page
- stopped using the singular legacy client service inside `GeoFencingMap`
- added local state for:
  - loaded named preemption configs
  - selected preemption config
  - create/edit draft fields
- preemption mode now:
  - loads named configs from `/api/preemption-zone-configs`
  - initially hid the reserved `__legacy__` row because the plural backend excluded it
  - creates a named config from a selected SPaT zone
  - lists saved named configs for the active intersection
  - allows rename, controller IP update, status update, and delete
  - highlights the selected named config on the map in orange using the config geometry
- SPaT mode and the existing SPaT editing flow were left intact

Relevant files:

- [client/src/components/maps/GeoFencingMap.js](/Users/xhn461/KeplerDeliverable/client/src/components/maps/GeoFencingMap.js)
- [client/src/services/preemptionZoneConfigs.js](/Users/xhn461/KeplerDeliverable/client/src/services/preemptionZoneConfigs.js)

Verified:

- `node -c client/src/components/maps/GeoFencingMap.js` passed
- `npm run build` completed successfully
- the build still has unrelated pre-existing warnings, but the new preemption UI cutover introduced no build errors
- the old hook-dependency warnings from this phase were cleaned up before finishing

#### Phase 7

Completed.

The old single-preemption compatibility layer was removed.

Completed cleanup:

- removed the singular backend route `/api/preemption-zone-config`
- removed the unused singular client service
- removed `__legacy__` filtering and reserved-name checks from the plural backend route
- updated fresh-schema files so `preemption_zone_configs.name` no longer defaults to `__legacy__`
- added [server/database/007_remove_legacy_preemption_zone_config_compat.sql](/Users/xhn461/KeplerDeliverable/server/database/007_remove_legacy_preemption_zone_config_compat.sql) to delete the old reserved row and drop the default

Relevant files:

- [server/index.js](/Users/xhn461/KeplerDeliverable/server/index.js)
- [server/routes/preemption_zone_configs_plural.js](/Users/xhn461/KeplerDeliverable/server/routes/preemption_zone_configs_plural.js)
- [server/database/init.sql](/Users/xhn461/KeplerDeliverable/server/database/init.sql)
- [server/database/v2x_mapdata_schema.sql](/Users/xhn461/KeplerDeliverable/server/database/v2x_mapdata_schema.sql)
- [server/database/007_remove_legacy_preemption_zone_config_compat.sql](/Users/xhn461/KeplerDeliverable/server/database/007_remove_legacy_preemption_zone_config_compat.sql)

Verified in code:

- `node -c server/index.js` passed
- `node -c server/routes/preemption_zone_configs_plural.js` passed

Verified in the shared DB:

- the migration to remove the legacy reserved row was applied
- `remaining_legacy_count = 0`
- current named rows in `preemption_zone_configs` are:
  - `furstPreemption`
  - `preemption2`
  - `mypreemtion`
- the newest row is:
  - `id = 5`
  - `name = mypreemtion`
  - `spat_zone_id = 2`
  - `controller_ip = 10.199.1.44`
  - `intersection_id = 1`

#### Mobile Lookup Enhancement

Completed.

The plural preemption-config route now supports direct lookup by `spat_zone_id`.

New behavior:

- `GET /api/preemption-zone-configs?spat_zone_id=2`
- returns a single config object or `null`
- this is intended for the mobile SRM flow so the app can resolve:
  - `intersection_id`
  - `lane_ids`
  - `signal_group`
  - `controller_ip`
  directly from the SPaT zone the user entered

Implementation detail:

- if `spat_zone_id` is provided, the route returns the newest matching config:
  - `ORDER BY created_at DESC, id DESC LIMIT 1`
- if `spat_zone_id` is not provided, the existing `intersection_id` list behavior remains unchanged

Relevant file:

- [server/routes/preemption_zone_configs_plural.js](/Users/xhn461/KeplerDeliverable/server/routes/preemption_zone_configs_plural.js)

## Manual Verification Completed

The new migration was applied successfully against the real project database using values from `server/.env`.

Manual API verification completed:

1. `GET /api/preemption-zones` returned `[]` after migration
2. existing test intersection used:
   - DB `intersection_id = 12`
   - name: `testingNewIntersection`
3. existing SPaT zone used:
   - `source_spat_zone_id = 5`
   - belongs to `intersection_id = 12`
4. `POST /api/preemption-zones` succeeded
5. `GET /api/preemption-zones` returned the created row
6. `GET /api/preemption-zones/1` succeeded
7. `PUT /api/preemption-zones/1` succeeded
8. `DELETE /api/preemption-zones/1` succeeded

At the end of this session, the sample preemption zone was deleted, so the table should currently be empty again unless new rows were created afterward.

## Data Model Clarification

The user wants this creation flow:

1. Select an existing intersection
2. Load SPaT zones for that intersection
3. Select a SPaT zone
4. Create a preemption zone from that SPaT zone

That means:

- `preemption_zones.id` = unique preemption zone row id
- `preemption_zones.intersection_id` = intersection foreign key from the intersections table
- `source_spat_zone_id` is only used at create time as a template source

The user explicitly does **not** want preemption to introduce a second separate intersection identity.

## Current Changed Files

Client:

- [client/src/App.js](/Users/xhn461/KeplerDeliverable/client/src/App.js)
- [client/src/components/navigation/SidebarNav.js](/Users/xhn461/KeplerDeliverable/client/src/components/navigation/SidebarNav.js)
- [client/src/components/maps/GeoFencingMap.js](/Users/xhn461/KeplerDeliverable/client/src/components/maps/GeoFencingMap.js)
- [client/src/services/preemptionZoneConfigs.js](/Users/xhn461/KeplerDeliverable/client/src/services/preemptionZoneConfigs.js)

Server:

- [server/index.js](/Users/xhn461/KeplerDeliverable/server/index.js)
- [server/routes/preemption_zones.js](/Users/xhn461/KeplerDeliverable/server/routes/preemption_zones.js)
- [server/routes/preemption_zone_configs_plural.js](/Users/xhn461/KeplerDeliverable/server/routes/preemption_zone_configs_plural.js)
- [server/routes/intersectionroutes/intersections.js](/Users/xhn461/KeplerDeliverable/server/routes/intersectionroutes/intersections.js)
- [server/routes/intersectionroutes/lanes.js](/Users/xhn461/KeplerDeliverable/server/routes/intersectionroutes/lanes.js)
- [server/routes/intersectionroutes/crosswalks.js](/Users/xhn461/KeplerDeliverable/server/routes/intersectionroutes/crosswalks.js)
- [server/routes/intersectionroutes/lane_connections.js](/Users/xhn461/KeplerDeliverable/server/routes/intersectionroutes/lane_connections.js)
- [server/routes/spat_zones.js](/Users/xhn461/KeplerDeliverable/server/routes/spat_zones.js)
- [server/database/init.sql](/Users/xhn461/KeplerDeliverable/server/database/init.sql)
- [server/database/v2x_mapdata_schema.sql](/Users/xhn461/KeplerDeliverable/server/database/v2x_mapdata_schema.sql)
- [server/database/002_create_preemption_zones.sql](/Users/xhn461/KeplerDeliverable/server/database/002_create_preemption_zones.sql)
- [server/database/003_prepare_canonical_intersection_id_phase1.sql](/Users/xhn461/KeplerDeliverable/server/database/003_prepare_canonical_intersection_id_phase1.sql)
- [server/database/004_add_canonical_child_intersection_ids.sql](/Users/xhn461/KeplerDeliverable/server/database/004_add_canonical_child_intersection_ids.sql)
- [server/database/005_cleanup_legacy_child_intersection_ids.sql](/Users/xhn461/KeplerDeliverable/server/database/005_cleanup_legacy_child_intersection_ids.sql)
- [server/database/006_expand_preemption_zone_configs_for_multi_zone.sql](/Users/xhn461/KeplerDeliverable/server/database/006_expand_preemption_zone_configs_for_multi_zone.sql)
- [server/database/007_remove_legacy_preemption_zone_config_compat.sql](/Users/xhn461/KeplerDeliverable/server/database/007_remove_legacy_preemption_zone_config_compat.sql)
- [server/utils/intersectionIdentity.js](/Users/xhn461/KeplerDeliverable/server/utils/intersectionIdentity.js)

## Next Step

### Next

The next work item is deprecating the unused `preemption_zones` path after a quick browser sanity check.

Immediate browser checks:

- open `/geofencing/preemption`
- select an intersection with saved SPaT zones
- create multiple named preemption configs from different SPaT zones
- confirm the list updates and the selected config highlights in orange
- update name, controller IP, and status on an existing named config
- delete a named config
- confirm saved named configs render and behave correctly after the legacy path removal

If those pass, the next cleanup slice is:

- stop using `preemption_zones` in docs and planning
- remove the unused `preemptionZones.js` client path
- remove or unmount `/api/preemption-zones`
- later drop the `preemption_zones` table after the config-based flow is fully proven

## Notes for the Next Agent

- The preemption page now uses plural `preemption_zone_configs`
- `preemption_zone_configs` is now the real forward path
- the old single-preemption compatibility route and `__legacy__` row have been removed
- `preemption_zones` should no longer receive new feature work
- Phase 6A, Phase 6B, Phase 6C, Phase 6D, and Phase 7 are done
- the next safest move is browser verification, then cleanup of the deprecated `preemption_zones` path
