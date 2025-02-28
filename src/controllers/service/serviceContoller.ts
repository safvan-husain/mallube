//this service is added by our team
import { calculateDistance } from "../../utils/interfaces/common";
import e, { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { ServiceCategory } from "../../models/serviceCategoryModel";
import { Service } from "../../models/serviceModel";
import { z } from "zod";
import {
    createServiceCategorySchema,
    createServiceSchema,
    getServicesQuerySchema,
    updateServiceCategorySchema,
    updateServiceSchema
} from "./requestValidationTypes";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

export const onCatchError = (error: any, res: Response) => {
    if (error instanceof z.ZodError) {
        res.status(400).json({
            message: "Validation error",
            errors: error.errors
        });
        return;
    }
    res.status(500).json({ message: "Internal server error", error });
}

export const createServiceCategory = asyncHandler(
    async (req: Request, res: Response) => {

        try {
            const { name, isShowOnHomePage, icon } = createServiceCategorySchema.parse(req.body);

            const largeIndexByFar = await ServiceCategory.findOne().sort({ index: -1 }).select('index');
            const nextIndex = largeIndexByFar ? largeIndexByFar.index + 1 : 1;
            const serviceCategory = await ServiceCategory.create({
                name,
                isShowOnHomePage,
                icon,
                index: nextIndex,
            });
            res.status(201).json(serviceCategory);
        } catch (error) {
            onCatchError(error, res);
        }
    }
);

export const getServiceCategory = asyncHandler(
    async (_: Request, res: Response) => {
        try {
            const serviceCategory = await ServiceCategory.find({}).sort({ index: 1 });
            res.status(201).json(serviceCategory);
        } catch (error) {
            res.status(500).json({ message: "Internal server error", error });
        }
    }
);

export const updateServiceCategory = asyncHandler(
    async (req: Request, res: Response) => {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            res.status(400).json({ message: "id must be a valid MongoDB ObjectId" });
            return;
        }
        try {
            const { name, isShowOnHomePage, icon } = updateServiceCategorySchema.parse(req.body);
            const serviceCategory = await ServiceCategory.findByIdAndUpdate(req.params.id, {
                name,
                isShowOnHomePage,
                icon,
            }, { new: true });
            if (!serviceCategory) {
                res.status(404).json({ message: "Couldn't find the category " })
                return;
            }
            res.status(201).json(serviceCategory);
        } catch (error) {
            res.status(500).json({ message: "Internal server error", error });
        }
    }
);

export const deleteServiceCategory = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "id must be a valid MongoDB ObjectId" });
            return;
        }
        try {
            let result = await ServiceCategory.findByIdAndDelete(id);
            if (!result) {
                res.status(404).json({ message: "Couldn't find the category " })
                return;
            }
            res.status(201).json({ message: "Service category deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Internal server error", error });
        }
    }
);

export const updateServiceCategoryIndex = asyncHandler(
    async (req: Request, res: Response) => {
        const { id } = req.body;
        const { index } = req.body;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: "id must be a valid MongoDB ObjectId" });
            return;
        }
        if (!index || isNaN(index)) {
            res.status(400).json({ message: "Index must be a number" });
            return;
        }
        try {
            let cat = await ServiceCategory.findById(id);
            if (!cat) {
                res.status(400).json({ message: "Service category not found" });
                return;
            }
            let tServiceCategory = await ServiceCategory.findOne({ index });
            if (tServiceCategory) {
                tServiceCategory.index = cat.index;
                await tServiceCategory.save();
                return;
            }
            cat.index = index;
            cat = await cat.save();
            res.status(201).json({ message: "Service category index updated successfully", category: cat });
        } catch (error) {
            res.status(500).json({ message: "Internal server error", error });
        }
    }
);

export const createServiceProfile = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const validatedData = createServiceSchema.parse(req.body);

            const isExist = await Service.findOne({ $or: [{ phone: validatedData.phone }, { username: validatedData.username }] });
            if (isExist) {
                let existingField = "";
                if (isExist.phone === validatedData.phone) {
                    existingField = "phone";
                } else {
                    existingField = "username";
                }
                res.status(401).json({ message: `A service person with same ${existingField} exist` });
                return;
            }
            const hashedPassword: string =
                await bcrypt.hash(validatedData.password, 10);
            validatedData.password = hashedPassword;

            let updateData = getServiceConvertedDataFromRequestData(validatedData);
            updateData.hashedPassword = hashedPassword;

            let service = new Service(updateData);
            service = await service.save();
            const authToken = service.generateAuthToken();
            res.status(201).json({ authToken });
        } catch (error) {
            onCatchError(error, res);
        }
    }
);

export const loginServiceProfile = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const { username, password } = req.body;
            const service = await Service.findOne({ $or: [{ phone: username }, { username }] });
            if (!service) {
                res.status(401).json({ message: "Invalid username or password" });
                return;
            }
            const isMatch = await bcrypt.compare(password, service.hashedPassword);
            if (!isMatch) {
                res.status(401).json({ message: "Invalid username or password" });
                return;
            }
            const authToken = service.generateAuthToken();
            res.status(200).json({ authToken });
        } catch (error) {
            onCatchError(error, res);
        }
    });

// Update a service
export const updateServiceProfile = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "id must be a valid MongoDB ObjectId" });
                return;
            }
            const validatedData = updateServiceSchema.parse(req.body);

            // Prepare update object
            const updateData = getServiceConvertedDataFromRequestData(validatedData);


            const updatedService = await Service.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (!updatedService) {
                res.status(404).json({ message: "Service not found" });
                return;
            }

            res.status(200).json(updatedService);
        } catch (error) {
            onCatchError(error, res);
        }
    }
);

// Delete a service
export const deleteServiceProfile = asyncHandler(
    async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(400).json({ message: "param (id) must be a valid MongoDB ObjectId" });
                return;
            }
            const deletedService = await Service.findByIdAndDelete(id);
            if (!deletedService) {
                res.status(404).json({ message: "Service not found" });
                return;
            }
            res.status(200).json({ message: "Service deleted successfully" });
        } catch (error) {
            res.status(500).json({ message: "Internal server error", error });
        }
    }
);


export const getSpecificServiceProfile = asyncHandler(
    async (req: any, res: Response) => {
        //using both param and req so it can be used both for staff/admin and individual.
        let { id } = req.params;
        if (!id) {
            id = req.requester._id;;
        }

        try {
            if (!mongoose.Types.ObjectId.isValid(id)) {
                res.status(401).json({ message: "id must be a valid MongoDB ObjectId" });
                return;
            }
            let service: any = await Service.findById(id, {
                name: true,
                username: true,
                location: true,
                address: true,
                phone: true,
                instagramUrl: true,
                facebookUrl: true,
                startTime: true,
                endTime: true,
                bio: true,
                city: true,
                district: true,
                icon: true,
                workingDays: true,
                whatsapp: true,
                email: true,
            })
                .populate('categories', 'name').lean();

            const { latitude, longitude } = req.query;

            //if latitude and longitude are provided, calculate distance (used for users)
            if (latitude && longitude) {
                let distance = calculateDistance(
                    parseFloat(latitude as string),
                    parseFloat(longitude as string),
                    service.location.coordinates[0],
                    service.location.coordinates[1],);
                    service.distance = distance.toFixed(2);
            }
            res.status(200).json(service);
        } catch (error) {
            console.log(error)
            onCatchError(error, res);
        }
    }
);

// Get all services
export const getServices = asyncHandler(
    async (req: Request, res: Response) => {

        try {
            const validatedQuery = getServicesQuerySchema.parse(req.query);
            const { categories, latitude, longitude, skip, limit } = validatedQuery;
            let filter: any = {};
            if (categories) {
                filter = { categories: { $in: [categories] } };
            }
            filter.location = {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [latitude, longitude],
                    },
                },
            };

            let tServices: any[] = await Service.find(filter, {
                name: true,
                location: true,
                address: true,
                phone: true,
                icon: true,
            })
                .skip(skip)
                .limit(limit)
                .populate('categories', 'name').lean();
            const services = tServices.map((e) => {
                const distance = calculateDistance(
                    latitude,
                    longitude, e.location.coordinates[0],
                    e.location.coordinates[1],);
                e.distance = distance.toFixed(2);
                return e;
            })
            res.json(services);
        } catch (error) {
            console.log(error)
            onCatchError(error, res);
        }
    }
);

function getServiceConvertedDataFromRequestData(validatedData: any) {
    const updateData: any = { ...validatedData };
    delete updateData.password;

    // If coordinates are being updated, update the location object
    if (validatedData.latitude !== undefined && validatedData.longitude !== undefined) {
        updateData.location = {
            type: "Point",
            coordinates: [validatedData.latitude, validatedData.longitude]
        };

        // Remove individual coordinate fields from update object
        delete updateData.latitude;
        delete updateData.longitude;
    }

    if (updateData.categoryId) {
        updateData.categoryId = new mongoose.Schema.ObjectId(updateData.categoryId);
    }
    return updateData;
}
