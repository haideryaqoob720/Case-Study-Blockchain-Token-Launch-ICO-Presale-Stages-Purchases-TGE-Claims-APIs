/**
 * NOTE:
 * This part of the code is removed for portfolio purposes.
 * Full implementation is private.
 */

const express = require('express');
const router = express.Router();

router.post('/send-consultation', (_req, res) =>
  res.status(200).json({ message: 'Demo mode — feature removed' }));

module.exports = router;
