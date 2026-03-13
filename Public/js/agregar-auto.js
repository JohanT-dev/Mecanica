import { db } from './firebase-config.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const form = document.getElementById('form-agregar-auto');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const placa = document.getElementById('placa').value.toUpperCase();
        const marca = document.getElementById('marca').value;
        const modelo = document.getElementById('modelo').value;
        const año = document.getElementById('anio').value;

        try {
            // Usamos la PLACA como ID del documento para que sea única
            await setDoc(doc(db, "Vehiculos", placa), {
                placa: placa,
                marca: marca,
                modelo: modelo,
                anio: parseInt(año),
                estadoActual: "operativo", // Estado inicial por defecto
                ultimoKilometraje: 0,
                fechaRegistro: new Date().toISOString()
            });

            alert("🚗 Vehículo registrado con éxito");
            window.location.href = "../../index.html";
        } catch (error) {
            console.error("Error al agregar auto:", error);
            alert("Hubo un error al guardar el vehículo.");
        }
    });
}