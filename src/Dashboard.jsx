// src/Dashboard.jsx
import { useState, useEffect } from "react";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "./firebase";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth)
      .then(() => {
        alert("Logged out successfully");
        navigate("/");
      })
      .catch((error) => {
        console.error("Logout error:", error.message);
      });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-100 space-y-4">
      <h1 className="text-4xl font-bold">Welcome to your Dashboard 🎉</h1>
      <p className="text-lg text-gray-700">Logged in as: {user?.email}</p>
      
      <div className="flex space-x-4">
        <button
          onClick={() => navigate("/upload")}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Upload Images
        </button>
        <button
          onClick={() => navigate("/gallery")}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          View Gallery
        </button>
        <button
          onClick={() => navigate("/setup-admin")}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
        >
          Setup Admin
        </button>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
