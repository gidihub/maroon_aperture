import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

export default function AdminDashboard() {
  console.log("AdminDashboard: rendered");
  
  const [images, setImages] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    getDocs(query(collection(db, "images"), orderBy("uploadedAt", "desc")))
      .then(snap => {
        const imageData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setImages(imageData);
        console.log('Images loaded:', imageData.length);
      });
    getDocs(query(collection(db, "payments"), orderBy("paidAt", "desc")))
      .then(snap => {
        const paymentData = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        setPayments(paymentData);
        console.log('Payments loaded:', paymentData.length);
      });
  }, []);

  return (
    <div className="min-h-screen p-6 bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Uploaded Images</h2>
        <table className="w-full bg-white shadow rounded">
          <thead><tr>
            <th className="border p-2">Name</th>
            <th className="border p-2">Uploaded At</th>
            <th className="border p-2">UID</th>
          </tr></thead>
          <tbody>
            {images.map(img => (
              <tr key={img.id}>
                <td className="border p-2">{img.name}</td>
                <td className="border p-2">{new Date(img.uploadedAt?.seconds * 1000).toLocaleString()}</td>
                <td className="border p-2">{img.uid}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2">Payment History</h2>
        <table className="w-full bg-white shadow rounded">
          <thead><tr>
            <th className="border p-2">User UID</th>
            <th className="border p-2">Paid?</th>
            <th className="border p-2">Paid At</th>
          </tr></thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.uid}>
                <td className="border p-2">{p.uid}</td>
                <td className="border p-2">{p.hasPaid ? '✅' : '❌'}</td>
                <td className="border p-2">{p.paidAt ? new Date(p.paidAt.seconds * 1000).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
