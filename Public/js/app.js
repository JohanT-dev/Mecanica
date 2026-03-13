// app.js
import { db } from './firebase-config.js'; 
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// --- LÓGICA DEL MENÚ DE HAMBURGUESA ---
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (hamburgerBtn && mobileMenu) {
        // Reemplaza el antiguo toggleMenu()
        hamburgerBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('active');
            hamburgerBtn.classList.toggle('is-active');
        });

        // Cerrar menú al hacer clic en un enlace
        const navLinks = mobileMenu.querySelectorAll('a, button');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                hamburgerBtn.classList.remove('is-active');
            });
        });
    }
    
    // Iniciar la carga de datos del Dashboard
    cargarDashboardRealtime();
});

// --- LÓGICA DEL DASHBOARD (Puntuación de Salud) ---
function cargarDashboardRealtime() {
    const container = document.getElementById('cuerpo-tabla-vehiculos');
    if (!container) return;

    onSnapshot(collection(db, "Vehiculos"), (snapshot) => {
        container.innerHTML = ""; // Limpiar antes de actualizar
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            const fila = document.createElement('tr');
            
            // Determinar color de la barra de puntuación
            const score = data.puntuacion || 0;
            const color = score > 80 ? '#2ecc71' : score > 50 ? '#f1c40f' : '#e74c3c';

            fila.innerHTML = `
                <td>${data.marca || '---'}</td>
                <td>${doc.id}</td>
                <td>${data.tecnico || 'No asignado'}</td>
                <td>${data.ultimaRevision || 'Pendiente'}</td>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="background:#333; width:100px; height:8px; border-radius:4px;">
                            <div style="background:${color}; width:${score}%; height:100%; border-radius:4px;"></div>
                        </div>
                        <span>${score}%</span>
                    </div>
                </td>
                <td><span class="status-badge ${data.estadoActual}">${data.estadoActual}</span></td>
            `;
            container.appendChild(fila);
        });
    });
}