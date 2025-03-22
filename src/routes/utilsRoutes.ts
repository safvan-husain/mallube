import express from "express";
import fileUpload from "express-fileupload";
const router = express.Router();
import  path from 'path';
import fs from 'fs' ;

router.route("/upload").post(function (request, response) {
    const file = (request?.files?.file as fileUpload.UploadedFile) || null;
    // Return if the request doesn't contain the file
    if (!file) return response.sendStatus(400);

    // Destructure the content of the file object
    const { name, mimetype, size, data } = file;
    // If `data` is a string, specify the correct encoding (e.g., 'utf8')
    const fileContent = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");

    // Remove spaces from the filename
    const sanitizedFileName = name.replace(/\s+/g, '_');

    // Generate a unique file name using current time and a random number
    const uniqueFileName = `${Date.now()}_${Math.floor(
        Math.random() * 1000
    )}_${sanitizedFileName}`;

    /* Add security checks (e.g. max size) here */

    // Define the static folder path (peer to project directory)
    const staticFolderPath = path.join(__dirname, '../../..', 'static');

    // Create the static folder if it doesn't exist
    if (!fs.existsSync(staticFolderPath)) {
        fs.mkdirSync(staticFolderPath, { recursive: true });
    }

    // Full path for the file
    const filePath = path.join(staticFolderPath, uniqueFileName);

    // Write the file to the static folder
    fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
            console.error('Error saving file:', err);
            response.status(500).json({ error: 'Failed to save file' });
        } else {
            // Construct the URL for accessing the file
            // This assumes you've set up your server to serve the static folder
            const fileUrl = `https://static.vendroo.in/${uniqueFileName}`;

            response.status(200).json({
                filename: uniqueFileName,
                url: fileUrl
            });
        }
    });
});

export default router;
