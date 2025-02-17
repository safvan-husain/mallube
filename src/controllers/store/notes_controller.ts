import { Response } from "express";
import asyncHandler from "express-async-handler";
import { ICustomRequest } from "../../types/requestion";
import { Note } from "../../models/noteModel";
import { getIST } from "../../utils/ist_time";

export const createNote = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        const storeId = req.store?._id;
        const { title, body } = req.body;
        try {
            var note: any = new Note({
                title,
                body,
                storeId,
                timestamp: getIST()
            });
            note = await note.save()
            res.status(201).json(note);
        } catch (error) {
            console.log("error creating note", error);
            res.status(500).json({ message: "internal server error"});
        }
    }
)

export const getNotesForStore = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        const storeId = req.store?._id;
        try {
            const notes = await Note.find({ storeId });
            res.status(200).json(notes);
        } catch (error) {
            console.log("error retriving note", error);
            res.status(500).json({ message: "internal server error"});
        }
    }
)

export const updateNote = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        const { id, title, body } = req.body;
        try {
            var note = await Note.findByIdAndUpdate(id, { title, body, timestamp: getIST() });
            note!.body = body;
            note!.title = title;
            res.status(200).json(note);
        } catch (error) {
            console.log("error updating note", error);
            res.status(500).json({ message: "internal server error"});
        }
    }
)

export const deleteNote = asyncHandler(
    async (req: ICustomRequest<any>, res: Response) => {
        const { noteIds } = req.body;
        try {
            await Note.deleteMany({ _id: { $in: noteIds }});
            res.status(200).json({ message: "deleted"});
        } catch (error) {
            console.log("error delete note", error);
            res.status(500).json({ message: "internal server error"});
        }
    }
)