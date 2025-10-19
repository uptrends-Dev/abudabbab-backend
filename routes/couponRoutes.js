import { Router } from "express";
import { createCoupon, deleteCoupon, getAllCoupons, getCoupon, updateCoupon } from "../controllers/couponController.js";



const couponRouter = Router();

// Define coupon-related routes here
couponRouter.post("/create", createCoupon);
couponRouter.get("/getall", getAllCoupons);
couponRouter.get("/get/:id", getCoupon);
couponRouter.put("/update/:id", updateCoupon);
couponRouter.delete("/delete/:id", deleteCoupon);

export default couponRouter;