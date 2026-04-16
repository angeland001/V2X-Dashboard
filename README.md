# How to Run
- REFER TO DOCUMENTATION FOR SETTING UP ENVIRONMENT (TBA...)
- Clone the Repository
- Run in terminal first: 

* cd server
* npm install --legacy-peer-deps (If needed)
* npm start -c

Then:

* cd back to root of directory
* cd client
* npm install --legacy-peer-deps (If needed)
* npm start -c

- Open http://localhost:3000

## Active Engineering Notes

- Branch in progress: `preemption`
- Completed so far:
  - Phase 1: `Map Editor` sidebar split into `Create Intersection`, `Create SPaT Zone`, and `Create Preemption`
  - Phase 2A: independent `preemption_zones` schema
  - Phase 2B: read endpoints for independent preemption zones
  - Phase 2C: create/update/delete endpoints for independent preemption zones
  - Phase 2D: client service layer for independent preemption zones
- Current pause:
  - preemption UI Phase 3 is paused until intersection ID cleanup is finished
- Canonical intersection ID rule:
  - user-entered `intersection_id` is the only app-facing intersection ID
  - it must be unique and immutable
  - internal `intersections.id` remains database-only during the migration
- MAP decision:
  - MAP import will require a user-supplied canonical `intersection_id`
  - exported MAP data should use canonical `intersection_id`
- Current implementation track:
  - Phase 3: server/API cutover to canonical `intersection_id` is complete
  - Phase 4: client/UI cutover is complete and build-verified
  - Phase 5: cleanup/de-legacy is complete; child tables now store only one canonical `intersection_id`
  - Latest clean-slate verification passed:
    intersection creation, lane creation, crosswalk creation, SPaT zone creation, legacy preemption save, and MapData export all worked on the cleaned schema
  - Phase 6A: `preemption_zone_configs` was expanded for multiple named rows per intersection
  - Phase 6B: plural backend APIs on `preemption_zone_configs` are complete
  - Phase 6C: plural client service for `preemption_zone_configs` is complete
  - Phase 6D: `Create Preemption` now uses the plural `preemption_zone_configs` flow in the map editor
  - Phase 7: legacy single-preemption compatibility was removed
  - Mobile lookup enhancement:
    `GET /api/preemption-zone-configs?spat_zone_id=...` now returns a single config object for dynamic SRM payload generation
  - Current live behavior note:
    the preemption page now creates, lists, edits, deletes, and highlights named preemption configs directly from `preemption_zone_configs` with no legacy reserved row
  - Latest shared DB snapshot:
    three named preemption configs remain in `preemption_zone_configs`, and the newest saved row is `mypreemtion` with `controller_ip = 10.199.1.44`
  - Next step:
    browser-verify the new multi-preemption page on `/geofencing/preemption`, then deprecate the old `preemption_zones` path

# Kepler Demo

- Video Tutorial From User: https://youtu.be/BEZjt08Myxs
- Kepler: https://kepler.gl/

# Kepler AI

- https://github.com/keplergl/kepler.gl/discussions/2843
