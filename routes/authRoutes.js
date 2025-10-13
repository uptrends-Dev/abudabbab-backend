import { Router } from "express";

import { getMe, login, logout, register } from "../controllers/authController.js";
import { allowedTo, requireAdmin } from "../midelWares/authHandler.js";



const authRouter = Router();

authRouter.post("/register", requireAdmin, allowedTo(), register);

authRouter.post("/login", login);

authRouter.post("/logout", requireAdmin, logout);

authRouter.get("/me", requireAdmin, getMe);

export default authRouter;