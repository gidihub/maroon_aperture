// src/Gallery.jsx
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "./firebase";

export default function Gallery() {
  const [images, setImages] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchName, setSearchName] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [paymentStatus, setPaymentStatus] = useState({ hasPaid: false, paidImages: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all images (including unapproved for debugging)
        const imagesRef = collection(db, "images");
        const q = query(imagesRef, orderBy("uploadedAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setImages(data);
        setFiltered(data);

        // Check user's payment status
        if (auth.currentUser) {
          const checkPaymentStatus = httpsCallable(functions, 'checkPaymentStatus');
          const result = await checkPaymentStatus();
          setPaymentStatus(result.data);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
    if (!auth.currentUser) {
      alert("You must be logged in to purchase images");
      return;
    }

    try {
      const createSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createSession({
        origin: window.location.origin,
        imageName: image.name,
        imageUrl: image.url,
      });

      const { url } = result.data;
      if (url) {
        window.location.href = url;
      } else {
        alert("Error creating checkout session - no URL returned");
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(`Error creating checkout session: ${error.message}`);
    }
  };

  const handleDownload = async (image) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      alert("You must be logged in");
      return;
    }

    try {
      const response = await fetch(
        `https://us-central1-${import.meta.env.VITE_FIREBASE_PROJECT_ID}.cloudfunctions.net/serveProtectedImage?imagePath=${encodeURIComponent(image.name)}&uid=${uid}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Download failed: ${errorText}`);
      }

      window.open(response.url, "_blank");
    } catch (err) {
      console.error('Download error:', err);
      alert("Download error: " + err.message);
    }
  };

  const hasUserPaidForImage = (imageName) => {
    return paymentStatus.paidImages.includes(imageName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-4 text-center">🖼 Image Gallery</h1>

      {paymentStatus.hasPaid && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 max-w-3xl mx-auto">
          <p className="text-center">
            ✅ You have purchased {paymentStatus.paidImages.length} image(s). You can download them anytime!
          </p>
        </div>
      )}

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
          filtered.map(img => {
            const isPurchased = hasUserPaidForImage(img.name);

            return (
              <div key={img.id} className={`border p-2 bg-white shadow rounded ${isPurchased ? 'ring-2 ring-green-400' : ''} ${!img.isApproved ? 'ring-2 ring-yellow-400' : ''}`}>
                <div className="relative">
                  <img src={img.url} alt={img.name} className="w-full h-40 object-cover rounded" />
                  {isPurchased && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      ✓ OWNED
                    </div>
                  )}
                  {!img.isApproved && (
                    <div className="absolute top-2 left-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                      ⏳ PENDING
                    </div>
                  )}
                </div>
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

                  {isPurchased ? (
                    <button
                      onClick={() => handleDownload(img)}
                      className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded text-sm font-medium"
                    >
                      📥 Download Now
                    </button>
                  ) : img.isApproved ? (
                    <button
                      onClick={() => createCheckoutSession(img)}
                      className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded text-sm font-medium"
                    >
                      💳 Buy for $5.00
                    </button>
                  ) : (
                    <div className="mt-2 w-full bg-gray-300 text-gray-600 py-2 px-3 rounded text-sm font-medium text-center">
                      ⏳ Awaiting Approval
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
