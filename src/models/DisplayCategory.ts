import {Schema, model, Document, ObjectId} from "mongoose";

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
