import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

let fleetStatusChart;

// Inicialización de gráficos
function initCharts() {
  const ctx2 = document.getElementById('fleetStatusChart').getContext('2d');
  fleetStatusChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: ['Operativos', 'Taller', 'Baja'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: ['#22c55e', '#eab308', '#ef4444']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function actualizarGraficas(operativos, taller, criticos) {
  if (fleetStatusChart) {
    fleetStatusChart.data.datasets[0].data = [operativos, taller, criticos];
    fleetStatusChart.update();
  }
}

function cargarDashboard() {
  onSnapshot(collection(db, "Vehiculos"), (snapshot) => {
    const contenedor = document.getElementById('fleetGrid');
    if (!contenedor) return;
    contenedor.innerHTML = "";

    snapshot.forEach((doc) => {
      const auto = doc.data();
      const id = doc.id;

      contenedor.innerHTML += `
              <div class="auto-card">
                  <div class="auto-info">
                      <h4>${auto.modelo || 'Sin Modelo'}</h4>
                      <span class="plate">${id}</span>
                      <span class="badge badge-${auto.estadoActual}">${auto.estadoActual}</span>
                  </div>
                  <a href="Public/html/actualizar.html?placa=${id}" class="btn-update-status">
                      Actualizar Estado
                  </a>
              </div>`;
    });
  });
}


document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  cargarDashboard();
});
// BUSCADOR EN TIEMPO REAL
window.filterFleet = async function () {
  const textoBusqueda = document.getElementById('searchInput').value.toUpperCase().trim();
  const vehiculosRef = collection(db, "Vehiculos");

  if (textoBusqueda === "") {
    // Si está vacío, volvemos al modo "tiempo real" normal
    cargarDashboard();
    return;
  }

  // Buscamos específicamente por ID de documento (Placa)
  // Nota: Firebase solo permite búsquedas exactas o por prefijo con este método
  try {
    const q = query(vehiculosRef, where("__name__", ">=", textoBusqueda), where("__name__", "<=", textoBusqueda + '\uf8ff'));
    const querySnapshot = await getDocs(q);
    renderizarTarjetas(querySnapshot);
  } catch (error) {
    console.error("Error buscando:", error);
  }
}