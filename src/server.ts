import "dotenv/config";
import express from "express";
import cors from "cors";

import connectDb from "./config/db";

import adminRoutes from "./routes/adminRoutes";
import userRoutes from "./routes/userRoutes";
import staffRoutes from "./routes/staffRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import StoreRoutes from "./routes/storeRoutes";
import advertisementRoutes from "./routes/advertisementRoutes";

import { errorHandler, notFound } from "./middleware/error.middleware";
import { config } from "./config/vars";

const app = express();

connectDb();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

//header
// app.use((req,res,next)=>{
//   res.header('Access-Control-Allow-Origin', "*")
//   res.header("Access-Control-Allow-Header","*")
//   next()
// })

app.use("/api/healthcheck", (req, res) => {
  res.status(200).send("Server is healthy");
});

app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/product", productRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/store", StoreRoutes);
app.use("/api/advertisement", advertisementRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = config.port || 4000;
app.listen(PORT, () => console.log(`API server listening at ${PORT}`));
