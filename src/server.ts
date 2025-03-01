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
import Product from "./models/productModel";
import { searchRouter } from "./routes/searchRoutes";
import { individualBussinessRoutes } from "./routes/individualBussinessRoutes";

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



async function addLocationFieldToAllProducts() {
  try {
    // 1. Fetch all products
    const products: any[] = await Product.find({}).populate('store');

    // 2. Iterate through each product
    for (const product of products) {
      if (product.store && product.store.location_v2) {
        // 3. Set the product's location to the store's location
        product.location = product.store.location_v2;

        // 4. Save the updated product
        await product.save();
        console.log(`Updated location for product ${product._id}:`, product.location);
      } else {
        console.warn(`Store or store location not found for product ${product._id}`);
      }
    }

    console.log('All product locations updated successfully.');
  } catch (error: any) {
    console.error('Error updating product locations:', error?.message);
    throw error; // Re-throw the error for handling upstream
  }
}

const updateData = expressAsyncHandler(
  async (req, res) => {
    try {
      
      var s = await Store.find({});
      res.status(200).json(s);
    } catch (error) {
      res.status(400).json({ message: error })
    }
  }

)

async function swithcCor() {
  const stores = await Store.find({});
      for (const doc of stores) {
        const [lat, lon] = doc.location.coordinates;
        await Store.updateOne(
          { _id: doc._id },
          { $set: { "location.coordinates": [lon, lat] } }
        );
      }
}

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
app.use('/api/service', individualBussinessRoutes);

app.use(notFound);
app.use(errorHandler);

periodicallyChangeStatusOfExpiredAdvertisemets();

const PORT = config.port || 4000;

app.listen(PORT, () => console.log(`API server listening at ${PORT}`));
