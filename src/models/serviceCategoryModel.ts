import { Schema, model, Document } from "mongoose";
import { z } from "zod";

const ServiceCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  isShowOnHomePage: z.boolean(),
  icon: z.string().min(1, "Icon is required"),
});

export const validateServiceCategory = (data: unknown) => ServiceCategorySchema.parse(data);


export interface IServiceCategory extends Document {
  name: string;
  isShowOnHomePage: boolean;
  icon: string;
  index: number;
}

const serviceCategorySchema = new Schema<IServiceCategory>(
  {
    name: {
      type: String,
      required: true,
    },
    isShowOnHomePage: {
      type: Boolean,
      default: false,
      required: true,
    },
    icon: {
      type: String,
    },
    index: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ServiceCategory = model<IServiceCategory>("serviceCategories", serviceCategorySchema);

// export { ServiceCategory };