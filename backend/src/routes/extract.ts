import { Router } from "express";
import { ApiError } from "../middleware/errorHandler";
import { extractCrmRecords } from "../services/aiExtractor";
import { uploadStore } from "./upload";

const router = Router();

router.post("/", async (req, res, next) => {
  try {
    const { uploadId } = req.body as { uploadId?: string };

    if (!uploadId) {
      throw new ApiError(400, "uploadId is required in the request body.");
    }

    const entry = uploadStore.get(uploadId);
    if (!entry) {
      throw new ApiError(
        404,
        "Upload not found or expired. Please upload the CSV again."
      );
    }

    const { records, skipped, failedBatches } = await extractCrmRecords(
      entry.rows
    );

    res.json({
      totalRows: entry.rows.length,
      totalImported: records.length,
      totalSkipped: skipped.length,
      failedBatches,
      records,
      skipped,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
