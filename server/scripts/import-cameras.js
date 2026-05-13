/**
 * Camera CSV Importer
 *
 * Converts Excel export (saved as CSV) into database rows in the cameras table.
 * Looks up intersection_id via cuip_slug and inserts camera records.
 *
 * Usage:
 *   node server/scripts/import-cameras.js cameras.csv
 *
 * Expected CSV columns (in any order):
 *   cuip_slug, ip_address, [location_name or label, stream_path, rtsp_path, notes]
 *
 * Example:
 *   cuip_slug,ip_address,location_name
 *   MLK_Georgia,10.200.1.50,MLK & Georgia
 *   Lab_Device,10.199.1.55,Lab Device
 */

const fs = require('fs');
const path = require('path');
const db = require('../database/postgis');

async function importCameras(csvFilePath) {
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ File not found: ${csvFilePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = fileContent.trim().split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    console.error('❌ CSV must have at least 1 header row and 1 data row');
    process.exit(1);
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());

  const locationNameIdx = headers.indexOf('location_name');
  const cuipSlugIdx = headers.indexOf('cuip_slug');
  const ipAddressIdx = headers.indexOf('ip_address');
  const labelIdx = headers.indexOf('label');
  const streamPathIdx = headers.indexOf('stream_path');
  const rtspPathIdx = headers.indexOf('rtsp_path');
  const notesIdx = headers.indexOf('notes');

  if (cuipSlugIdx === -1 || ipAddressIdx === -1) {
    console.error('❌ CSV must have columns: cuip_slug, ip_address');
    process.exit(1);
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(',').map((v) => v.trim());

    rows.push({
      cuipSlug: values[cuipSlugIdx],
      ipAddress: values[ipAddressIdx],
      label: labelIdx !== -1 ? values[labelIdx] : values[locationNameIdx] || values[cuipSlugIdx],
      streamPath: streamPathIdx !== -1 ? values[streamPathIdx] : '/axis-cgi/mjpg/video.cgi',
      rtspPath: rtspPathIdx !== -1 ? values[rtspPathIdx] : '/axis-media/media.amp',
      notes: notesIdx !== -1 ? values[notesIdx] : null,
    });
  }

  console.log(`\n📋 Importing ${rows.length} cameras from ${csvFilePath}...\n`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      // Look up intersection_id by cuip_slug
      const intersectionResult = await db.query(
        'SELECT intersection_id FROM intersections WHERE cuip_slug = $1',
        [row.cuipSlug]
      );

      if (!intersectionResult.rows.length) {
        console.warn(`⚠️  Skipped: no intersection found for slug "${row.cuipSlug}"`);
        skipped++;
        continue;
      }

      const intersectionId = intersectionResult.rows[0].intersection_id;

      // Insert camera
      await db.query(
        `INSERT INTO cameras (intersection_id, cuip_slug, label, ip_address, stream_path, rtsp_path, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (ip_address) DO NOTHING`,
        [intersectionId, row.cuipSlug, row.label, row.ipAddress, row.streamPath, row.rtspPath, row.notes]
      );

      console.log(`✅ Imported: ${row.label} (${row.ipAddress})`);
      imported++;
    } catch (err) {
      console.error(`❌ Error importing ${row.label}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped:  ${skipped}`);
  console.log(`   Errors:   ${errors}`);

  process.exit(errors > 0 ? 1 : 0);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node import-cameras.js <csv-file>');
  process.exit(1);
}

importCameras(path.resolve(csvPath)).catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
