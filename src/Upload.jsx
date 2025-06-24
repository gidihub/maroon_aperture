// src/Upload.jsx
import { useState } from "react";
import { storage, db, auth } from "./firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function Upload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");

    console.log("Starting upload for file:", file.name);
    setUploading(true);

    try {
      // Step 1: Upload to Storage
      console.log("Uploading to Firebase Storage...");
      const fileRef = ref(storage, `images/${file.name}`);
      await uploadBytes(fileRef, file);
      console.log("✅ File uploaded to Storage successfully");

      // Step 2: Get download URL
      console.log("Getting download URL...");
      const url = await getDownloadURL(fileRef);
      console.log("✅ Download URL obtained:", url);

      // Step 3: Save metadata to Firestore
      const user = auth.currentUser;
      console.log("Current user:", user?.email || "No user");
      console.log("Saving to Firestore...");
      
      const docData = {
        url,
        name: file.name,
        uid: user?.uid || "anonymous",
        uploadedAt: serverTimestamp(),
      };
      console.log("Document data:", docData);

      const docRef = await addDoc(collection(db, "images"), docData);
      console.log("✅ Document saved to Firestore with ID:", docRef.id);

      alert("Upload successful and saved to Firestore!");
      setFile(null); // Clear the file input
    } catch (err) {
      console.error("❌ Upload error:", err);
      console.error("Error details:", err.message);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-100 space-y-4 p-6">
      <h1 className="text-3xl font-bold">Upload Image</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
        <input 
          type="file" 
          onChange={handleFileChange} 
          className="w-full border p-2 rounded" 
          accept="image/*"
        />
        
        {file && (
          <p className="text-sm text-gray-600">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </p>
        )}
        
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className={`w-full px-6 py-2 rounded transition-colors ${
            uploading || !file 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          } text-white`}
        >
          {uploading ? "Uploading..." : "Upload Image"}
        </button>
      </div>
      
      <button
        onClick={() => window.history.back()}
        className="text-blue-600 hover:underline"
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}

