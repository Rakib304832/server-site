import mongoose, { Document, Schema } from "mongoose";

export interface IBooking extends Document {
  studioId: string;
  studioTitle: string;
  studioImage: string;
  studioCategory: string;
  studioLocation: string;
  ownerEmail: string;
  userId: string;
  userName: string;
  userEmail: string;
  startTime: Date;
  endTime: Date;
  hours: number;
  guests?: number;
  totalPrice: number;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  createdAt: Date;
  updatedAt?: Date;
}

const bookingSchema: Schema = new Schema(
  {
    studioId: {
      type: String,
      required: true,
    },
    studioTitle: {
      type: String,
      required: true,
    },
    studioImage: {
      type: String,
    },
    studioCategory: {
      type: String,
    },
    studioLocation: {
      type: String,
    },
    ownerEmail: {
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    hours: {
      type: Number,
      required: true,
    },
    guests: {
      type: Number,
      default: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

const Booking = mongoose.model<IBooking>("Booking", bookingSchema);
export default Booking;