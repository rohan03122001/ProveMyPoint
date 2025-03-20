require("dotenv").config();
const express = require("express");
const cors = require("cors");
const researchRoutes = require("./routes/researchRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", researchRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
