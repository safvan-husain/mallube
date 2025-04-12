import * as z from "zod";
import {ObjectIdSchema} from "../types/validation";

const numericRegex = /^\d+$/;

export const addStoreSchema = z.object({
  storeName: z.string().optional(),
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
  category: z.string().optional(),
  categories: z.array(ObjectIdSchema).default([]),
  subCategories: z.array(z.string()).default([]),
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
  bio: z.string().optional(),
  shopImgUrl: z.string(),
  service: z.boolean().default(false),
  isDeliveryAvailable: z.boolean().default(false),
  deliveryRadius: z.number().optional(),
  openTime: z.number(),
  closeTime: z.number(),
  workingDays: z.array(z.string()),
  isAvailable: z.boolean().default(true),
  serviceType: z.array(z.enum(['salon, beauty parlour & spa' , 'other']).default('other')),
  serviceTypeSuggestion: z.string().optional()
});

export const signUpStoreSchema = addStoreSchema.extend({
  password: z.string().min(6, "password must be atleast 6 characters long"),
});

export type IAddStoreSchema = z.infer<typeof addStoreSchema>;
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
    phone: true
  })
  //   .omit({  : true })
  .partial();

export type IUpdateStoreSchema = z.infer<typeof updateStoreSchema>;

export const reusableCreateStoreSchema = addStoreSchema.extend({
  plainPassword: z.string()
})

export type IReusableCreateStoreSchema = z.infer<typeof reusableCreateStoreSchema>
