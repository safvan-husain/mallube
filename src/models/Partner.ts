import mongoose, {Document, Model, Schema, Types} from 'mongoose';
import bcrypt from "bcryptjs";

export interface IPartner extends Document {
    _id: Types.ObjectId;
    phone: string;
    name: string;
    district: string;
    place: string;
    address: string;
    password: string;
    fcmToken?: string;
    pushNotificationStatus: boolean;
    //for app store / play complacency
    isDeleted: boolean;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const partnerSchema: Schema<IPartner> = new Schema(
    {
        phone: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        district: { type: String, required: true },
        place: { type: String, required: true },
        address: { type: String, required: true },
        password: { type: String, required: true },
        fcmToken: { type: String },
        pushNotificationStatus: { type: Boolean, default: true },
        isDeleted: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
partnerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare password
partnerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, this.password);
};

const Partner= mongoose.model<IPartner>('Partner', partnerSchema);
export { Partner };
