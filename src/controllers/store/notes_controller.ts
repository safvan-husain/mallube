import { Response } from "express";
import asyncHandler from "express-async-handler";
import {ICustomRequest, TypedResponse} from "../../types/requestion";
import { Note } from "../../models/noteModel";
import { getIST } from "../../utils/ist_time";
import {
    createNoteRequestSchema,
    deleteNoteRequestSchema,
    NoteResponse,
    noteResponseSchema
} from "./validation/note-validation";
import {runtimeValidation} from "../../error/runtimeValidation";
import {onCatchError} from "../../error/onCatchError";
import {ObjectIdSchema} from "../../schemas/commom.schema";

export const createNote = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<NoteResponse>) => {
        const storeId = req.store!._id;
        const data = createNoteRequestSchema.parse(req.body);
        try {
            const note: any = await Note.create({
                ...data,
                storeId,
                timestamp: getIST()
            });
            res.status(201).json(runtimeValidation(noteResponseSchema, {
                ...note.toObject(),
                _id: note._id.toString(),
                createdAt: note.createdAt.getTime()
            }));
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const getNotesForStore = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<NoteResponse[]>) => {
        try {
            const notes = await Note
                .find({ storeId: req.store!._id })
                .lean();

            res.status(200).json(runtimeValidation(noteResponseSchema, notes.map(note => ({
                ...note,
                _id: note._id.toString(),
                createdAt: note.updatedAt.getTime()
            }))));
        } catch (error) {
            onCatchError(error, res);
        }
    }
)

export const updateNote = asyncHandler(
    async (req: ICustomRequest<any>, res: TypedResponse<NoteResponse>) => {
        const { id, title, body } = createNoteRequestSchema.partial().extend({
            id: ObjectIdSchema
        }).parse(req.body);
        try {
            const note = await Note
                .findByIdAndUpdate(id, { title, body, timestamp: getIST() }, { new: true})
                .lean();

            if(!note) {
                res.status(404).json({ message: "note not found"});
                return;
            }

            res.status(200).json(runtimeValidation(noteResponseSchema, {
                ...note,
                _id: note._id.toString(),
                createdAt: note.updatedAt.getTime()
            }));
        } catch (error) {
            console.log("error updating note", error);
            res.status(500).json({ message: "internal server error"});
        }
    }
)

export const deleteNote = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        const { noteIds } = deleteNoteRequestSchema.parse(req.body);
        try {
            await Note.deleteMany({ _id: { $in: noteIds }});
            res.status(200).json({ message: "deleted"});
        } catch (error) {
            onCatchError(error, res);
        }
    }
)