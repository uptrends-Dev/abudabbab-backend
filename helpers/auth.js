import AdminUser from "../models/adminUsers.js";
import bcrypt from "bcryptjs";


// // Simple in-memory session store (replace with Redis in prod)
const SESSIONS = new Map(); // token -> { adminId, roles, exp }
const SESSION_TTL_SEC = Number(process.env.ADMIN_SESSION_TTL_SEC || 60 * 60 * 24); // 30m default

// setInterval(() => {
//   const now = Date.now();
//   for (const [t, s] of SESSIONS.entries()) {
//     if (now > s.exp) SESSIONS.delete(t);
//   }
// }, 60 * 1000);

export function issueSession(payload, token, ttlSec = SESSION_TTL_SEC) {
  // const token = jwt.sign({ id: payload.adminId, role: payload.role }, process.env.JWT_SECRET);
  // const token = "sess_" + crypto.randomUUID();
  const exp = Date.now() + ttlSec * 1000;
  SESSIONS.set(token, { ...payload, exp });

  return;
}

export function getSession(token) {
  const s = SESSIONS.get(token);
  if (!s) return null;
  if (Date.now() > s.exp) {
    SESSIONS.delete(token);
    return null;
  }
  return s;
}

export function revokeSession(token) {
  SESSIONS.delete(token);
}
// TODO: Replace with your real Admin lookup/password check

export async function verifyAdmin(email, password) {

  const admin = await AdminUser.findOne({ email });
  if (!admin) return null;
  const ok = await bcrypt.compare(password, admin.password);
  return ok ? { username: admin.username, role: admin.role } : null;
}