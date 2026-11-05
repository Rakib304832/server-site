import mongoose, { Document, Schema } from "mongoose";

export interface IStudio extends Document {
  title: string;
  category: string;
  hourlyRate: number;
  securityDeposit: number;
  maxCapacity: number;
  location: string;
  image: string;
  gallery: string[];
  amenities: string[];
  overview: string;
  ownerId?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhoto: string;
  rating: number;
  reviewsCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

const studioSchema: Schema = new Schema(
  {
    _id: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Photo Studio",
        "Film Stage",
        "Podcast Lounge",
        "Music Suite",
        "Workshop",
      ],
    },
    hourlyRate: {
      type: Number,
      required: [true, "Hourly rate is required"],
      min: [0, "Hourly rate must be positive"],
    },
    securityDeposit: {
      type: Number,
      required: [true, "Security deposit is required"],
      min: [0, "Security deposit must be positive"],
    },
    maxCapacity: {
      type: Number,
      required: [true, "Max capacity is required"],
      min: [1, "Max capacity must be at least 1"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
    },
    image: {
      type: String,
      default: "",
    },
    gallery: {
      type: [String],
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },
    overview: {
      type: String,
      required: [true, "Overview is required"],
    },
    ownerId: {
      type: String,
    },
    ownerName: {
      type: String,
      required: true,
    },
    ownerEmail: {
      type: String,
      required: true,
    },
    ownerPhoto: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      default: 0,
    },
    reviewsCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Studio = mongoose.model<IStudio>("Studio", studioSchema);
export default Studio;