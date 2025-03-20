import {Schema, model, Model} from "mongoose";

export interface ITemp {
    _id?: string;
    paths: Object[];
}

export interface ITempModel extends Model<ITemp> {
    push(newPaths: Object[]): Promise<ITemp>;
}

const tempSchema = new Schema<ITemp>(
    {
        paths: {
            type: [Object],
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Static method to push new values to the paths array
tempSchema.statics.push = async function (newPaths: Object[]) {
    const existingDoc = await this.findOne();

    if (existingDoc) {
        existingDoc.paths.push(...newPaths);
        return existingDoc.save();
    } else {
        return this.create({ paths: newPaths });
    }
};

const Temp = model<ITemp, ITempModel>("temps", tempSchema);

export default Temp;