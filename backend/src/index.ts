import "dotenv/config";
import express from "express";
import cors from "cors";
import uploadRouter from "./routes/upload";
import extractRouter from "./routes/extract";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/api/upload", uploadRouter);
app.use("/api/extract", extractRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`GrowEasy CSV Importer backend running on port ${PORT}`);
});
