import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

async function inicializarReportes() {
    console.log("📊 Calculando estadísticas de la flota...");
    
    try {
        // Obtenemos todos los vehículos
        const querySnapshot = await getDocs(collection(db, "Vehiculos"));
        
        const stats = {
            bueno: { count: 0, lastDate: null },
            regular: { count: 0, lastDate: null },
            malo: { count: 0, lastDate: null }
        };

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const estado = data.estadoActual ? data.estadoActual.toLowerCase() : "";
            
            // Convertimos la fecha (manejando si es Timestamp de Firebase o String ISO)
            let fechaDoc = null;
            if (data.fechaRegistro) {
                fechaDoc = data.fechaRegistro.seconds 
                    ? new Date(data.fechaRegistro.seconds * 1000) 
                    : new Date(data.fechaRegistro);
            }

            // Clasificación lógica
            let cat = "";
            if (estado === "operativo") cat = "bueno";
            else if (estado === "mantenimiento") cat = "regular";
            else if (estado === "fuera de servicio") cat = "malo";

            if (cat) {
                stats[cat].count++;
                // Lógica para encontrar la fecha más reciente
                if (fechaDoc && (!stats[cat].lastDate || fechaDoc > stats[cat].lastDate)) {
                    stats[cat].lastDate = fechaDoc;
                }
            }
        });

        // Actualizar la interfaz
        actualizarCard("bueno", stats.bueno);
        actualizarCard("regular", stats.regular);
        actualizarCard("malo", stats.malo);

    } catch (error) {
        console.error("Error al generar el reporte:", error);
    }
}

function actualizarCard(id, data) {
    const countEl = document.getElementById(`count-${id}`);
    const dateEl = document.getElementById(`last-${id}`);

    if (countEl) countEl.innerText = data.count;
    
    if (dateEl) {
        if (data.lastDate) {
            const opciones = { day: '2-digit', month: 'short', year: 'numeric' };
            dateEl.innerText = data.lastDate.toLocaleDateString('es-ES', opciones);
        } else {
            dateEl.innerText = "Sin registros";
        }
    }
}

document.addEventListener('DOMContentLoaded', inicializarReportes);