// src/AdminPanel.jsx
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

export default function AdminPanel() {
  const [pendingImages, setPendingImages] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchPending = async () => {
      const q = query(collection(db, "images"), where("isApproved", "==", false));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingImages(data);
    };

    fetchPending();
  }, [user]);

  const approveImage = async (id) => {
    const imageRef = doc(db, "images", id);
    await updateDoc(imageRef, { isApproved: true });
    setPendingImages(prev => prev.filter(img => img.id !== id));
  };

  const rejectImage = async (id) => {
    const imageRef = doc(db, "images", id);
    await updateDoc(imageRef, { isApproved: false, rejected: true });
    setPendingImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">🛠 Admin Approval Panel</h1>
      {pendingImages.length === 0 ? (
        <p className="text-gray-600">No pending images.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {pendingImages.map((img) => (
            <div key={img.id} className="bg-white p-4 rounded shadow">
              <img src={img.url} alt={img.name} className="w-full h-40 object-cover rounded" />
              <p className="mt-2 text-sm font-medium truncate">{img.name}</p>
              {Array.isArray(img.tags) && img.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {img.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approveImage(img.id)}
                  className="flex-1 bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => rejectImage(img.id)}
                  className="flex-1 bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
                >
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
