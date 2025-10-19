import { Router } from "express";
import { createCoupon, deleteCoupon, getAllCoupons, getCoupon, updateCoupon } from "../controllers/couponController.js";
import { allowedTo, requireAdmin } from "../midelWares/authHandler.js";



const couponRouter = Router();

// Define coupon-related routes here
couponRouter.post("/create", requireAdmin, allowedTo("admin"), createCoupon);
couponRouter.get("/getall", requireAdmin, allowedTo("admin"), getAllCoupons);
couponRouter.get("/get/:id", requireAdmin, allowedTo("admin"), getCoupon);
couponRouter.put("/update/:id", requireAdmin, allowedTo("admin"), updateCoupon);
couponRouter.delete("/delete/:id", requireAdmin, allowedTo("admin"), deleteCoupon);

export default couponRouter;