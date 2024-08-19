import { Request, Response } from "express";
import Specialisation from "../../models/specialisationModel";

export const fetchAllSpecialisation = async (req: Request, res: Response) => {
  try {
    const response = await Specialisation.find({});

    if (response.length === 0)
      return res.status(404).json({success:false, message: "Specialisations not found" });

    res.status(200).json(response);
  } catch (error) {
    console.log("error while fetching specialisation ", error);
    res.status(500).json({ message: "Internal server error ", error });
  }
};

export const addSpecialisation = async (req:Request,res:Response) => {
    try {
        const {specialisation} = req.body;

        const specialisationExist = await Specialisation.find({name:specialisation}) 

        if(specialisationExist) return res.status(409).json({message:"Specialisation already exist"})

            const newSpecialisation = new Specialisation({name:specialisation})
        await newSpecialisation.save();
        res.status(201).json({message:"Specialisation added successfully",data:newSpecialisation})
        
    } catch (error) {
    console.log("error while fetching specialisation ", error);
    res.status(500).json({ message: "Internal server error ", error });
    }
}