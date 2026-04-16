function parseCanonicalIntersectionId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function serializeIntersectionRow(row) {
  if (!row) return null;

  return {
    id: row.intersection_id,
    name: row.name,
    description: row.description,
    ref_point: row.ref_point,
    region_id: row.region_id,
    intersection_id: row.intersection_id,
    msg_issue_revision: row.msg_issue_revision,
    status: row.status,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function fetchIntersectionByCanonicalId(queryRunner, canonicalIntersectionId) {
  const result = await queryRunner.query(
    `SELECT
       id AS db_id,
       name,
       description,
       ST_AsGeoJSON(ref_point)::json AS ref_point,
       region_id,
       intersection_id,
       msg_issue_revision,
       status,
       created_by,
       created_at,
       updated_at
     FROM intersections
     WHERE intersection_id = $1
     LIMIT 1`,
    [canonicalIntersectionId],
  );

  return result.rows[0] || null;
}

async function fetchIntersectionDbIdByCanonicalId(queryRunner, canonicalIntersectionId) {
  const result = await queryRunner.query(
    "SELECT id FROM intersections WHERE intersection_id = $1 LIMIT 1",
    [canonicalIntersectionId],
  );

  return result.rows[0]?.id ?? null;
}

module.exports = {
  parseCanonicalIntersectionId,
  serializeIntersectionRow,
  fetchIntersectionByCanonicalId,
  fetchIntersectionDbIdByCanonicalId,
};
