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
import Category from "./models/categoryModel";
import { Service } from "./models/serviceModel";
import { buyAndSellRouter } from "./routes/buy_and_sell_route";
import { Server } from 'socket.io';
import { socketHandler } from "./controllers/web-socket/webSocketController";
import { chatRoutes } from "./routes/messageRoutes";
import { removeExpiredAds } from "./controllers/buy_and_sell/buy_and_sellController";


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
      let s = await removeExpiredAds();
      res.status(200).json(s);
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
app.use('/api/service', individualBussinessRoutes);
//buy-and-sell
app.use('/api/bas', buyAndSellRouter);
app.use('/api/chats', chatRoutes);

app.use(notFound);
app.use(errorHandler);

periodicallyChangeStatusOfExpiredAdvertisemets();

const PORT = config.port || 4000;

let server = app.listen(PORT, () => console.log(`API server listening at ${PORT}`));

const io = new Server(server);
socketHandler(io);

//to delelte expired ads (buy and sell), and it related images.
setInterval(() => {
  try {
  removeExpiredAds();
  } catch (error) {
   console.error(error) 
  }
}, 24 * 60 * 60 * 1000);

