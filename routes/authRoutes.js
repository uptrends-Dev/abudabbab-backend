import { Router } from "express";

import { deleteUser, getAllUsers, getMe, login, logout, register, updateUser } from "../controllers/authController.js";
import { allowedTo, requireAdmin } from "../midelWares/authHandler.js";



const authRouter = Router();

authRouter.get("/getallusers", requireAdmin, allowedTo(), getAllUsers);
authRouter.post("/register", requireAdmin, allowedTo(), register);
authRouter.post("/updateuser", requireAdmin, allowedTo(), updateUser);
authRouter.delete("/deleteuser", requireAdmin, allowedTo(), deleteUser);

authRouter.post("/login", login);

authRouter.post("/logout", requireAdmin, logout);

authRouter.get("/me", requireAdmin, getMe);

export default authRouter;