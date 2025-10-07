import AppError from "../utils/AppError.js";

// Simple in-memory session store (replace with Redis in prod)
const SESSIONS = new Map(); // token -> { adminId, roles, exp }
const SESSION_TTL_SEC = Number(process.env.ADMIN_SESSION_TTL_SEC || 60 * 60 * 24); // 30m default

setInterval(() => {
  const now = Date.now();
  for (const [t, s] of SESSIONS.entries()) {
    if (now > s.exp) SESSIONS.delete(t);
  }
}, 60 * 1000);

export function issueSession(payload, ttlSec = SESSION_TTL_SEC) {
  const token = "sess_" + crypto.randomUUID();
  const exp = Date.now() + ttlSec * 1000;
  SESSIONS.set(token, { ...payload, exp });

  return { token, exp, ttlSec };
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
  // مثال: استبدلها بقراءة من قاعدة البيانات + bcrypt.compare
  // const admin = await AdminModel.findOne({ email });
  // if (!admin) return null;
  // const ok = await bcrypt.compare(password, admin.passwordHash);
  // return ok ? { id: admin._id.toString(), roles: admin.roles } : null;

  // Temp demo: accept one .env admin or reject
  const ENV_EMAIL = process.env.ADMIN_EMAIL;
  const ENV_PASS = process.env.ADMIN_PASSWORD;
  if (ENV_EMAIL && ENV_PASS && email === ENV_EMAIL && password === ENV_PASS) {
    return { id: "adm_env", roles: ["superadmin"], email };
  }
  return null;
}

// Bearer auth middleware
export function requireAdmin(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.replace(/^Bearer\s+/i, "").trim();
  console.log(token)
  if (!token) return next(new AppError("Unauthorized", 401));

  const session = getSession(token);
  console.log(session)
  if (!session) return next(new AppError("Unauthorized", 401));

  // Attach admin context
  req.admin = { id: session.adminId, roles: session.roles, email: session.email, token };
  // Optional sliding TTL:
  if (process.env.ADMIN_SESSION_SLIDING === "true") {
    session.exp = Date.now() + SESSION_TTL_SEC * 1000;
    SESSIONS.set(token, session);
  }
  next();
}