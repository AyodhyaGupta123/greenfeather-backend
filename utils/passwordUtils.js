const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
  const saltRounds = 15;
  return await bcrypt.hash(password, saltRounds);
};


const comparePassword = async (enteredPassword, hashedPassword) => {
  return await bcrypt.compare(enteredPassword, hashedPassword);
};

<<<<<<< HEAD
module.exports = { hashPassword, comparePassword };
=======
module.exports = { hashPassword, comparePassword };
>>>>>>> origin/ayodhya-backend
