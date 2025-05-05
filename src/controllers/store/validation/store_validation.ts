import {z} from "zod";
import {Schema, Types} from "mongoose";
import {businessAccountTypeSchema, updateStoreSchema} from "../../../schemas/store.schema";

export const createStoreValidation = z.object({
    type: businessAccountTypeSchema.default('business'),
    isDeliveryAvailable: z.boolean().default(false),
    deliveryRadius: z.number().optional(),
});

export const updateProfileSchema =
    z
        .object({
            plainPassword: z
                .string()
                .min(6, {message: "Password should have at least 6 characters"})
                .optional(),
        })
        .merge(updateStoreSchema)

export const locationSchema = z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number()]),
});

export const ObjectIdOrStringSchema = z.union([z.string(), z.instanceof(Types.ObjectId)]);

export const savedStoreResponseSchema = z.object({
    _id: ObjectIdOrStringSchema,
    categories: z.union([z.array(z.instanceof(Schema.Types.ObjectId)), z.array(z.string())]),
    keyWords: z.string().optional(),
    deliveryRadius: z.number().optional(),
    subscriptionExpireDate: z.date().transform(e => e.getTime()), // Timestamp (converted in Flutter)
    serviceType: z.array(z.string()),
    serviceTypeSuggestion: z.string(),
    storeName: z.string(),
    uniqueName: z.string(),
    retail: z.boolean().default(false),
    isDeliveryAvailable: z.boolean().default(false),
    wholesale: z.boolean().default(false),
    service: z.boolean().default(false),
    location: locationSchema,
    city: z.string(),
    district: z.string(),
    address: z.string(),
    storeOwnerName: z.string(),
    phone: z.string(),
    whatsapp: z.string(),
    email: z.string(),
    instagram: z.string(),
    facebook: z.string(),
    bio: z.string(),
    shopImgUrl: z.string(),
    isAvailable: z.boolean(),
    visitors: z.number(),
    workingDays: z.array(z.string()).default([]),
    openTime: z.number(),
    closeTime: z.number(),
    type: z.enum(["freelancer", "business"]),
    isPushNotificationEnabled: z.boolean().default(false),
});

export type ZStore = z.infer<typeof savedStoreResponseSchema>;

export const EmployeeBusinessListItemSchema = z.object({
    _id: z.string(),
    storeName: z.string(),
    storeOwnerName: z.string(),
    categoriesName: z.string(),
    place: z.string(),
    district: z.string(),
});

export const employeeBusinessListItems = [
    {
        _id: "1",
        storeName: "QuickFix Electronics",
        storeOwnerName: "Rajesh Kumar",
        categoriesName: "Electronics Repair",
        place: "MG Road",
        district: "Bangalore",
    },
    {
        _id: "2",
        storeName: "FreshMart Groceries",
        storeOwnerName: "Anita Sharma",
        categoriesName: "Grocery",
        place: "Lajpat Nagar",
        district: "Delhi",
    },
    {
        _id: "3",
        storeName: "Style Hub",
        storeOwnerName: "Mohammed Rafiq",
        categoriesName: "Fashion & Apparel",
        place: "Charminar",
        district: "Hyderabad",
    },
    {
        _id: "4",
        storeName: "Book Haven",
        storeOwnerName: "Sneha Iyer",
        categoriesName: "Books & Stationery",
        place: "T. Nagar",
        district: "Chennai",
    },
   ];

// If you need the inferred TypeScript type
export type EmployeeBusinessListItem = z.infer<typeof EmployeeBusinessListItemSchema>;

export const changePasswordRequestSchema = z.object({
    password: z.string().min(6, {message: "Password should have at least 6 characters"}),
    hash: z.string()
})
