
const SellerProfile = require("../models/SellerProfile");


const isValidGST = (gst) => {
  // Basic GSTIN regex (not 100% foolproof, but good)
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
};
const isValidPAN = (pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);
const isValidIFSC = (ifsc) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
const isValidPin = (pin) => /^[1-9][0-9]{5}$/.test(pin);

/**
 * Step 1: Submit Tax Details (GST or PAN)
 * body: { gstNumber?, panNumber?, nonGstCategory (bool) }
 */
exports.submitTaxDetails = async (req, res) => {
  console.log("Submit tax details request received");
  try {
    console.log("Body:", req.body);
    const userId = req.user._id;
    const { gstNumber, panNumber, panHolderName, nonGstCategory } = req.body;

    // validation
    if (nonGstCategory) {
      if (!panNumber || !isValidPAN(panNumber)) {
        return res.status(400).json({ message: "Invalid PAN number" });
      }
      if (!panHolderName || panHolderName.trim().length < 3) {
        return res.status(400).json({ message: "PAN holder name is required" });
      }
    } else {
      if (!gstNumber || !isValidGST(gstNumber)) {
        return res.status(400).json({ message: "Invalid GST number" });
      }
    }

    // find or create profile
    let profile = await SellerProfile.findOne({ userId });
    if (!profile) {
      profile = new SellerProfile({ userId });
    }

    profile.nonGstCategory = !!nonGstCategory;
    profile.gstNumber = nonGstCategory ? null : gstNumber;
    profile.panNumber = nonGstCategory ? panNumber : panNumber || null;
    profile.panHolderName = nonGstCategory ? panHolderName : null; // save PAN holder name only for non-GST

    // mark stepCompleted at least 1
    profile.stepCompleted = Math.max(profile.stepCompleted, 1);

    await profile.save();
    return res.json({
      success: true,
      message: "Tax details saved",
      stepCompleted: profile.stepCompleted,
      profile,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Step 2: Submit Store Name
 * body: { storeName }
 * Must have stepCompleted >= 1
 */


exports.submitStoreName = async (req, res) => {
  try {
    const userId = req.user._id;

 
    const { storeName, shortTitle, storeDescription } = req.body;

  

    if (!storeName || storeName.trim().length < 3) {
      return res.status(400).json({ message: "Store name is required (min 3 chars)" });
    }

  
    const countWords = (text) => text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

  
    if (!shortTitle || countWords(shortTitle) === 0 || countWords(shortTitle) > 10) {
      return res.status(400).json({ message: "Short title is required (1-10 words)" });
    }

    
    if (!storeDescription || countWords(storeDescription) === 0 || countWords(storeDescription) > 20) {
      return res.status(400).json({ message: "Store description is required (1-20 words)" });
    }
    
   

    
    const profile = await SellerProfile.findOne({ userId });
    
    if (!profile || profile.stepCompleted < 1) {
      return res.status(400).json({ message: "Complete tax details first" });
    }

   
    profile.storeName = storeName.trim();
    profile.shortTitle = shortTitle.trim();        
    profile.storeDescription = storeDescription.trim(); 

    
    profile.stepCompleted = Math.max(profile.stepCompleted, 2);
    await profile.save();

    return res.json({
      success: true,
      message: "Store details saved successfully",
      stepCompleted: profile.stepCompleted,
      profile,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || "Server error while saving store details" });
  }
};



exports.submitPickupAddress = async (req, res) => {
  try {
    const userId = req.user._id;

    const { address, city, stateName, pinCode, country } = req.body;

    // Validate input
    if (!address || !city || !stateName || !pinCode || !country) {
      return res.status(400).json({ message: "All address fields including country are required" });
    }

    if (!isValidPin(pinCode)) {
      return res.status(400).json({ message: "Invalid PIN code" });
    }

    const profile = await SellerProfile.findOne({ userId });

    if (!profile || profile.stepCompleted < 2) {
      return res.status(400).json({ message: "Complete previous steps first" });
    }

    profile.pickupAddress = { address, city, stateName, pinCode, country };
    profile.stepCompleted = Math.max(profile.stepCompleted, 3);

    await profile.save();

    return res.json({ success: true, message: "Pickup address saved", stepCompleted: profile.stepCompleted, profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Step 4: Submit Bank Details
 * body: { accountName, accountNumber, confirmAccountNumber, bankName, ifscCode }
 * Must have stepCompleted >= 3
 */
exports.submitBankDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(req.body)
    let { accountName, accountNumber, bankName, ifscCode } = req.body;

    if (!accountName || !accountNumber  || !bankName || !ifscCode) {
      return res.status(400).json({ message: "Please fill all bank details" });
    }
    
    // if (!isValidIFSC(ifscCode)) {
    //   return res.status(400).json({ message: "Invalid IFSC code" });
    // }

    const profile = await SellerProfile.findOne({ userId });
    if (!profile || profile.stepCompleted < 3) {
      return res.status(400).json({ message: "Complete previous steps first" });
    }

    profile.bankDetails = { accountName, accountNumber, bankName, ifscCode };
    profile.stepCompleted = Math.max(profile.stepCompleted, 4);
    await profile.save();

    return res.json({success: true, message: "Bank details saved, onboarding completed", stepCompleted: profile.stepCompleted, profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Get profile
 */
exports.getProfile = async (req, res) => {
  console.log("Fetching profile for user:", req.userId || (req.user && req.user._id));
  try {
    const userId = req.user._id;
    const profile = await SellerProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    console.log(profile)
    return res.json({ profile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};
