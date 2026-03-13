// Importaciones compatibles con el navegador (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDIscuvYzPkfLje72y0onQq4MRlRuyaEkg",
  authDomain: "registro-de-flota.firebaseapp.com",
  projectId: "registro-de-flota",
  storageBucket: "registro-de-flota.firebasestorage.app",
  messagingSenderId: "80030689118",
  appId: "1:80030689118:web:be30ce41f5f650534591cf",
  measurementId: "G-13BHCBJXKM"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);


export const db = getFirestore(app);