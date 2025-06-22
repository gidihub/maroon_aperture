// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCorb_ekFjyRyYTXxABe8GPhi7dejkG7Yc",
  authDomain: "maroon-aperture.firebaseapp.com",
  projectId: "maroon-aperture",
  storageBucket: "maroon-aperture.appspot.com",
  messagingSenderId: "240313150587",
  appId: "1:240313150587:web:f02344b205bcb65aeac6de"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
