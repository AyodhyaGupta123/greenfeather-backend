const mongoose = require("mongoose");
const Subcategory = require("./models/Subcategory"); // apna path de
const Category = require("./models/Category"); // apna path de
require('dotenv').config(); // agar MONGO_URI environment variable use karna ho

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
};

const addSubcategories = async () => {
  try {
    // Women category _id
    const womenCategoryId = "68e4c8370e273cddd5419b1b";

    const subcategories = [
        "Washing Machines",
        "Air Conditioners",
        "Refrigerators",
        "Kitchen Appliances",
        "Healthy Living",
        "Small Home Appliances",
        "Televisions",
        "Microwave Ovens",
        "Water Purifiers",
        "Vacuum Cleaners",
        "Irons & Garment Care",
        "Fans & Air Coolers",
        "Home Heaters",
        "Smart Home Devices",
      ];

    const subcategoryDocs = subcategories.map(name => ({
      name,
      categoryId: womenCategoryId,
      description: name,
    }));

    const result = await Subcategory.insertMany(subcategoryDocs);
    console.log(`Subcategories added: ${result.length}`);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
};

const run = async () => {
  await connectDB();
  await addSubcategories();
};

run();
