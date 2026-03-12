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

// En app.js
function cargarDashboard() {
  onSnapshot(collection(db, "Vehiculos"), (snapshot) => {
      const contenedor = document.getElementById('fleetGrid'); // ID que usaste en el HTML
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