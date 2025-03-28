import {z} from 'zod';

const LATITUDE_REGEX = /^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?)$/;
const LONGITUDE_REGEX = /^[-+]?((?:1[0-7]\d|0?\d{1,2})(\.\d+)?|180(\.0+)?)$/;

// Custom error messages
const ERROR_MESSAGES = {
    latitude: 'Invalid latitude. Must be between -90 and 90.',
    longitude: 'Invalid longitude. Must be between -180 and 180.'
};

export const locationQuerySchema = z.object({
    latitude: z.string().trim()
        .refine(value => LATITUDE_REGEX.test(value), {
            message: ERROR_MESSAGES.latitude
        })
        .transform(value => parseFloat(value)),
    longitude: z.string()
        .trim()
        .refine(value => LONGITUDE_REGEX.test(value), {
            message: ERROR_MESSAGES.longitude
        })
        .transform(value => parseFloat(value))
})