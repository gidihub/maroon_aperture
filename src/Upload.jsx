// src/Upload.jsx
import { useState } from "react";
import { storage, db, auth } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [tags, setTags] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    setUploading(true);
    console.log("Starting upload for file:", file.name);

    try {
      const fileRef = ref(storage, `protected-images/${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      console.log("✅ File uploaded and URL obtained:", url);

      const user = auth.currentUser;
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(Boolean);

      const docData = {
        url,
        name: file.name,
        uid: user?.uid || "anonymous",
        uploadedAt: serverTimestamp(),
        tags: tagArray,
        isApproved: false, // Required for moderation workflow
      };

      await addDoc(collection(db, "images"), docData);
      alert("Upload successful and pending approval!");

      setFile(null);
      setTags("");
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-100 space-y-4 p-6">
      <h1 className="text-3xl font-bold">Upload Image</h1>

      <div className="bg-white p-6 rounded-lg shadow-md space-y-4 w-full max-w-md">
        <input
          type="file"
          onChange={handleFileChange}
          className="w-full border p-2 rounded"
          accept="image/*"
        />

        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Enter tags separated by commas (e.g. beach, sunset)"
          className="w-full border p-2 rounded"
        />

        {file && (
          <p className="text-sm text-gray-600">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className={`w-full px-6 py-2 rounded text-white transition-colors ${
            uploading || !file
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {uploading ? "Uploading..." : "Upload Image"}
        </button>
      </div>

      <button
        onClick={() => window.history.back()}
        className="text-blue-600 hover:underline mt-4"
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}
