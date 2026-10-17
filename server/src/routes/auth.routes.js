const express = require("express");
const authController = require("../controllers/auth.controller");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const { registerSchema, loginSchema } = require("../validators/auth.validator");

const router = express.Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.get("/me", authenticate, authController.getMe);

module.exports = router;
