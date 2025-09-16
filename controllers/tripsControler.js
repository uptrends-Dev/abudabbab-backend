import Trip from "../models/trips.js";
import AppError from "../utils/AppError.js";
import catchAsync from "../utils/catchAsync.js";

// get All Trips
export const getAllTrips = catchAsync(async (req, res, next) => {
  const trips = await Trip.find().lean();

  if (!trips || trips.length === 0) {
    return next(new AppError("No trips found", 404));
  }

  res.json({ data: trips });
});

// get Trip by ID
export const getTripById = catchAsync(async (req, res , next) => {
  const tripId = req.params.id;

  const trip = await Trip.findById(tripId).lean();
  if (!trip) {
    return next(new AppError("No Trips Found", 404));
  }
  res.json({ data: trip });
});

// create Trip
export const createTrip = catchAsync(async (req, res , next) => {
  const newTrip = req.body;
  if (!newTrip || Object.keys(newTrip).length === 0) {
    return next(new AppError("Trip data is required", 400));
  }
  const trip = new Trip(newTrip);
  await trip.save();
  res.status(201).json({ message: "Trip created", trip });
});

// Delete Trip
export const deleteTrip = catchAsync(async (req, res, next) => {
  const { id: tripId } = req.params;

  if (!tripId) {
    return next(new AppError("Trip ID is required", 400));
  }
  const trip = await Trip.findByIdAndDelete(tripId);
  if (!trip) {
    return next(new AppError("No Trip found with this ID", 404));
  }
  res.status(200).json({
    message: `Trip ${tripId} deleted successfully`,
  });
});

// update Trip
export const updateTrip = async (req, res) => {
  const tripId = req.params.id;
  const updatedTrip = req.body;
  try {
    const trip = await Trip.findByIdAndUpdate(tripId, updatedTrip, {
      new: true,
    });
    res.json({ message: `Trip ${tripId} updated`, trip });
  } catch (error) {
    res.status(500).json({ message: "Error updating trip", error });
  }
};
