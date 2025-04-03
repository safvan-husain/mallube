import {Schema, model, Document, ObjectId, Types} from "mongoose";
import {z} from "zod";
import {ObjectIdSchema} from "../types/validation";

export const displayCategoryZodSchema = z.object({
    _id: z.instanceof(Types.ObjectId).optional(),
    name: z.string(),
    businessIndex: z.number(),
    freelancerIndex: z.number(),
    icon: z.string().url(),
    categories: z.array(z.union([ObjectIdSchema, z.instanceof(Types.ObjectId)])),
})

export type DisplayCategoryZod = z.infer<typeof displayCategoryZodSchema>;

export interface IDisplayCategory extends Document {
    name: string;
    // -1 means it is not enabled for business [home screen of the app]
    businessIndex: number;
    // -1 means it is not enabled for freelancer [freelance section]
    freelancerIndex: number;
    icon: string;
    categories: ObjectId[];
}

const displayCategorySchema = new Schema<IDisplayCategory>(
    {
        name: {
            type: String,
            required: true,
        },
        icon: {
            type: String,
        },
        businessIndex: {
            type: Number,
            default: -1,
        },
        freelancerIndex: {
            type: Number,
            default: -1,
        },
        categories: [
            {
                type: Schema.Types.ObjectId,
                ref: "categories",
            },
        ],
    },
    {
        timestamps: true,
    }
);

const DisplayCategory = model<IDisplayCategory>("displayCategories", displayCategorySchema);

export default DisplayCategory;
