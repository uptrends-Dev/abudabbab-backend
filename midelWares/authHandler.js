// import AppError from "../utils/AppError";
import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";
import { getSession } from "../helpers/auth.js";

// Bearer auth middleware
export function requireAdmin(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.replace(/^Bearer\s+/i, "").trim();

  // console.log(token)
  if (!token) return next(new AppError("Unauthorized", 401));

  const session = getSession(token);
  console.log(session)
  if (!session) return next(new AppError("Unauthorized", 401));

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (!decoded) return next(new AppError("Unauthorized", 401));

  // Attach admin context
  // req.admin = { id: session.adminId, roles: session.roles, email: session.email, token };
  req.admin = { username: decoded.username, role: decoded.role, token };
  next();
}

export function allowedTo(...roles) {
  return (req, res, next) => {
    // suber admin can do anything
    if (req.admin.role && req.admin.role == "SUPER_ADMIN") {
      next();
      return;
    }
    // regular admin can only access their own resources
    if (req.admin.role && roles.includes(req.admin.role)) {
      next();
    }
    return res.status(403).json({ message: "Access denied" });
  };
}

