import { Schema, model, Document } from "mongoose";

interface INote extends Document {
    _id: Schema.Types.ObjectId;
    storeId: Schema.Types.ObjectId;
    title: string,
    body: string;
    timestamp: string;
    createdAt: Date;
    updatedAt: Date;
}

const noteSchema = new Schema<INote>(
    {
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'stores'
        },
        title: {
            type: String,
            required: true,
        },
        body: {
            type: String,
            default: ""
        },
        timestamp: {
            type: String,
            required: true,
        },

    },
    {
        timestamps: true
    }
)

export const Note = model<INote>('notes', noteSchema);
