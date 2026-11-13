# Verification Flow: Files Upload & Download (`files-upload-and-download`)

This verification guide validates direct multipart file uploads, three-step presigned uploads with determinate progress bars, and authenticated binary downloads on `/files`.

---

## Prerequisites

- Frontend running at `http://localhost:3000`.
- Authenticated session established (logged in as `member@example.com`).

---

## Verification Steps

### 1. Navigation & File List View

1. Navigate to `http://localhost:3000/files`.
2. **Assertion**: Page renders the File Manager view displaying existing uploaded files, file sizes, MIME types, and upload timestamps.

### 2. Direct Multipart Upload Strategy

1. Select the "Direct Upload" tab or toggle.
2. Choose a small test file (e.g., `document.txt` or `sample.json` < 1 MB).
3. Click "Upload File":
   - Inspect network request:
   - **Assertion**: Single `POST` request sent to `/api/v1/files/upload` with `Content-Type: multipart/form-data`.
   - **Assertion**: Upon completion, the new file appears in the file table with status `"ready"`.

### 3. Three-Step Presigned Upload Strategy with Progress Bar

1. Select the "Presigned Upload" tab or toggle.
2. Choose a larger test file (e.g., a 10 MB image or binary archive).
3. Click "Upload via Presigned URL":
   - **Step 1 (Presign)**:
     - Inspect network: `POST /api/v1/files/presign` with filename and file size.
     - Response returns record ID with status `"pending"` and a signed upload URL.
   - **Step 2 (Direct Storage PUT with Progress)**:
     - Inspect network: Direct `PUT` to the signed storage URL (`/_storage/...` or S3).
     - **Assertion**: UI displays a smooth determinate progress bar advancing from 0% to 100% based on `XMLHttpRequest.upload.onprogress` byte updates.
   - **Step 3 (Complete & Verification)**:
     - Inspect network: `POST /api/v1/files/{id}/complete`.
     - Backend verifies magic bytes and file size, promoting record to `"ready"`.
   - **Assertion**: Progress indicator resolves to a green checkmark and the file appears in the list.

### 4. Upload Cancellation / Abort

1. Start a presigned upload for a large file.
2. While the progress bar is at 30–50%, click the "Cancel" / "Abort" button.
3. **Assertion**:
   - The underlying `XMLHttpRequest` / upload stream is aborted immediately.
   - The progress bar displays a cancelled state.
   - No orphaned or corrupted file record is promoted to `"ready"`.

### 5. Authenticated Binary File Download

1. In the file table, locate a ready file and click the "Download" icon.
2. Inspect network request:
   - Request sent to `/api/v1/files/{id}/download` (or presigned storage URL) with authentication credentials.
   - Response headers include `Content-Disposition: attachment; filename="..."` and the correct MIME type (`image/png`, `application/pdf`, etc.).
3. **Assertion**: The browser downloads the binary file intact with matching byte length.
