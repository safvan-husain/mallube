import asyncHandler from "express-async-handler";
import { Request, Response, Router } from "express";
import ProductSearch from "../models/productSearch";
import Product from "../models/productModel";
import Category from "../models/categoryModel";
import Store from "../models/storeModel";

const router = Router();

const searchProductsAndStores = asyncHandler(
    async (req: any, res: any) => {
        try {
            const searchTerm = req.query.searchTerm;

            if (!searchTerm) {
                return res.status(400).json({ message: "Search term is required" });
            }

            // Save search term in ProductSearch collection
            const trimmedSearchTerm = searchTerm.toString().trim();
            const productSearch = await ProductSearch.findOne({
                productName: trimmedSearchTerm,
            });
            if (productSearch) {
                await ProductSearch.findOneAndUpdate(
                    { productName: trimmedSearchTerm },
                    { $inc: { searchCount: 1 } }
                );
            } else {
                await ProductSearch.create({
                    productName: trimmedSearchTerm,
                    searchCount: 1,
                });
            }

            // Search products
            const products = await Product.find({
                name: { $regex: trimmedSearchTerm, $options: "i" },
            }).populate("store", "storeName uniqueName location").lean();
            

            // Search stores by name, bio, and category
            const categories = await Category.find({
                name: { $regex: trimmedSearchTerm, $options: "i" }
            });
            const filteredProducts = products.filter(product => product.store); // Remove products with no store


            const categoryIds = categories.map(category => category._id);

            var tStores = await Store.find({
                $or: [
                    { storeName: { $regex: trimmedSearchTerm, $options: "i" } },
                    { bio: { $regex: trimmedSearchTerm, $options: "i" } },
                    { category: { $in: categoryIds } }
                ]
            }, {
                storeName: true, bio: true, address: true,
                openTime: true, closeTime: true, isDeliveryAvailable: true,
                instagram: true, facebook: true, whatsapp: true,
                phone: true, shopImgUrl: true,
                service: true, location: true, city: true
            }).populate("category", "name");

            const stores = tStores.map((e: any) => ({
                ...e.toObject(), 
                distance: 0,
                category: e.category.name, 
            }));

            res.status(200).json({
                products: filteredProducts,
                stores,
                total: filteredProducts.length + stores.length
            });
        } catch (error) {
            console.error("Error in combined search:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.route('/').get(searchProductsAndStores);

export { router as searchRouter };