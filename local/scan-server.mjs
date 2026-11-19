// Serves a one-page dummy PDF on http://127.0.0.1:4020/scan.pdf so local mail items have a scan to show.
// Started by local/start.sh; local:states points dummy mail at it. Local only.
import { startPdfServer } from '../apps/backend/tests/journey/lib.mjs';
const port = Number(process.env.LOCAL_SCAN_PORT || 4020);
try { await startPdfServer(port); console.log(`Dummy scans  http://127.0.0.1:${port}/scan.pdf`); }
catch { console.log(`Port ${port} in use; assuming the dummy scan server is already running.`); process.exit(0); }
