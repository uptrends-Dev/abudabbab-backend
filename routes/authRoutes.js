import { Router } from "express";

import { issueSession, requireAdmin, revokeSession, verifyAdmin } from "../helpers/auth.js";
import AppError from "../utils/AppError.js";
const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return next(new AppError("Email and password are required", 400));

    const admin = await verifyAdmin(email, password);
    if (!admin) return next(new AppError("Invalid credentials", 401));

    const { token, exp, ttlSec } = issueSession({
      adminId: admin.id,
      roles: admin.roles || [],
      email: admin.email || email,
    });

    res
      .cookie("access_token", token, {
        httpOnly: true,
        secure: true, // true if in production
        sameSite: "none",
        domain: ".vercel.app",// share across subdomains; omit or set correctly
        path: "/",
      })
   
      .status(200)
      .json({
        access_token: token,
        token_type: "Bearer",
        expires_in: ttlSec,
        user: { id: admin.id, email: admin.email || email, roles: admin.roles || [] },
      });

  } catch (err) {
    next(err);
  }
});


authRouter.post("/logout", requireAdmin, async (req, res, next) => {
  try {
    res
      .clearCookie("access_token", {
        httpOnly: true,
        secure: true, // true if in production
        sameSite: "none",
        domain: ".vercel.app",// share across subdomains; omit or set correctly
        path: "/",
      });
   
    revokeSession(req.admin.token);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});


authRouter.get("/me", requireAdmin, (req, res) => {
  res.json({
    id: req.admin.id,
    email: req.admin.email,
    roles: req.admin.roles,
  });
});

export default authRouter;