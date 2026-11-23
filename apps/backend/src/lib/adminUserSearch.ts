/** Shared by the customer list and its count so pagination uses identical matching. */
export function adminUserSearch(raw: unknown, parameter: number) {
  const text = String(raw ?? '').trim();
  const id = text.replace(/^#/, '');
  if (/^\d+$/.test(id)) return { clause: `u.id::text = $${parameter}`, value: id.replace(/^0+(?=\d)/, '') };
  return {
    clause: `(u.email ILIKE $${parameter} OR u.first_name ILIKE $${parameter} OR u.last_name ILIKE $${parameter} OR CONCAT_WS(' ', u.first_name, u.last_name) ILIKE $${parameter} OR u.company_name ILIKE $${parameter})`,
    value: `%${text.replace(/[\\%_]/g, '\\$&')}%`,
  };
}
