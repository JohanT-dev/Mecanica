import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    doc, 
    updateDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Configuración de IDs de tablas para el barrido automático
const TABLAS_INSPECCION = ['electrico', 'accesorios', 'externa'];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener placa de la URL (ej: ?placa=ABC-123)
    const params = new URLSearchParams(window.location.search);
    const placa = params.get('placa') || "SIN-PLACA";
    
    const placaDisplay = document.getElementById('placa-vehiculo');
    if (placaDisplay) placaDisplay.innerText = placa;

    // 2. Manejar el envío del formulario
    const form = document.getElementById('form-inspeccion');
    if (form) {
        form.addEventListener('submit', guardarReporteFirebase);
    }
});

async function guardarReporteFirebase(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('.btn-submit');
    btn.disabled = true;
    btn.innerText = "⏳ Sincronizando con la nube...";

    try {
        const placa = document.getElementById('placa-vehiculo').innerText;
        const kilometraje = parseInt(document.getElementById('km-input').value);
        const observaciones = document.getElementById('obs-tecnicas').value;
        const estadoFinal = document.querySelector('input[name="estado-final"]:checked').value;
        const fechaManual = document.getElementById('fecha-inspeccion').value;

        // --- RECOPILACIÓN DINÁMICA DE TABLAS ---
        const resultadosChecklist = {};

        TABLAS_INSPECCION.forEach(idSubtabla => {
            const tbody = document.getElementById(`tabla-${idSubtabla}`);
            if (tbody) {
                resultadosChecklist[idSubtabla] = {};
                const filas = tbody.querySelectorAll('tr');
                
                filas.forEach(fila => {
                    const nombreItem = fila.cells[0].innerText;
                    const seleccion = fila.querySelector('input[type="radio"]:checked')?.value || "N/A";
                    resultadosChecklist[idSubtabla][nombreItem] = seleccion;
                });
            }
        });

        // --- ESTRUCTURA DE LA INSPECCIÓN ---
        const nuevaInspeccion = {
            vehiculo_placa: placa,
            datos_control: {
                kilometraje: kilometraje,
                fecha_inspeccion: fechaManual || new Date().toISOString(),
                tecnico_asignado: "Johny" // Puedes cambiar esto por un input si lo agregas
            },
            checklist: resultadosChecklist,
            diagnostico: {
                estado_final: estadoFinal,
                observaciones_tecnicas: observaciones
            },
            creado_el: serverTimestamp() // Fecha oficial de Firebase
        };

        // 1. Guardar en la colección "Inspecciones"
        await addDoc(collection(db, "Inspecciones"), nuevaInspeccion);

        // 2. Actualizar el "Estado Actual" del vehículo principal
        const vehiculoRef = doc(db, "Vehiculos", placa);
        await updateDoc(vehiculoRef, {
            estadoActual: estadoFinal,
            ultimoKilometraje: kilometraje,
            ultimaRevision: serverTimestamp()
        });

        alert("✅ Reporte guardado con éxito en FlotaPro.");
        window.location.href = "../../index.html";

    } catch (error) {
        console.error("Error al guardar en Firebase:", error);
        alert("❌ Error de conexión: No se pudo guardar el reporte.");
        btn.disabled = false;
        btn.innerText = "💾 Guardar Reporte Completo";
    }
}