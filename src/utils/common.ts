import cron from "node-cron";
import Booking from "../models/bookingModel";
import TimeSlot from "../models/timeSlotModel";
import Doctor from "../models/doctorModel";

cron.schedule("0 02 * * *", async () => {
  try {
    console.log(
      "Running scheduled tasks: Deleting bookings and resetting slot counts"
    );

    await Booking.deleteMany({});
    console.log("all bookings where deleted");

    // 2. Reset slotCount to originalSlotCount for all time slots
    const timeSlots = await TimeSlot.find({});
    for (const timeSlot of timeSlots) {
      for (const slot of timeSlot.slots) {
        slot.slotCount = slot.originalSlotCount;
      }
      await timeSlot.save();
    }

    const doctors = await Doctor.find({});
    for (const doctor of doctors) {
      doctor.token = 0;
      await doctor.save();
    }

    console.log("slot count reset to original values.");
  } catch (error) {
    console.log(error);
  }
});
