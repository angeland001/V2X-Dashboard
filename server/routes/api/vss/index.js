const express  = require("express");
const router    = express.Router();
const eventsRouter = require("./events");

router.use("/", eventsRouter);

module.exports = router;
