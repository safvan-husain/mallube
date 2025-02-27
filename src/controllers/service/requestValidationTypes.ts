import {z} from 'zod';
import {Types} from 'mongoose';

export const getServicesQuerySchema = z.object({
    categories: z.string()
        .refine(val => Types.ObjectId.isValid(val), {
            message: "CategoryId must be a valid MongoDB ObjectId"
        }).optional(),
    latitude: z.string()
        .refine(val => !isNaN(parseFloat(val)), {
            message: "Latitude must be a valid number"
        }).transform(val => parseFloat(val)),
    longitude: z.string()
        .refine(val => !isNaN(parseFloat(val)), {
            message: "Longitude must be a valid number"
        }).transform(val => parseFloat(val)),
    skip: z.string()
        .refine(val => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
            message: "Skip must be a non-negative integer"
        })
        .optional()
        .default('0').transform(val => parseInt(val)),
    limit: z.string()
        .refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
            message: "Limit must be a positive integer"
        })
        .optional()
        .default('30').transform(val => parseInt(val))
});

export const createServiceCategorySchema = z.object({
    name: z.string().min(1, "Name is required"),
    icon: z.string().url("Icon must be a valid URL"),
    isShowOnHomePage: z.boolean().optional().default(true)
});

export const updateServiceCategorySchema = z.object({
    name: z.string().min(1, "Name is required").optional(),
    icon: z.string().url("Icon must be a valid URL").optional(),
    isShowOnHomePage: z.boolean().optional().default(true).optional()
});

export const createServiceSchema = z.object({
    categories: z.array(z.string().refine(val => Types.ObjectId.isValid(val), {
        message: "categoryId must be a valid MongoDB ObjectId"
    })).min(1, "At least one category is required"),
    name: z.string().min(1, "Name is required"),
    phone: z.string().min(10, "Phone is required with minimum 10 characters"),
    address: z.string().min(1, "Location name is required"),
    latitude: z.number(),
    longitude: z.number(),
    icon: z.string().url("Icon must be a valid URL"),
    instagramUrl: z.string().url().optional(),
    facebookUrl: z.string().url().optional(),
    startTime: z.number(),
    endTime: z.number(),
    bio: z.string().optional(),
});

export const updateServiceSchema = z.object({
    categories: z.array(z.string()
        .refine(val => Types.ObjectId.isValid(val), {
            message: "categoryId must be a valid MongoDB ObjectId"
        }))
        .optional(),
    name: z.string().min(1, "Name must not be empty").optional(),
    phone: z.string().min(10, "Phone must not be empty").optional(),
    address: z.string().min(1, "Location name must not be empty").optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    icon: z.string()
        .url("Icon must be a valid URL")
        .refine(val => val.startsWith("https://"), {
            message: "Icon URL must start with https://"
        })
        .optional(),
    isActive: z.boolean().optional(),
    instagramUrl: z.string().url().optional(),
    facebookUrl: z.string().url().optional(),
    startTime: z.number().optional(),
    endTime: z.number().optional(),
    bio: z.string().optional(),
}).refine(data => {
    // If either latitude or longitude is provided, both must be provided
    return !((data.latitude !== undefined && data.longitude === undefined) ||
        (data.latitude === undefined && data.longitude !== undefined));

}, {
    message: "Both latitude and longitude must be provided together",
    path: ["coordinates"]
});