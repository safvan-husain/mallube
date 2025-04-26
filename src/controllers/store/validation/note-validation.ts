import { z } from 'zod';

export const createNoteRequestSchema = z.object({
    title: z.string(),
    body: z.string()
})

export const noteResponseSchema = z.object({
    _id: z.string(),
    title: z.string(),
    body: z.string(),
    createdAt: z.number(),
    //deprecated, delete if BApp not using anymore
    timestamp: z.string(),
})

export type NoteResponse = z.infer<typeof noteResponseSchema>;

export const deleteNoteRequestSchema = z.object({
    noteIds: z.array(z.string())
})