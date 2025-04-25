import expressAsyncHandler from "express-async-handler";
import Employee from "../../models/managerModel";

export const updateData = expressAsyncHandler(
    async (req, res) => {
        // let data = paginationSchema.parse(req.query);
        try {

            let date = await Employee.updateMany({ dayTarget: { $exists: false}}, {
                dayTarget: 5,
                monthTarget: 10
            });
            res.status(200).json(date);
        } catch (error) {
            console.log(error)
            res.status(400).json({message: error})
        }
    }
)