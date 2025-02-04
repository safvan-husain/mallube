import { Schema, model, Document } from "mongoose";

export interface IFeedback extends Document {
    _id: Schema.Types.ObjectId;
    storeId: Schema.Types.ObjectId;
    ourQuestion: string;
    answer: string;
}

const feedbackSchema = new Schema<IFeedback>(
    {
        storeId: {
            type: Schema.Types.ObjectId,
            ref: 'stores'
        },
        ourQuestion: {
            type: String,
            default: ""
        },
        answer: {
            type: String,
            required: true,
        }

    }
)

const FeedBack = model<IFeedback>('feedbacks', feedbackSchema);
export { FeedBack };