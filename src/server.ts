import "dotenv/config";
import express from "express";
import cors from "cors";
import fileUpload from "express-fileupload";
import {initializeApp} from "firebase-admin/app";
import {credential} from "firebase-admin";
import connectDb from "./config/db";
import {errorHandler, notFound} from "./middleware/error.middleware";
import {config} from "./config/vars";
import {
    scheduleExpireAdvertisementStatusChanger,
} from "./controllers/advertisement/advertisementController";
import {Server} from 'socket.io';
import {socketHandler} from "./controllers/web-socket/webSocketController";
import {removeExpiredAds} from "./controllers/user/buy_and_sell/buy_and_sellController";
import {loadRoutes} from "./config/routers";

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

app.use("/api/healthcheck", (req, res) => {
    res.status(200).send(`Server is healthy but ${errorMessage}`);
});

loadRoutes({ app });
//not found when no endpoint match, this should be below of all route setup
app.use(notFound);
app.use(errorHandler);
scheduleExpireAdvertisementStatusChanger();

const PORT = config.port || 4000;

export const server = app.listen(PORT, () => console.log(`API server listening at ${PORT}`));

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