import mongoose from "mongoose";

const { Schema } = mongoose;

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      unique: true, // optional but recommended
      index: true,
    },

    // NEW: type of coupon
    type: {
      type: String,
      enum: ["amount", "percent"],
      required: true,
    },

    // Discount payload supports either percent OR currency amounts
    discount: {
      percent: {
        type: Number,
        min: 0,
        max: 100,
        required: function () {
          return this.type === "percent";
        },
      },
      egp: {
        type: Number,
        min: 0,
        required: function () {
          return this.type === "amount";
        },
      },
      euro: {
        type: Number,
        min: 0,
        required: function () {
          return this.type === "amount";
        },
      },
    },

    expirationDate: {
      type: Date,
      required: true,
    },

    // Optional flags
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
// Extra validation: when type === "amount", ensure at least one currency is provided
// couponSchema.path("discount").validate(function (v) {
//   if (this.type === "amount") {
//     const hasAny =
//       typeof v?.egp === "number" || typeof v?.euro === "number";
//     return hasAny;
//   }
//   return true;
// }, "Amount coupons must include at least one currency amount (egp or euro).");

// Instance helper to apply the coupon to a cart/order total
// Usage: coupon.applyTo({ total: 500, currency: 'egp' })
// couponSchema.methods.applyTo = function ({ total, currency }) {
//   if (!this.active) return { total, discountApplied: 0, reason: "inactive" };
//   if (new Date(this.expirationDate) < new Date()) {
//     return { total, discountApplied: 0, reason: "expired" };
//   }

//   let discountApplied = 0;

//   if (this.type === "percent") {
//     discountApplied = (total * this.discount.percent) / 100;
//   } else {
//     // amount type depends on currency
//     const key = String(currency || "").toLowerCase();
//     const map = { egp: this.discount.egp, euro: this.discount.euro };
//     const value = map[key];
//     if (typeof value !== "number") {
//       return {
//         total,
//         discountApplied: 0,
//         reason: `no amount defined for currency ${currency}`,
//       };
//     }
//     discountApplied = value;
//   }

//   const newTotal = Math.max(0, Number((total - discountApplied).toFixed(2)));
//   return { total: newTotal, discountApplied };
// };