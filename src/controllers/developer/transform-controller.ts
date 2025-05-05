import expressAsyncHandler from "express-async-handler";
import Employee from "../../models/managerModel";
import AdminModel from "../../models/adminModel";

export const updateData = expressAsyncHandler(
    async (req, res) => {
        // let data = paginationSchema.parse(req.query);
        try {

            // let date = await Employee.updateMany({ dayTarget: { $exists: false}}, {
            //     dayTarget: 5,
            //     monthTarget: 10
            // });
            let data = await AdminModel.findOneAndUpdate({ email: "admin@gmail.com"}, { password: "admin@mallu1113"});
            res.status(200).json(data ?? { message: "no data"});
        } catch (error) {
            console.log(error)
            res.status(400).json({message: error})
        }
    }
)