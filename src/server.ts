import "dotenv/config";
import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";

import connectDb from "./config/db";

import adminRoutes from "./routes/adminRoutes";
import userRoutes from "./routes/userRoutes";
import staffRoutes from "./routes/staffRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import StoreRoutes from "./routes/storeRoutes";
import advertisementRoutes from "./routes/advertisementRoutes";
import utilsRoutes from "./routes/utilsRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes"
import bookingRoutes from './routes/bookingRoutes'
import './utils/common'

require("dotenv").config();
import { errorHandler, notFound } from "./middleware/error.middleware";
import { config } from "./config/vars";

const app = express();

connectDb();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use(
  fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 },
    // createParentPath: true,
    abortOnLimit: true,
    responseOnLimit: 'max _ mb only',
    // useTempFiles: true, /// By default this module uploads files into RAM. Setting this option to True turns on using temporary files instead of utilising RAM. This avoids memory overflow issues when uploading large files or in case of uploading lots of files at same time.
  })
);

app.use("/api/healthcheck", (req, res) => {
  res.status(200).send("Server is healthy and CI CD is working");
});

app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/product", productRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/store", StoreRoutes);
app.use("/api/advertisement", advertisementRoutes);
app.use("/api/utils", utilsRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/booking", bookingRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = config.port || 4000;

app.listen(PORT, () => console.log(`API server listening at ${PORT}`));
