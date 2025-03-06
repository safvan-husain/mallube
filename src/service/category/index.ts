import Category from "../../models/categoryModel";

export async function isParentCategory(_id: string) {
  try {
    const category = await Category.findOne({
      _id,
      parentId: { $exists: false },
    });

    return !!category;
  } catch (error) {
    return error;
  }
}

export async function isDuplicateCategory(
  name: string,
  parentId: string | undefined
): Promise<Boolean> {
  const category = await Category.findOne({
    name: {
      $regex: new RegExp(`^${name}$`, "i"),
    },
    parentId,
  });

  return Boolean(category);
}

export async function getCategoriesInFormat({ isActive = false, isStoreOnly = false, isFreelancerOnly = false }) {
  const matchStage: {
    $match: any;
  } = {
    $match: {
      parentId: { $exists: false },
      isPending: false,
      isDeclined: false,
      ...(isStoreOnly ? { isEnabledForStore: true, subCategoryType: 'store' } : {}),
      ...(isFreelancerOnly ? { isEnabledForIndividual: true, subCategoryType: 'store' } : {}),
    },
  };

  if (isActive) {
    matchStage.$match.isActive = true;
  }
  return await Category.aggregate([
    matchStage,
    {
      $lookup: {
        from: "categories", // Assuming the collection name is "categories"
        localField: "_id",
        foreignField: "parentId",
        as: "subcategories",
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        isActive: 1,
        icon: 1,
        isShowOnHomePage: 1,
        isEnabledForIndividual: 1,
        isEnabledForStore: 1,
        subcategories: {
          $map: {
            input: {
              $filter: {
                input: "$subcategories",
                as: "subcategory",
                cond: {
                  $and: [
                    { $eq: ["$$subcategory.isPending", false] },
                    { $eq: ["$$subcategory.isDeclined", false] }
                  ]
                },
              },
            },
            as: "subcategory",
            in: {
              _id: "$$subcategory._id",
              name: "$$subcategory.name",
              isActive: "$$subcategory.isActive",
              icon: "$$subcategory.icon",
              subType: "$$subcategory.subCategoryType",
              isEnabledForIndividual: "$$subcategory.isEnabledForIndividual",
              isEnabledForStore: "$$subcategory.isEnabledForStore",
            },
          },
        },
      },
    },
  ]);
}

export async function listActiveMainCategories() {
  return await Category.find(
    { parentId: { $exists: false }, isActive: true },
    { _id: 1, name: 1 }
  );
}

export async function listAllSubCategories(id: string) {
  return await Category.find(
    { parentId: id },
    {
      _id: 1,
      name: 1,
      isActive: 1,
      isPending: 1,
    }
  );
}

export async function listActiveSubCategories(id: string) {
  return await Category.find(
    { parentId: id, isActive: true, isPending: false },
    {
      _id: 1,
      name: 1,
    }
  );
}



export async function listPendingSubCategories() {
  return await Category.aggregate([
    {
      $match: {
        $or: [
          { parentId: { $exists: true }, isPending: true },
          { parentId: { $exists: false }, isPending: true },
        ],
      },
    },
    {
      $lookup: {
        from: "categories", // Collection name for categories
        localField: "parentId",
        foreignField: "_id",
        as: "parent",
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        isDeclined: 1,
        isPending: 1,
        subCategoryType: 1,
        parentId: { $ifNull: ["$parentId", null] },
        icon: {
          $cond: {
            if: { $gt: [{ $size: "$parent" }, 0] }, // Check if parent exists
            then: { $arrayElemAt: ["$parent.icon", 0] }, // Use parent's icon
            else: "$icon", // Use category's own icon
          },
        },
        parentName: {
          $cond: {
            if: { $gt: [{ $size: "$parent" }, 0] }, // Check if parent exists
            then: { $arrayElemAt: ["$parent.name", 0] }, // Use parent's name
            else: null, // No parent, so set null
          },
        },
      },
    },
  ]);
}
