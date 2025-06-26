// src/Gallery.jsx
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import { db } from "./firebase";

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  useEffect(() => {
    const fetchImages = async () => {
      const imagesRef = collection(db, "images");
      const q = query(imagesRef, orderBy("uploadedAt", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setImages(data);
      setFiltered(data);
    };
    fetchImages();
  }, []);

  useEffect(() => {
    const results = images.filter(img => {
      const matchesName = img.name.toLowerCase().includes(searchName.toLowerCase());
      const tags = Array.isArray(img.tags) ? img.tags : [];
      const matchesTag = tagFilter
        ? tags.some(t => t.includes(tagFilter.toLowerCase()))
        : true;
      return matchesName && matchesTag;
    });
    setFiltered(results);
  }, [searchName, tagFilter, images]);

  const createCheckoutSession = async (image) => {
    try {
      console.log("🚀 Starting checkout session creation...");
      console.log("Image data:", { name: image.name, url: image.url });
      console.log("Origin:", window.location.origin);
      
      // Call the Firebase callable function
      const createSession = httpsCallable(functions, 'createCheckoutSession');
      console.log("📞 Calling Firebase function...");
      
      const result = await createSession({
        origin: window.location.origin,
        imageName: image.name,
        imageUrl: image.url,
      });

      console.log("✅ Function result:", result);
      console.log("📊 Result data:", result.data);

      const { url } = result.data;
      if (url) {
        console.log("🔗 Redirecting to:", url);
        window.location.href = url;
      } else {
        console.error("❌ No URL in response");
        alert("Error creating checkout session - no URL returned");
      }
    } catch (error) {
      console.error("❌ Stripe Checkout error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      alert(`Error creating checkout session: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">🖼 Image Gallery</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6 max-w-3xl mx-auto">
        <input
          type="text"
          placeholder="Search by filename..."
          value={searchName}
          onChange={e => setSearchName(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
        <input
          type="text"
          placeholder="Filter by tag..."
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="flex-1 p-2 border rounded"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.length === 0 ? (
          <p className="col-span-full text-center text-gray-600">No images found.</p>
        ) : (
          filtered.map(img => (
            <div key={img.id} className="border p-2 bg-white shadow rounded">
              <img src={img.url} alt={img.name} className="w-full h-40 object-cover rounded" />
              <div className="mt-2">
                <p className="text-sm font-medium truncate">{img.name}</p>
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
                <button
                  onClick={() => createCheckoutSession(img)}
                  className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded text-sm"
                >
                  Buy for $5
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
