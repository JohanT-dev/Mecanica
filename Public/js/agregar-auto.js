import { db } from './firebase-config.js'; 
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Lógica visual de sliders y selects (la mantenemos igual)
window.updateSlider = (id) => {
    const input = document.getElementById(id);
    document.getElementById('val-' + id).textContent = input.value + '%';
    document.getElementById('bar-' + id).style.width = input.value + '%';
};

const formAgregar = document.getElementById('form-registro-vehiculo');
if (formAgregar) {
    formAgregar.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const placa = document.getElementById('placa').value.toUpperCase().trim();
        const auto = {
            marca: document.getElementById('marca').value,
            modelo: document.getElementById('modelo').value,
            anio: document.getElementById('anio').value,
            salud_motor: document.getElementById('motor').value,
            estadoActual: 'operativo',
            fechaRegistro: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, "Vehiculos", placa), auto);
            alert("✅ Vehículo guardado en Firebase");
            window.location.href = '../../index.html';
        } catch (error) {
            console.error(error);
            alert("Error al guardar");
        }
    });
}