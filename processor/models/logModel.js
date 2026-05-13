const pool = require('../config/db');

async function insertLogs(logs) {
    if (!Array.isArray(logs) || logs.length === 0) return;

    const client = await pool.connect();

    try {
        // Build a single multi-row INSERT to reduce round trips
        const cols = ['timestamp', 'level', 'message', 'app_name', 'meta', 'user_id', 'organization_id'];
        const valuePlaceholders = [];
        const values = [];
        let idx = 1;

        for (const log of logs) {
            const placeholders = [];
            // Order must match cols
            const rowValues = [
                log.timestamp,
                log.level,
                log.message,
                log.appName,
                log.meta,
                log.userId || null,
                log.organizationId || null
            ];

            for (let i = 0; i < rowValues.length; i++) {
                placeholders.push(`$${idx++}`);
            }

            valuePlaceholders.push(`(${placeholders.join(',')})`);
            values.push(...rowValues);
        }

        const query = `INSERT INTO logs (${cols.join(',')}) VALUES ${valuePlaceholders.join(',')}`;

        await client.query(query, values);
        console.log(`✅ Bulk inserted ${logs.length} logs`);
    } catch (err) {
        console.error('❌ Failed to insert logs:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function queryLogs({ userId, organizationId, level, appName, search, limit = 100, offset = 0 }) {
    const client = await pool.connect();

    try {
        let conditions = [];
        let params = [];
        let paramIndex = 1;

        // Filter by user or organization
        if (userId) {
            conditions.push(`user_id = $${paramIndex++}`);
            params.push(userId);
        } else if (organizationId) {
            conditions.push(`organization_id = $${paramIndex++}`);
            params.push(organizationId);
        }

        if (level) {
            conditions.push(`level = $${paramIndex++}`);
            params.push(level);
        }

        if (appName) {
            conditions.push(`app_name = $${paramIndex++}`);
            params.push(appName);
        }

        if (search) {
            conditions.push(`message ILIKE $${paramIndex++}`);
            params.push(`%${search}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM logs ${whereClause}`;
        const countResult = await client.query(countQuery, params);
        const total = parseInt(countResult.rows[0].total);

        // Get paginated logs
        const query = `
            SELECT id, timestamp, level, message, app_name, meta, user_id, organization_id, created_at
            FROM logs
            ${whereClause}
            ORDER BY timestamp DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        params.push(limit, offset);

        const result = await client.query(query, params);

        return {
            logs: result.rows.map(row => ({
                _id: row.id,
                _creationTime: new Date(row.created_at).getTime(),
                level: row.level,
                message: row.message,
                timestamp: new Date(row.timestamp).getTime(),
                app_name: row.app_name,
                metadata: row.meta || {},
                userId: row.user_id,
                organizationId: row.organization_id
            })),
            total,
            hasMore: offset + limit < total
        };
    } catch (err) {
        console.error('❌ Failed to query logs:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { insertLogs, queryLogs };