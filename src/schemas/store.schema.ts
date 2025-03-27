import * as z from "zod";
import {ObjectIdSchema} from "../types/validation";

const numericRegex = /^\d+$/;

export const addStoreSchema = z.object({
  storeName: z.string().trim().min(1, "shop name cannot be empty"),
  uniqueName: z
    .string()
    .trim()
    .min(1, "unique name cannot be empty")
    .max(30, "unique name cannot be longer than 30 characters")
    .toLowerCase()
    .regex(
      /^[a-z0-9-_]+$/,
      "Shop name can only contain lowercase letters, numbers, hyphens, and underscores"
    ),
  category: z.string(),
  subCategories: z.array(z.string()),
  retail: z.boolean().default(false),
  wholesale: z.boolean().default(false),
  latitude: z.number(),
  longitude: z.number(),
  district: z.string(), //enum set here
  city: z.string().trim().min(1, "city cannot be empty"),
  address: z.string().trim().optional(),
  storeOwnerName: z.string().trim().min(1, "shop owner name cannot be empty"),
  phone: z
    .string()
    .trim()
    .min(1, "phone number cannot be empty")
    .regex(numericRegex, "enter a valid phone number"),
  whatsapp: z
    .string()
    .min(10, "enter a valid whatsapp number")
    .regex(numericRegex, "enter a valid phone number"),
  email: z.string().max(0).or(z.string().email()).optional(),
  subscriptionPlan: z.string(), //enum set here
  bio: z.string().optional(),
  shopImgUrl: z.string(),
  otp: z.string().min(6, "invalid otp").max(6, "invalid otp"),
  service: z.boolean().default(false),
  isDeliveryAvailable: z.boolean().default(false),
  deliveryRadius: z.number().default(0),
  openTime: z.number(),
  closeTime: z.number(),
  workingDays: z.array(z.string()),
  categories: z.array(ObjectIdSchema).optional(),
  isAvailable: z.boolean().default(true),
});

export type IAddStoreSchema = z.infer<typeof addStoreSchema>;

const signUpStoreSchema = z.object({
  storeName: z.string().trim().min(1, "shop name cannot be empty"),
  serviceTypeSuggestion: z.string().optional(),
  uniqueName: z
    .string()
    .trim()
    .min(1, "unique name cannot be empty")
    .max(30, "unique name cannot be longer than 30 characters")
    .toLowerCase()
    .regex(
      /^[a-z0-9-_]+$/,
      "Shop name can only contain lowercase letters, numbers, hyphens, and underscores"
    ),
  category: z.string(),
   subCategories: z.array(z.string()),
  retail: z.boolean().default(false),
  wholesale: z.boolean().default(false),
  service: z.boolean().default(false),
  latitude: z.number(),
  longitude: z.number(),
  district: z.string(), //enum set here
  city: z.string().trim().min(1, "city cannot be empty"),
  address: z.string().trim().optional(),
  storeOwnerName: z.string().trim().min(1, "shop owner name cannot be empty"),
  phone: z
    .string()
    .trim()
    .min(1, "phone number cannot be empty")
    .regex(numericRegex, "enter a valid phone number"),
  whatsapp: z
    .string()
    .min(10, "enter a valid whatsapp number")
    .regex(numericRegex, "enter a valid phone number"),
  email: z.string().max(0).or(z.string().email()),
  bio: z.string().optional(),
  shopImgUrl: z.string(),
  password: z.string().min(6, "password must be atleast 6 characters long"),
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  storeProviding: z.enum(['productBased', 'serviceBased']).default("productBased"),
  isDeliveryAvailable: z.boolean().default(false),
  deliveryRadius: z.number().default(0),
  openTime: z.number(),
  closeTime: z.number(),
  workingDays: z.array(z.string()),
  categories: z.array(ObjectIdSchema).optional(),
  isAvailable: z.boolean().optional(),
});

export type ISignUpStoreSchema = z.infer<typeof signUpStoreSchema>;

export const checkDetailsAndSendOtp = addStoreSchema.pick({
  phone: true,
  uniqueName: true,
  email: true,
});

export type ICheckDetailsAndSendOtp = z.infer<typeof checkDetailsAndSendOtp>;

export const updateStoreSchema = addStoreSchema
  .omit({
    uniqueName: true,
    category: true,
    otp: true,
    phone: true
  })
  //   .omit({  : true })
  .partial();

export type IUpdateStoreSchema = z.infer<typeof updateStoreSchema>;
