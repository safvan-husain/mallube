import {z} from "zod";

export const businessAccountTypeSchema = z.enum(['business', 'freelancer']);
export type BusinessAccountType = z.infer<typeof businessAccountTypeSchema>;

export const createStoreValidation = z.object({
    type: businessAccountTypeSchema.default('business'),
    isDeliveryAvailable: z.boolean().default(false),
    deliveryRadius: z.number().optional(),
});

//TODO: add rest later.
export const updateProfileSchema = z.object({
    password: z.string().min(6, { message: "password should be at least 6 char long"}).optional()
});

interface Location {
    coordinates: number[];
    type: string;
}

interface Store {
    _id: string;
    address: string;
    bio: string;
    categories: string[];
    category: string;
    city: string;
    closeTime: number;
    createdAt: string;
    district: string;
    email: string;
    facebook: string;
    instagram: string;
    isAvailable: boolean;
    isDeliveryAvailable: boolean;
    keyWords: string;
    location: Location;
    openTime: number;
    phone: string;
    retail: boolean;
    service: boolean;
    serviceType: string[];
    serviceTypeSuggestion: string;
    shopImgUrl: string;
    storeName: string;
    storeOwnerName: string;
    storeProviding: string;
    type: string;
    uniqueName: string;
    visitors: number;
    whatsapp: string;
    wholesale: boolean;
    workingDays: string[];
}
