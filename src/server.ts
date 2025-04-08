import "dotenv/config";
import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import {initializeApp} from "firebase-admin/app";
import {credential} from "firebase-admin";

import connectDb from "./config/db";
import bcrypt from "bcryptjs";
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
import {notificationRouter} from "./routes/notificationRoute";
import './utils/common'
import {errorHandler, notFound} from "./middleware/error.middleware";
import {config} from "./config/vars";
import {periodicallyChangeStatusOfExpiredAdvertisemets} from "./controllers/advertisement/advertisementController";
import expressAsyncHandler from "express-async-handler";
import Store from "./models/storeModel";
import Product from "./models/productModel";
import {searchRouter} from "./routes/searchRoutes";
import {individualBussinessRoutes} from "./routes/individualBussinessRoutes";
import {buyAndSellRouter} from "./routes/buy_and_sell_route";
import {Server} from 'socket.io';
import {socketHandler} from "./controllers/web-socket/webSocketController";
import {chatRoutes} from "./routes/messageRoutes";
import {removeExpiredAds} from "./controllers/user/buy_and_sell/buy_and_sellController";
import Temp from "./models/Path";
import {paginationSchema} from "./types/validation";
import {onCatchError} from "./controllers/service/serviceContoller";
import {z} from "zod";
import {otpRouter} from "./routes/otp-verification-route";
import User from "./models/userModel";

const serviceAccount = require('./secrets/serviceAccountKey.json');

require("dotenv").config();


const app = express();

let errorMessage = "nothing";


connectDb();
initializeApp({credential: credential.cert(serviceAccount)});

app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({extended: true}));
app.use(cors());

app.use(
    fileUpload({
        limits: {fileSize: 10 * 1024 * 1024},
        // createParentPath: true,
        abortOnLimit: true,
        responseOnLimit: 'max _ mb only',
        // useTempFiles: true, /// By default this module uploads files into RAM. Setting this option to True turns on using temporary files instead of utilising RAM. This avoids memory overflow issues when uploading large files or in case of uploading lots of files at same time.
    })
);

app.post("/api/temp", async (req, res) => {
    const {paths} = req.body;
    if (Array.isArray(paths)) {
        try {
            await Temp.push(paths);
            res.status(200).json({message: "success"});
        } catch (e) {
            console.log("error", e);
            res.status(500).json({message: "error", e});
        }
    } else {
        res.status(401).json({message: "what the f**k, pass lat, long"});
    }
});

app.get("/api/temp", async (req, res) => {
    try {
        res.status(200).json(await Temp.find());
    } catch (e) {
        console.log("error", e);
        res.status(500).json({message: "error", e});
    }
});

app.use("/api/healthcheck", (req, res) => {
    res.status(200).send(`Server is healthy but ${errorMessage}`);
});



const updateData = expressAsyncHandler(
    async (req, res) => {
        // let data = paginationSchema.parse(req.query);
        try {
            let s = await Store.find({ location: { exists: false }});
            res.status(200).json({s});
        } catch (error) {
            console.log(error)
            res.status(400).json({message: error})
        }
    }
)
app.get('/api/token', async (req, res) => {
    try {
        let m = await User.find({ authToken: { $exists: false }});
        for (let k of m) {
            k.authToken = k.generateAuthToken();
            await k.save();
        }
        const users = await User.find({}, { fullName: true, authToken: true });
        let s = await Store.find( { authToken: { $exists: false }});
        for (let j of s) {
            j.authToken = j.generateAuthToken();
            await j.save();
        }
        const stores = await Store.find({}, { storeName: true, authToken: true });
        res.status(200).json({ users, stores });
    } catch (e) {
        onCatchError(e, res);
    }
});

app.use("/api/developer/transform", updateData);

app.use('/api/otp', otpRouter);
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
try {
    socketHandler(io);
} catch (error: any) {
    console.log('socket error');
    errorMessage = error.toString();
    console.log(error);
}


//to delelte expired ads (buy and sell), and it related images.
setInterval(() => {
    try {
        removeExpiredAds();
    } catch (error) {
        console.error(error)
    }
}, 24 * 60 * 60 * 1000);

