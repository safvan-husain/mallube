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
      $regex: `^${name}`,
      $options: "i",
    },
    parentId,
  });

  return Boolean(category);
}

export async function getCategoriesInFormat() {
  return await Category.aggregate([
    {
      $match: {
        parentId: { $exists: false },
      },
    },
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
        icon:1,
        isShowOnHomePage: 1,
        subcategories: {
          $map: {
            input: "$subcategories",
            as: "subcategory",
            in: {
              _id: "$$subcategory._id",
              name: "$$subcategory.name",
              isActive: "$$subcategory.isActive",
              icon:"$$subcategory.icon"
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
  return await Category.find(
    { parentId: { $exists: true }, isPending: true },
    { _id: 1, name: 1, parentId: 1 }
  ).populate({ path: "parentId", select: "name -_id" });
}
