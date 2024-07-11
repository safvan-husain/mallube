import Store from "../../models/storeModel";

export async function getStoreByPhoneOrUniqueName(
  phone: string,
  uniqueName: string
) {
  return await Store.findOne({
    $or: [{ phone }, { uniqueName }],
  });
}

//   export const addStore = async (
//     req: ICustomRequest<IAddStoreSchema>,
//     res: Response
//   ) => {
//     const staffId = req?.user?._id;
//     const {
//       subscriptionPlan,
//       whatsapp,
//       city,
//       storeName,
//       uniqueName,
//       storeOwnerName,
//       shopImgUrl,
//       district,
//       address,
//       latitude,
//       longitude,
//       phone,
//       category,
//       bio,
//       wholesale,
//       retail,
//       email,
//       otp,
//     } = req.body;

//     await verifyOtp(phone, otp);

//     const phoneExistAndVerified = await Store.findOne({
//       phone,
//       isVerified: true,
//     }).countDocuments();

//     if (phoneExistAndVerified > 0) {
//       return res.status(409).json({ message: "Phone number already exist" });
//     }

//     const uniqueNameExist = await Store.findOne({
//       uniqueName,
//       isVerified: true,
//     }).countDocuments();
//     if (uniqueNameExist > 0)
//       return res.status(409).json({ message: "Unique name already exist" });

//     const location = {
//       type: "Point",
//       coordinates: [longitude, latitude],
//     };

//     const salt = await bcrypt.genSalt(10);
//     const password = await bcrypt.hash(phone, salt);

//     const store = {
//       storeName,
//       uniqueName,
//       storeOwnerName,
//       city,
//       address,
//       location,
//       phone,
//       whatsapp,
//       email,
//       password,
//       shopImgUrl,
//       category,
//       addedBy: staffId,
//       bio,
//       subscriptionPlan,
//       district,
//       subscription: {
//         plan: subscriptionPlan,
//         activatedAt: Date.now(),
//         expiresAt: getNextYearSameDateMinusOneDay(),
//       },
//       wholesale,
//       retail,
//       isVerified: false,
//     };

//     await Store.create(store);

//     res.status(201).json({ message: "Store created" });
//   };
