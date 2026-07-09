import { Router } from "express";
import { v4 as uuid } from "uuid";
import { upload } from "../middleware/upload";
import { ApiError } from "../middleware/errorHandler";
import { parseCsv } from "../services/csvParser";
import { RawCsvRow } from "../types/crm";

const router = Router();

// In-memory store mapping an uploadId -> parsed rows.
// Fine for a stateless/demo deployment; swap for Redis/DB for production scale.
const uploadStore = new Map<string, { headers: string[]; rows: RawCsvRow[]; createdAt: number }>();

// Periodically clear old uploads (1 hour TTL) so memory doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of uploadStore.entries()) {
    if (now - entry.createdAt > 60 * 60 * 1000) uploadStore.delete(id);
  }
}, 15 * 60 * 1000).unref();

router.post("/", upload.single("file"), (req, res, next) => {
  try {
    if (!req.file) {
      throw new ApiError(400, "No file uploaded. Field name must be 'file'.");
    }

    const content = req.file.buffer.toString("utf-8");
    const { headers, rows } = parseCsv(content);

    if (rows.length === 0) {
      throw new ApiError(400, "CSV file is empty or could not be parsed.");
    }

    const uploadId = uuid();
    uploadStore.set(uploadId, { headers, rows, createdAt: Date.now() });

    res.json({
      uploadId,
      headers,
      totalRows: rows.length,
      preview: rows.slice(0, 50),
    });
  } catch (err) {
    next(err);
  }
});

export { uploadStore };
export default router;
