import {Schema, model, Document} from "mongoose";
import jwt from "jsonwebtoken";
import {config} from "../config/vars";
import {BusinessAccountType} from "../controllers/store/validation/store_validation";

export type WorkingDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
//TODO: suggest the feature to dynamiclly showing the available service type in the front-end.
type ServiceType = 'salon, beauty parlour & spa' | 'other';

export interface IStore extends Document {
    type: BusinessAccountType;
    fcmToken?: string;
    storeName: string;
    uniqueName: string;
    storeOwnerName: string;
    address: string;
    city: string;
    phone: string;
    whatsapp: string;
    email: string;
    subscription: {
        plan: Schema.Types.ObjectId;
        activatedAt?: Date;
        expiresAt?: Date;
    };
    password: string;
    category: Schema.Types.ObjectId;
    subCategories: Schema.Types.ObjectId[];
    categories: Schema.Types.ObjectId[];
    addedBy: Schema.Types.ObjectId;
    visitors: number;
    shopImgUrl: string;
    retail?: boolean;
    wholesale?: boolean;
    service?: boolean;
    serviceType: ServiceType[];
    serviceTypeSuggestion: string;
    isActive: boolean; //this field will be used by admin to block and unblock a shop
    isAvailable: boolean; // this field will be used by store owner to change their shop status
    district: string;
    bio: string;
    workingDays: WorkingDay[];
    live: string;
    //in 24 format.
    openTime: number;
    closeTime: number;
    instagram: string;
    facebook: string;
    generateAuthToken: () => string;
    location: {
        type: string;
        coordinates: [number, number];
    };
    location_v2: {
        type: string;
        coordinates: [number, number];
    };
    createdAt?: Date;
    updatedAt?: Date;
    storeProviding?: "productBased" | "serviceBased";
    isDeliveryAvailable: boolean;
    deliveryRadius: number;
}

const storeSchema = new Schema<IStore>(
    {
        fcmToken: {
            type: String,
        },
        storeName: {
            type: String,
            required: true,
        },
        //TODO: remove.
        live: {
            type: String,
            default: ""
        },
        uniqueName: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: "categories",
        },
        categories: {
            type: [Schema.Types.ObjectId],
            ref: "categories",
            default: []
        },
        subCategories: {
            type: [Schema.Types.ObjectId],
            ref: "categories",
            default: []
        },
        retail: {type: Boolean, default: false},
        wholesale: {type: Boolean, default: false},
        service: {type: Boolean, default: false},
        serviceType: {type: [String], default: []},
        serviceTypeSuggestion: {
            type: String,
            default: ""
        },
        location: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number],
                required: true,
            },
        },
        location_v2: {
            type: {
                type: String,
                enum: ["Point"],
                default: "Point",
            },
            coordinates: {
                type: [Number],
            },
        },
        city: {
            type: String,
        },
        district: {
            type: String,
        },
        address: {
            type: String,
        },
        storeOwnerName: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        },
        whatsapp: {
            type: String,
            required: true,
        },
        email: {
            type: String,
        },
        instagram: {
            type: String,
            default: ''
        },
        facebook: {
            type: String,
            default: ''
        },
        bio: {
            type: String,
        },
        shopImgUrl: {
            type: String,
            default: "",
        },
        subscription: {
            plan: {
                type: Schema.Types.ObjectId,
                ref: "subscriptionplans",
            },
            activatedAt: Date,
            expiresAt: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
        password: {
            type: String,
        },
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: "staffs",
        },
        storeProviding: {
            type: String,
            default: "productBased"
        },
        visitors: {type: Number, default: 0},
        workingDays: {
            default: [],
            type: [String],
        },
        openTime: {
            type: Number,
            default: 0
        },
        closeTime: {
            type: Number,
            default: 0
        },
        isDeliveryAvailable: {
            type: Boolean,
            default: false,
        },
        type: {
            type: String,
            default: 'business',
        },
        deliveryRadius: {
            type: Number,
        }
    },
    {
        timestamps: true,
    }
);

// storeSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) {
//     next();
//   }
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.phone, salt);
// });

// GENERATE AUTH TOKEN
storeSchema.methods.generateAuthToken = function (): string {
    return jwt.sign({_id: this._id}, config.jwtSecret, {expiresIn: "7d"});
};

storeSchema.index({location: "2dsphere"});

const Store = model<IStore>("stores", storeSchema);

export default Store;
