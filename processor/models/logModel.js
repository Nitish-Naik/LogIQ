const pool = require('../config/db');

async function insertLogs(logs) {
    const query = `
        INSERT INTO LOGS (timestamp, level, message, app_name, meta, user_id, organization_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    const client = await pool.connect();

    try {
        for( const log of logs ) {
            await client.query(query, [
                log.timestamp,
                log.level,
                log.message,
                log.appName, // Map appName from collector to app_name in DB
                log.meta,
                log.userId || null,
                log.organizationId || null
            ]);
        }
        console.log('✅ Batch inserted into DB')
    } catch (err) {
        console.error('❌ Failed to insert logs:', err);
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