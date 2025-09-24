// Pure JS bcrypt adapter: works everywhere, no native build headaches.
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = Number(process.env.PASSWORD_SALT_ROUNDS || 12);

async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(plain, salt);
}

async function comparePassword(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

// Synchronous versions for compatibility with existing code
function hashPasswordSync(plain) {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

function comparePasswordSync(plain, hashed) {
  return bcrypt.compareSync(plain, hashed);
}

module.exports = {
  hashPassword,
  comparePassword,
  hashPasswordSync,
  comparePasswordSync
};
