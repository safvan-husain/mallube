import { z} from 'zod';

export const createAdsPlanSchema = z.object({
    name: z.string().min(1),
    price: z.number(),
    offerPrice: z.number().optional(),
    //duration in hours
    duration: z.number(),
    //when radius null, it means unlimited radius.
    maxRadius: z.number().optional(),
    message: z.string().optional(),
});