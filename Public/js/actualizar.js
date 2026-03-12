import { db } from './firebase-config.js';
import { collection, addDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const dataChecklist = {
    electrico: ['Aceite de Motor', 'Batería', 'Luces', 'Frenos'],
    externa: ['Llantas', 'Espejos', 'Carrocería']
};

function generarTablas() {
    Object.keys(dataChecklist).forEach(seccion => {
        const contenedor = document.getElementById(`tabla-${seccion}`);
        if (!contenedor) return;
        dataChecklist[seccion].forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item}</td>
                <td class="td-radio"><input type="radio" name="${seccion}_${index}" value="B" class="radio-pill radio-bueno" checked></td>
                <td class="td-radio"><input type="radio" name="${seccion}_${index}" value="R" class="radio-pill radio-regular"></td>
                <td class="td-radio"><input type="radio" name="${seccion}_${index}" value="M" class="radio-pill radio-malo"></td>`;
            contenedor.appendChild(tr);
        });
    });
}

const formInspeccion = document.getElementById('form-inspeccion');
if (formInspeccion) {
    formInspeccion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const placa = document.getElementById('placa-vehiculo').innerText;
        const resultados = {};
        
        formInspeccion.querySelectorAll('.radio-pill:checked').forEach(radio => {
            const nombreItem = radio.closest('tr').cells[0].innerText;
            resultados[nombreItem] = radio.value;
        });

        try {
            await addDoc(collection(db, "Inspecciones"), {
                placa,
                checklist: resultados,
                fecha: new Date().toISOString()
            });
            await updateDoc(doc(db, "Vehiculos", placa), { 
                estadoActual: document.querySelector('input[name="estado-final"]:checked').value 
            });
            window.location.href = '../../index.html';
        } catch (err) { alert("Error al guardar"); }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    generarTablas();
    const placa = new URLSearchParams(window.location.search).get('placa');
    if(placa) document.getElementById('placa-vehiculo').innerText = placa;
});