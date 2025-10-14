const mongoose = require("mongoose");
require("dotenv").config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const result = await mongoose.connection.collection("orders").updateOne(
      { _id: new mongoose.Types.ObjectId("68e4e663aadbd5a2fb70c1a1") },
      { $rename: { customer: "user" } }
    );

    console.log("✅ Rename result:", result);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    mongoose.connection.close();
  }
})();
