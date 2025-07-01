// src/utils/auth.js
const apiKey = process.env.API_KEY;

module.exports = (req, res, next) => {
  const authHeader = req.headers["x-api-key"];

  if (!authHeader || authHeader !== apiKey) {
    return res.status(401).send("Unauthorized");
  }

  next();
};
