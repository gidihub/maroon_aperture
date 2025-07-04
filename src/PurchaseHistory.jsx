import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { auth, db, functions } from "./firebase";
import { useAuth } from "./AuthContext";

export default function PurchaseHistory() {
  const [purchasedImages, setPurchasedImages] = useState([]);
  const [paymentStatus, setPaymentStatus] = useState({ hasPaid: false, paidImages: [], paidAt: null });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchPurchaseHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get payment status
        const checkPaymentStatus = httpsCallable(functions, 'checkPaymentStatus');
        const result = await checkPaymentStatus();
        setPaymentStatus(result.data);

        // If user has purchased images, fetch their details
        if (result.data.paidImages && result.data.paidImages.length > 0) {
          const imagesRef = collection(db, "images");
          const q = query(
            imagesRef, 
            where("name", "in", result.data.paidImages),
            orderBy("uploadedAt", "desc")
          );
          const snapshot = await getDocs(q);
          const imageData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setPurchasedImages(imageData);
        }
      } catch (error) {
        console.error('Error fetching purchase history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseHistory();
  }, [user]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading purchase history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">📦 Purchase History</h1>
          <a
            href="/dashboard"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </a>
        </div>

        {!paymentStatus.hasPaid ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-semibold mb-4">No Purchases Yet</h2>
            <p className="text-gray-600 mb-6">
              You haven't purchased any images yet. Visit the gallery to browse and buy high-quality images!
            </p>
            <a
              href="/gallery"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Browse Gallery
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Purchase Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Purchase Summary</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{paymentStatus.paidImages.length}</div>
                  <div className="text-sm text-gray-600">Total Images Purchased</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">${(paymentStatus.paidImages.length * 5).toFixed(2)}</div>
                  <div className="text-sm text-gray-600">Total Spent</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {paymentStatus.paidAt ? new Date(paymentStatus.paidAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Purchase Date</div>
                </div>
              </div>
            </div>

            {/* Purchased Images Grid */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Your Purchased Images</h2>
              {purchasedImages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">🔍</div>
                  <p className="text-gray-600">Loading your purchased images...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {purchasedImages.map(img => (
                    <div key={img.id} className="border border-green-200 bg-green-50 p-4 rounded-lg shadow-sm">
                      <div className="relative mb-3">
                        <img 
                          src={img.url} 
                          alt={img.name} 
                          className="w-full h-40 object-cover rounded-lg"
                        />
                        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                          ✓ OWNED
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-900 truncate" title={img.name}>
                          {img.name}
                        </h3>
                        
                        {Array.isArray(img.tags) && img.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {img.tags.slice(0, 3).map((tag, idx) => (
                              <span
                                key={idx}
                                className="bg-white text-gray-700 text-xs px-2 py-1 rounded-full border"
                              >
                                #{tag}
                              </span>
                            ))}
                            {img.tags.length > 3 && (
                              <span className="text-xs text-gray-500">+{img.tags.length - 3} more</span>
                            )}
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-500">
                          Purchased: {paymentStatus.paidAt ? new Date(paymentStatus.paidAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </div>
                        
                        <button
                          onClick={() => handleDownload(img)}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                        >
                          📥 Download Image
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Download All Button */}
            {purchasedImages.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <h3 className="text-lg font-semibold mb-4">Download All Images</h3>
                <p className="text-gray-600 mb-4">
                  Download all your purchased images at once. Each image will open in a new tab.
                </p>
                <button
                  onClick={() => {
                    purchasedImages.forEach(img => {
                      setTimeout(() => handleDownload(img), 500);
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  📦 Download All ({purchasedImages.length} images)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 