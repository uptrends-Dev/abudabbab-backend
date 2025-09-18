import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    images: {
      type: [String], // array of image URLs
      validate: {
        validator: function (arr) {
          return arr.length >= 1 && arr.length <= 5;
        },
        message: "Trip must have between 1 and 5 images.",
      },
    },
    features: [
      {
        title: { type: String, required: true, trim: true },
        subtitle: { type: String, required: true, trim: true },
      },
    ],
    tripTime: {
      from: { type: String, required: true }, 
      to: { type: String, required: true },
    },
    prices: {
      adult: {
        egp: { type: Number, required: true, min: 0 },
        euro: { type: Number, required: true, min: 0 },
      },
      child: {
        egp: { type: Number, required: true, min: 0 },
        euro: { type: Number, required: true, min: 0 },
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Trip = mongoose.model("Trip", tripSchema);
export default Trip;
