import { db } from './firebase-config.js';
import { collection, addDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const itemsConfig = {
    electrico: [
        'Aceite de Freno', 'Aceite de Motor', 'Agua / Coolant', 'Agua de reserva del Limpia Parabrisas',
        'Aceite de Powerstering', 'Escobillas', 'Batería', 'Luz Delantera Derecha', 
        'Luz Delantera Izquierda', 'Direccionales', 'Luces Intermitentes', 'Frenos'
    ],
    accesorios: ['Llanta de Repuesto', 'Triángulo', 'Inversora', 'Pipeta', 'Gato Hidráulico', 'Extintor'],
    externa: ['Puertas Laterales', 'Llantas', 'Espejos', 'Parabrisa', 'Tapicería', 'Carrocería']
};

document.addEventListener('DOMContentLoaded', () => {
    generarTablasUI();
    configurarDatosIniciales();
    document.getElementById('form-inspeccion').addEventListener('submit', manejarGuardadoCompleto);
});

function generarTablasUI() {
    Object.entries(itemsConfig).forEach(([seccion, items]) => {
        const contenedor = document.getElementById(`tabla-${seccion}`);
        if (!contenedor) return;
        items.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item}</td>
                <td class="td-radio"><input type="radio" name="${seccion}_${index}" value="B" required></td>
                <td class="td-radio"><input type="radio" name="${seccion}_${index}" value="R"></td>
                <td class="td-radio"><input type="radio" name="${seccion}_${index}" value="M"></td>
            `;
            contenedor.appendChild(tr);
        });
    });
}

function configurarDatosIniciales() {
    const params = new URLSearchParams(window.location.search);
    const placa = params.get('placa') || "PROTOTIPO";
    document.getElementById('placa-vehiculo').innerText = placa;
    document.getElementById('fecha-inspeccion').value = new Date().toISOString().slice(0, 16);
}

async function manejarGuardadoCompleto(e) {
    e.preventDefault();
    const btn = e.target.querySelector('.btn-submit');
    btn.disabled = true;
    btn.innerText = "Procesando...";

    const placa = document.getElementById('placa-vehiculo').innerText;
    const km = document.getElementById('km-input').value;
    const obs = document.getElementById('obs-tecnicas').value;

    // Recopilar estados para Firebase y PDF
    const detallesPorSeccion = { electrico: {}, accesorios: {}, externa: {} };
    Object.keys(itemsConfig).forEach(seccion => {
        const filas = document.getElementById(`tabla-${seccion}`).querySelectorAll('tr');
        filas.forEach(fila => {
            const nombre = fila.cells[0].innerText;
            const valor = fila.querySelector('input[type="radio"]:checked')?.value || "N/A";
            detallesPorSeccion[seccion][nombre] = valor;
        });
    });

    const payload = {
        fecha: new Date().toLocaleString(),
        tecnico: "Johny", // Puedes capturar esto de un input
        vehiculo: "4x4",
        placa: placa,
        kilometraje: km,
        detalles: detallesPorSeccion,
        observaciones: obs,
        documentacion: {
            "Registro Vehicular": document.getElementById('reg_vehicular')?.checked || true,
            "Póliza de Seguro": document.getElementById('poliza')?.checked || true
        }
    };

    try {
        // 1. Guardar en Firebase
        await addDoc(collection(db, "Inspecciones"), {
            ...payload,
            fechaISO: new Date().toISOString()
        });
        
        await updateDoc(doc(db, "Vehiculos", placa), {
            ultimoKilometraje: parseInt(km),
            fechaUltimaRevision: new Date().toISOString()
        });

        // 2. Generar PDF con Python
        const response = await fetch('http://localhost:5000/api/generar-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `CheckList_${placa}.pdf`;
            a.click();
        }

        alert("✅ Guardado con éxito y PDF descargado.");
        window.location.href = "index.html";
    } catch (err) {
        console.error(err);
        alert("Error al procesar. Verifique que el servidor de Python esté activo.");
        btn.disabled = false;
    }
}