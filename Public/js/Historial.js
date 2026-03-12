import { db } from './firebase-config.js';
import { collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

window.verHistorial = async function(placa) {
    const q = query(collection(db, "Inspecciones"), where("placa", "==", placa), orderBy("fecha", "desc"));
    const querySnapshot = await getDocs(q);
    const tabla = document.getElementById('tabla-historial');
    if(!tabla) return;
    
    tabla.innerHTML = "";
    querySnapshot.forEach((doc) => {
        const log = doc.data();
        tabla.innerHTML += `
            <tr>
                <td>${new Date(log.fecha).toLocaleDateString()}</td>
                <td>${log.kilometraje || '---'} km</td>
                <td>${log.estado || 'Inspección'}</td>
                <td><button class="btn-mini" onclick="alert('ID: ${doc.id}')">Detalles</button></td>
            </tr>`;
    });
};