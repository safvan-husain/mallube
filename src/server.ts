import express from "express";
import adminRoutes from "./routes/adminRoutes";
import userRoutes from "./routes/userRoutes";
import staffRoutes from "./routes/staffRoutes";
import productRoutes from "./routes/productRoutes";
import categoryRoutes from "./routes/categoryRoutes";
import StoreRoutes from "./routes/storeRoutes";
import advertisementRoutes from './routes/advertisementRoutes'
import cors from "cors";
import connectDb from "./config/db";

const app = express();
const port = 4000;

app.use(express.json({ limit: "50mb" }));
app.use(cors());
connectDb();

//header
// app.use((req,res,next)=>{
//   res.header('Access-Control-Allow-Origin', "*")
//   res.header("Access-Control-Allow-Header","*")
//   next()
// })

app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/product", productRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/store", StoreRoutes);
app.use("/api/advertisement",advertisementRoutes)

app.listen(port, () => {
  console.log(`Server is running on https://localhost:${port}`);
});
