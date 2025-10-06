import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    // بدل tripId → tripInfo (لسه ObjectId بيريفرنس Trip)
    tripInfo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    adult: {
      type: Number,
      required: true,
      min: 1,
    },
    child: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      egp: { type: Number, required: true, min: 0 },
      euro: { type: Number, required: true, min: 0 },
    },
    transportation: {
      type: Boolean,
      required: true,
    },
    user: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true },
      phone: { type: String, required: true, trim: true },
      message: { type: String, trim: true },
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    payment: {
      type: Boolean,
      required: true,
    },
    checkIn: {
      type: Boolean,
      required: true,
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model("booking", bookingSchema);
export default Booking;
