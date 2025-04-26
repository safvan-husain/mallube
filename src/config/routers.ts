import {Express} from "express";
import {developerRoute} from "../routes/developer-routes";
import {otpRouter} from "../routes/otp-verification-route";
import adminRoutes from "../routes/adminRoutes";
import userRoutes from "../routes/userRoutes";
import staffRoutes from "../routes/staffRoutes";
import productRoutes from "../routes/productRoutes";
import categoryRoutes from "../routes/categoryRoutes";
import StoreRoutes from "../routes/storeRoutes";
import advertisementRoutes from "../routes/advertisementRoutes";
import utilsRoutes from "../routes/utilsRoutes";
import subscriptionRoutes from "../routes/subscriptionRoutes";
import bookingRoutes from "../routes/bookingRoutes";
import {notificationRouter} from "../routes/notificationRoute";
import {searchRouter} from "../routes/searchRoutes";
import {individualBussinessRoutes} from "../routes/individualBussinessRoutes";
import {buyAndSellRouter} from "../routes/buy_and_sell_route";
import {chatRoutes} from "../routes/messageRoutes";
import {employeeRouter} from "../routes/employee-router";
import {testRouter} from "../routes/test-router";
import {logger} from "./logger";
import {partnerRoute} from "../routes/partner-route";

export const loadRoutes = ({ app }: {app: Express}) => {
    app.use("/api/developer", developerRoute);
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
    //TODO: remove this below, and from flutter.
    app.use('/api/service', individualBussinessRoutes);
    app.use('/api/freelancer', individualBussinessRoutes);
    //buy-and-sell
    app.use('/api/bas', buyAndSellRouter);
    app.use('/api/chats', chatRoutes);
    app.use('/api/employee', employeeRouter)
    app.use('/api/v1/test', testRouter);
    app.use('/api/v1/partner', partnerRoute)

    logger.info("all routes setup done");
}