import express from "express";
import fileUpload from "express-fileupload";

import { s3 } from "../config/s3";
import { config } from "../config/vars";

const router = express.Router();

router.route("/upload").post(function (request, response) {
  const file = (request?.files?.file as fileUpload.UploadedFile) || null;
  // Return if the request doesn't contain the file
  if (!file) return response.sendStatus(400);

  // Destructure the content of the file object
  // if (Array.isArray(file)) return response.status(400).json({ error: "Multiple files are not allowed" })
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

  s3.putObject(
    {
      Body: fileContent, // The actual file content
      Bucket: config.s3BucketName,
      Key: uniqueFileName, // The name of the file
      ContentType: mimetype,
    },
    function (err) {
      if (err) {
        response.status(500);
      } else {
        response.status(200).json({ filename: uniqueFileName, url: `https://sin1.contabostorage.com/eb23de04d375490f89955c112d0422fd:mallumart/${uniqueFileName}` });
      }
    }
  );
});

export default router;
