const { db } = require("../server/db.js");

/**
 * RBAC middleware factory - requires minimum role level
 * @param {string} minRole - minimum required role: 'member' | 'admin' | 'owner'
 * @returns {Function} Express middleware
 */
function requireRole(minRole = "member") {
  const rank = { member: 1, admin: 2, owner: 3 };
  
  return async (req, res, next) => {
    try {
      const userId = Number(req.user?.id || 0);
      if (!userId) {
        return res.status(401).json({ ok: false, error: "unauthenticated" });
      }

      // Get org_id from header or user's default org
      const orgId = Number(req.headers["x-org-id"] || req.user?.org_id || 0);
      if (!orgId) {
        return res.status(400).json({ ok: false, error: "no_org" });
      }

      // Check membership and role
      const membership = db.prepare(
        "SELECT role FROM membership WHERE user_id = ? AND org_id = ?"
      ).get(userId, orgId);

      if (!membership) {
        return res.status(403).json({ ok: false, error: "not_a_member" });
      }

      if (rank[membership.role] < rank[minRole]) {
        return res.status(403).json({ ok: false, error: "forbidden" });
      }

      // Attach org context to request
      req.orgId = orgId;
      req.userRole = membership.role;
      
      next();
    } catch (e) {
      console.error("RBAC error:", e);
      next(e);
    }
  };
}

/**
 * Check if user has specific role in organization
 * @param {number} userId - User ID
 * @param {number} orgId - Organization ID  
 * @param {string} role - Required role
 * @returns {boolean} Has role
 */
function hasRole(userId, orgId, role) {
  try {
    const membership = db.prepare(
      "SELECT role FROM membership WHERE user_id = ? AND org_id = ?"
    ).get(userId, orgId);
    
    const rank = { member: 1, admin: 2, owner: 3 };
    return membership && rank[membership.role] >= rank[role];
  } catch (e) {
    return false;
  }
}

/**
 * Get user's organizations
 * @param {number} userId - User ID
 * @returns {Array} List of organizations with roles
 */
function getUserOrgs(userId) {
  try {
    return db.prepare(`
      SELECT o.id, o.name, o.created_at, m.role
      FROM org o
      JOIN membership m ON m.org_id = o.id
      WHERE m.user_id = ?
      ORDER BY o.created_at DESC
    `).all(userId);
  } catch (e) {
    console.error("getUserOrgs error:", e);
    return [];
  }
}

/**
 * Create organization and make user owner
 * @param {string} name - Organization name
 * @param {number} userId - User ID to make owner
 * @returns {number} Organization ID
 */
function createOrg(name, userId) {
  try {
    const orgId = db.prepare(
      "INSERT INTO org (name) VALUES (?)"
    ).run(name).lastInsertRowid;

    db.prepare(
      "INSERT INTO membership (user_id, org_id, role) VALUES (?, ?, 'owner')"
    ).run(userId, orgId);

    return orgId;
  } catch (e) {
    console.error("createOrg error:", e);
    throw e;
  }
}

module.exports = { 
  requireRole, 
  hasRole, 
  getUserOrgs, 
  createOrg 
};
