import { z } from "zod";
import {istFromStringOrNumberSchema, ObjectIdSchema, phoneZodValidation} from "../../schemas/commom.schema";
import {pendingBusinessStatus} from "../../models/PendingBusiness";
import {Types} from "mongoose";
import {employeePrivilegeSchema} from "../../models/managerModel";

const tempSchema = z.object({
    businessType: z.enum(['freelancer', 'business']),
    provides: z.enum(['service', 'product']),
    workingDays: z.array(z.enum(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])),
    ownerName: z.string(),
    storeName: z.string(),
    categories: z.array(ObjectIdSchema),
    bio: z.string(),
    phone: z.string(),
    whatsapp: z.string(),
    email: z.string(),
    instagram: z.string(),
    facebook: z.string(),
    address: z.string(),
    city: z.string(),
    district: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    openTime: z.number(),
    closeTime: z.number(),
});

export const pendingStoreSchema = z.object({
    businessType: z.enum(['freelancer', 'business']),
    name: z.string(),
    category: ObjectIdSchema,
    note: z.string(),
    phone: z.string(),
    place: z.string(),
    city: z.string(),
    district: z.string(),
    nearBy: z.string().optional(),
})

export const updatePendingStoreSchema = pendingStoreSchema.omit({
    businessType: true,
}).extend({
    lastContacted: z.number().optional(),
    status: pendingBusinessStatus
}).partial()

export const pendingBusinessWholeResponseSchema = z.object({
    _id: z.union([z.instanceof(Types.ObjectId), z.string()]),
    businessType: z.enum(['freelancer', 'business']),
    name: z.string(),
    category: z.instanceof(Types.ObjectId),
    note: z.string(),
    phone: z.string(),
    place: z.string(),
    city: z.string(),
    district: z.string(),
    nearBy: z.string().optional(),
    status: pendingBusinessStatus, // You can use z.enum([...]) if you have specific statuses defined
    lastContacted: z.number().optional()
});

export const pendingStoreMinimalSchema = z.object({
    _id: z.instanceof(Types.ObjectId),
    name: z.string(),
    categoryName: z.string(),
    place: z.string(),
    city: z.string(),
    district: z.string(),
    phone: z.string(),
    lastContacted: z.number().optional(),
    status: pendingBusinessStatus
});

export type PendingStoreMinimal = z.infer<typeof pendingStoreMinimalSchema>;

export type PendingBusinessWholeRes = z.infer<typeof pendingBusinessWholeResponseSchema>;

export const staffAndBusinessCountSchema = z.object({
    businessCount: z.number(),
    staffUserName: z.string(),
    staffName: z.string(),
    place: z.string(),
    city: z.string(),
    district: z.string(),
    target: z.object({
        day: z.number(),
        month: z.number()
    })
})

export type StaffAndBusinessCount = z.infer<typeof staffAndBusinessCountSchema>

export const addedCountPerDateSchema = z.object({
    date: z.number(),
    count: z.number(),
    target: z.number()
});

export type AddedCountPerDate = z.infer<typeof addedCountPerDateSchema>;


export const allRangeOfDateSchema = z.object({
    day: istFromStringOrNumberSchema.optional(),
    month: istFromStringOrNumberSchema.optional(),
    startDate: istFromStringOrNumberSchema.optional(),
    endDate: istFromStringOrNumberSchema.optional(),
})

export const monthAndBusinessTypeSchema = z.object({
    month: istFromStringOrNumberSchema,
    businessType: z.enum(['freelancer', 'business']),
})

export const monthAndStaffIdSchema = z.object({
    staffId: ObjectIdSchema.optional(),
    businessType: z.enum(['freelancer', 'business']),
}).merge(allRangeOfDateSchema);


export const createEmployeeSchema = z.object({
    name: z.string(),
    username: z.string().transform(e => e.trim()),
    address: z.string(),
    place: z.string(),
    city: z.string(),
    district: z.string(),
    aadharNumber: z.string(),
    phone: phoneZodValidation,
    companyPhone: phoneZodValidation,
    workAreaName: z.string(),
    joinedDate: istFromStringOrNumberSchema,
    privilege: employeePrivilegeSchema.optional().default('staff'),
    manager: ObjectIdSchema.optional(),
    password: z.string().min(3, {message: "Password should be at least 3 characters long"}),
    dayTarget: z.number(),
    monthTarget: z.number(),
});

export const updateEmployeeSchema = z.object({
    resignedDate: istFromStringOrNumberSchema.optional()
}).merge(createEmployeeSchema).omit({
    joinedDate: true,
    aadharNumber: true,
    password: true,
}).partial();

export const employeeWholeDataResSchema = createEmployeeSchema.omit({
    password: true,
    joinedDate: true,
    privilege: true,
    manager: true
}).extend({
    joinedDate: z.number(),
    resignedDate: z.number().optional(),
    privilege: employeePrivilegeSchema,
    manager: z.instanceof(Types.ObjectId).optional(),
    _id: z.instanceof(Types.ObjectId)
})

export type EmployeeWholeDataRes = z.infer<typeof employeeWholeDataResSchema>

export const minimalManagerResponseForAdminSchema = z.object({
    _id: z.instanceof(Types.ObjectId),
    name: z.string(),
    username: z.string(),
    phone: z.string(),
    city: z.string(),
    district: z.string(),
    place: z.string(),
});

// Type inference (optional)
export type MinimalManagerResponseForAdmin = z.infer<typeof minimalManagerResponseForAdminSchema>;

export const businessCountPerStaffSchema = z.object({
    businessType: z.enum(['freelancer', 'business']),
}).merge(allRangeOfDateSchema);

export const pendingStoreQuerySchema = z.object({
    status: pendingBusinessStatus.optional(),
    createdBy: ObjectIdSchema.optional(),
    searchTerm: z.string().optional(),
    businessType: z.enum(['freelancer', 'business']),
})
    .merge(allRangeOfDateSchema)

export const pendingStoreDashBoardQuerySchema = z.object({

})

export const DashboardStatsSchema = z.object({
    today: z.number().nonnegative().optional().default(0),
    thisMonth: z.number().nonnegative().default(0),
    total: z.number().nonnegative().default(0),
});

export const FullDashboardStatsSchema = z.object({
    business: DashboardStatsSchema.default({}),
    freelancer: DashboardStatsSchema.default({}),
});

export const getEmployeeStoreQuerySchema = z.object({
    addedBy: ObjectIdSchema.optional(),
    searchTerm: z.string().optional(),
    businessType: z.enum(['freelancer', 'business']),
})
    .merge(allRangeOfDateSchema)


// Usage:
export type FullDashboardStats = z.infer<typeof FullDashboardStatsSchema>;

export const graphResultSchema = z.object({
    day: z.string(),
    count: z.number()
})

export const monthSchema = z.object({
    month: istFromStringOrNumberSchema
})

export const employeeIdAndMonth = z.object({
    id: ObjectIdSchema
}).merge(monthSchema);

export const employeeIdAndDay = z.object({
    id: ObjectIdSchema,
    day: istFromStringOrNumberSchema
})
