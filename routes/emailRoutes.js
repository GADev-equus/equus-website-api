const express = require('express');
const emailController = require('../controllers/emailController');

const router = express.Router();

router.post('/contact', emailController.sendContactForm);

router.post('/send', emailController.sendEmail);

router.get('/status', emailController.getEmailServiceStatus);

module.exports = router;