export function buildQuery(filters) {
  console.log('🔧 [buildQuery] Starting query build with filters:', JSON.stringify(filters, null, 2));
  
  let base = `SELECT * FROM logs`;
  const conditions = [];
  const values = [];

  if (filters.level) {
    console.log(`📌 [buildQuery] Adding level filter: ${filters.level}`);
    values.push(filters.level);
    conditions.push(`level = $${values.length}`);
  }

  if (filters.appName) {
    console.log(`📌 [buildQuery] Adding appName filter: ${filters.appName}`);
    values.push(filters.appName);
    conditions.push(`app_name = $${values.length}`);
  }

  if (filters.search) {
    console.log(`📌 [buildQuery] Adding search filter: ${filters.search}`);
    values.push(`%${filters.search}%`);
    conditions.push(`message ILIKE $${values.length}`);
  }

  if (filters.from) {
    console.log(`📌 [buildQuery] Adding from date filter: ${filters.from}`);
    values.push(filters.from);
    conditions.push(`timestamp >= $${values.length}`);
  }
  if (filters.to) {
    console.log(`📌 [buildQuery] Adding to date filter: ${filters.to}`);
    values.push(filters.to);
    conditions.push(`timestamp <= $${values.length}`);
  }

  let whereClause = conditions.length
    ? ` WHERE ` + conditions.join(" AND ")
    : "";
  
  const limit = parseInt(filters.limit) || 20;
  const offset = parseInt(filters.offset) || 0;
  
  console.log(`📊 [buildQuery] Pagination - Limit: ${limit}, Offset: ${offset}`);
  console.log(`🔗 [buildQuery] Conditions: [${conditions.join(', ')}]`);
  console.log(`🔗 [buildQuery] Values: [${values.join(', ')}]`);

  const finalQuery = `${base}${whereClause} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
  
  console.log(`✅ [buildQuery] Final SQL: ${finalQuery}`);
  console.log(`✅ [buildQuery] Parameters: [${values.join(', ')}]`);

  return { text: finalQuery, values };
}

// New function to get all rows with optional limit
export function buildAllRowsQuery(options = {}) {
  const limit = parseInt(options.limit) || 1000;
  const offset = parseInt(options.offset) || 0;
  const orderBy = options.orderBy || "timestamp DESC";

  const organizationId = options.organizationId;
  if (!organizationId) {
    throw new Error("organizationId is required to fetch logs");
  }

  const query = `SELECT * FROM logs WHERE organization_id = $1 ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
  const values = [organizationId];

  return { text: query, values };
}


// Function to get total count of all rows
export function buildCountQuery(organizationId) {
  console.log('🔧 [buildCountQuery] Building count query');
  
  const query = "SELECT COUNT(*) as total FROM logs where organization_id = $1";
  const values = [organizationId];
  
  console.log(`✅ [buildCountQuery] Final SQL: ${query}`, values);
  
  return { text: query, values };
}


// Function to get organization details
export function buildOrganizationDetailsQuery() {
  console.log('🔧 [buildOrganizationDetailsQuery] Building organization details query');
  
  const query = "SELECT name FROM organizations where id=58d71145-ccce-4dfa-8e60-0feb9c04d5c6";
  
  console.log(`✅ [buildCountQuery] Final SQL: ${query}`);
  
  return { text: query, values: [] };
}