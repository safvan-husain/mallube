import "dotenv/config";
import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import { initializeApp } from "firebase-admin/app";
import { credential } from "firebase-admin";
import mongoose from "mongoose";

import connectDb from "./config/db";
const serviceAccount = require('./secrets/serviceAccountKey.json');

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
import { notificationRouter } from "./routes/notificationRoute";
import './utils/common'

require("dotenv").config();
import { errorHandler, notFound } from "./middleware/error.middleware";
import { config } from "./config/vars";
import { periodicallyChangeStatusOfExpiredAdvertisemets } from "./controllers/advertisement/advertisementController";
import expressAsyncHandler from "express-async-handler";
import Store from "./models/storeModel";
import Category from "./models/categoryModel";
import Product from "./models/productModel";
import Advertisement from "./models/advertisementModel";
import AdvertisementPlan from "./models/advertismentPlanModel";
import { CustomerBill } from "./models/customerBillModel";
import TimeSlot from "./models/timeSlotModel";
import User from "./models/userModel";
import { searchRouter } from "./routes/searchRoutes";

const app = express();

connectDb();
initializeApp({ credential: credential.cert(serviceAccount) });

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
  res.status(200).send("Server is healthy");
});

const updateData = expressAsyncHandler(
  async (req, res) => {
    try {
      // Access the native collection object
      // const collection = TimeSlot.collection;

      // // Drop the index
      // await collection.dropIndex('storeId_1');
      // var collection = User.collection;
      // var result = collection.listIndexes();
      // await collection.dropIndex('email_1');
      // await Store.updateMany({ storeProviding: 'serviceBased' }, { service: true });
      var result = await Product.updateMany({ isEnquiryAvailable: { $exists: false }}, { isEnquiryAvailable: true });

      // let result = await Store.find({ phone: "8848305163" });
      // var result = await TimeSlot.inde
      // await Store.findOneAndUpdate({ phone: "8086527077" }, { service: true });
      res.status(200).json({ message: "Nothing to teansform", result });
    } catch (error) {
      res.status(400).json({ message: error })
    }
  }

)

app.use("/api/developer/transform", updateData);

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
app.use("/api/notification", notificationRouter)
app.use('/api/search', searchRouter);

app.use(notFound);
app.use(errorHandler);

periodicallyChangeStatusOfExpiredAdvertisemets();

const PORT = config.port || 4000;

app.listen(PORT, () => console.log(`API server listening at ${PORT}`));
