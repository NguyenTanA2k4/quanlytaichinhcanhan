const jwt = require("jsonwebtoken");
const token = jwt.sign({ sub: "demo-user" }, "abcdefghijklmnopqrstuvwxyz123456", { expiresIn: "365d" });
console.log("TOKEN=" + token);
