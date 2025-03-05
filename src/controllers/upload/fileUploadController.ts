import { s3 } from "../../config/s3";
import { config } from "../../config/vars";
import fileUpload from "express-fileupload";

/**
 * Deletes a file from the S3 bucket.
 * @param {string} fileName - The name of the file to delete.
 * @returns {Promise<boolean>} - Returns true if deleted, false otherwise.
 */
export async function deleteFile(fileName: string): Promise<boolean> {
  if (!fileName) throw new Error("Filename is required");

  try {
    await s3.deleteObject({
      Bucket: config.s3BucketName,
      Key: fileName,
    }).promise();

    return true;
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    return false;
  }
}