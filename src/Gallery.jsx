// src/Gallery.jsx
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

export default function Gallery() {
  const [images, setImages] = useState([]);

  useEffect(() => {
    const fetchImages = async () => {
      const snapshot = await getDocs(collection(db, "images"));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setImages(data);
    };
    fetchImages();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Image Gallery</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {images.map(img => (
          <div key={img.id} className="bg-white p-4 rounded shadow">
            <img src={img.url} alt={img.name} className="w-full h-60 object-cover rounded" />
            <p className="mt-2 text-sm text-gray-600">{img.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
