import { Response } from "express";
import Specialisation from "../../models/specialisationModel";
import Doctor from "../../models/doctorModel";
import mongoose, { Types } from "mongoose";

export const addDoctor = async (req: any, res: Response) => {
  try {
    const storeId = req.store._id;

    const {
      name,
      specialisation,
      startingTime,
      endingTime,
      noOfToken,
      offDays,
      isAvailable,
      image,
    } = req.body;

    if (!name || !specialisation || !noOfToken || !offDays || !image) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields." });
    }

    console.log("specioalisation ", specialisation);

    const specialisationQuery = mongoose.Types.ObjectId.isValid(specialisation) ? {_id:specialisation} : {name:specialisation}

    const existingSpecialisation: any = await Specialisation.findOne(specialisationQuery);

    console.log("exisitingSpecialisation  ", existingSpecialisation);

    let specialisationId;
    if (!existingSpecialisation) {
      const newSpecialisation = new Specialisation({ name: specialisation,storeId });
      const savedSpecialisation = await newSpecialisation.save();
      specialisationId = savedSpecialisation._id;
    } else {
      specialisationId = existingSpecialisation._id;
    }

    const newDoctor = new Doctor({
      name,
      specialisation: specialisationId,
      availableTime: startingTime + " - " + endingTime,
      noOfToken,
      offDays,
      isAvailable,
      storeId,
      imageUrl: image,
    });

    const savedDoctor = await newDoctor.save();

    res.status(201).json({
      message: "Doctor added successfully.",
      success: true,
      doctor: savedDoctor,
    });
  } catch (error) {
    console.log("error while adding doctor ", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const fetchAllDoctors = async (req: any, res: Response) => {
  try {
    const storeId = req.store._id;

    if (!storeId) return res.status(400).json({ message: "StoreId required" });

    // const doctors = await Doctor.find({ storeId: storeId })

    const doctors = await Doctor.aggregate([
      { $match: { storeId: new mongoose.Types.ObjectId(storeId) } },
      {
        $lookup: {
          from: "specialisations",
          localField: "specialisation",
          foreignField: "_id",
          as: "specialisationDetails",
        },
      },
      { $unwind: "$specialisationDetails" },
    ]);

    // if (doctors.length === 0)
    //   return res
    //     .status(404)
    //     .json({ message: "No doctors available for the hospital" });

    res.status(200).json(doctors);
  } catch (error) {
    console.log("error while fetching doctor ", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const UpdateAvailabilityOfDoctor = async (req: any, res: Response) => {
  try {
    const storeId = req.store._id;
    if (!storeId)
      return res.status(400).json({ message: "Store id is required" });

    const { doctorId } = req.body;

    const doctor: any = await Doctor.findOne({
      storeId: storeId,
      _id: doctorId,
    });

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    doctor.isAvailable = !doctor?.isAvailable;

    await doctor.save();

    res.status(200).json({ message: "Doctor availability updated", doctor });
  } catch (error) {
    console.log("error while updating availability of the doctor ", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const deleteDoctor = async (req: any, res: Response) => {
  try {
    const storeId = req.store._id;

    if (!storeId)
      return res.status(404).json({ message: "store ID is required" });

    const { doctorId } = req.body;

    if (!doctorId)
      return res.status(404).json({ message: "Doctor  id required" });

    const doctor = await Doctor.findOne({ _id: doctorId, storeId });

    if (!doctor)
      return res.status(404).json({
        message: "Doctor not found or does not belonging to this hospital. ",
      });

    await Doctor.findByIdAndDelete({ _id: doctorId });

    res.status(201).json({ message: "Deleted doctor successfully" });
  } catch (error) {
    console.log("error while deleting  doctor ", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

export const changeDrAvailability = async (req: any, res: Response) => {
  try {
    const storeId = req.store._id;

    if (!storeId) {
      return res.status(404).json({ message: "No store id provided" });
    }

    const { doctorId } = req.body;
    console.log("doctor id  ", doctorId);

    if (!doctorId) {
      return res.status(404).json({ message: "Doctor id required" });
    }

    const doctor: any = await Doctor.findOne({ storeId, _id: doctorId });

    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" });
    }

    doctor.isAvailable = !doctor.isAvailable;

    await doctor.save();

    res
      .status(200)
      .json({ message: "Doctor availability updated.", success: true });
  } catch (error) {
    console.log("error while changing dr availability", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};
