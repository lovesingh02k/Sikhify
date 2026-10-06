/* ==========================================================================
   Sikhify API — lib/serialize.js
   The only shapes in which users leave the server. Email, password hash,
   status and (unless shared) location are never included in public shapes.
   ========================================================================== */
import { parseJson } from '../db/database.js';
import { permissionsFor } from '../../shared/roles.js';

export const AUTHOR_COLUMNS = 'u.id AS author_id, u.username AS author_username, u.name AS author_name, u.avatar_url AS author_avatar, u.role AS author_role';

export function authorFrom(row) {
  if (!row || row.author_id == null) return null;
  return { id: row.author_id, username: row.author_username, name: row.author_name, avatarUrl: row.author_avatar || '', role: row.author_role };
}

export function publicUser(u) {
  if (!u) return null;
  return { id: u.id, username: u.username, name: u.name, avatarUrl: u.avatar_url || '', role: u.role };
}

/** The signed-in user's own account (includes email and private settings). */
export function selfUser(u) {
  if (!u) return null;
  return {
    ...publicUser(u),
    email: u.email,
    status: u.status,
    bio: u.bio,
    location: u.location,
    showLocation: !!u.show_location,
    interests: parseJson(u.interests, []),
    createdAt: u.created_at,
    permissions: permissionsFor(u),
  };
}

/** A profile as other people see it. */
export function profileUser(u, { isSelf = false, isStaff = false } = {}) {
  return {
    ...publicUser(u),
    bio: u.bio,
    location: u.show_location || isSelf ? u.location : '',
    interests: parseJson(u.interests, []),
    joinedAt: u.created_at,
    status: isSelf || isStaff ? u.status : u.status === 'active' ? 'active' : 'restricted',
  };
}

/** Admin view of a user (staff only). */
export function adminUser(u) {
  return {
    ...publicUser(u),
    email: u.email,
    status: u.status,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    postCount: u.post_count ?? undefined,
  };
}
