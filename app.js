// DONUT - Estado General de la Flota
new Chart(document.getElementById('donutChart'), {
  type: 'doughnut',
  data: {
    labels: ['Operativo', 'Mantenimiento', 'Fuera de servicio'],
    datasets: [{
      data: [2, 1, 1],
      backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'],
      borderWidth: 0,
      hoverOffset: 8
    }]
  },
  options: {
    cutout: '62%',
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw}` } }
    }
  }
});

// BAR - Salud Promedio por Componente
new Chart(document.getElementById('barChart'), {
  type: 'bar',
  data: {
    labels: ['Motor', 'Frenos', 'Neumáticos'],
    datasets: [{
      data: [55, 77, 55],
      backgroundColor: '#7c72e8',
      borderRadius: 6,
      barPercentage: 0.5
    }]
  },
  options: {
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: 100, grid: { color: '#f0f0f0' }, ticks: { color: '#aaa' } },
      x: { grid: { display: false }, ticks: { color: '#aaa' } }
    }
  }
});

// BAR - Nivel de Combustible por Auto
new Chart(document.getElementById('fuelChart'), {
  type: 'bar',
  data: {
    labels: ['Auto 01', 'Auto 02', 'Auto 03', 'Auto 04'],
    datasets: [{
      data: [75, 30, 90, 10],
      backgroundColor: ['#22c55e', '#f59e0b', '#22c55e', '#ef4444'],
      borderRadius: 6,
      barPercentage: 0.5
    }]
  },
  options: {
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => ` combustible: ${c.raw}%` } }
    },
    scales: {
      y: { min: 0, max: 100, ticks: { callback: v => v + '%', color: '#aaa' }, grid: { color: '#f0f0f0' } },
      x: { grid: { display: false }, ticks: { color: '#aaa' } }
    }
  }
});

// RADAR - Estado Individual por Auto
function makeRadar(id, data) {
  new Chart(document.getElementById(id), {
    type: 'radar',
    data: {
      labels: ['Motor', 'Frenos', 'Neumáticos', 'Combustible'],
      datasets: [{
        data: data,
        backgroundColor: 'rgba(108, 92, 231, 0.2)',
        borderColor: '#6c5ce7',
        pointBackgroundColor: '#6c5ce7',
        borderWidth: 2
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` valor: ${c.raw}` } }
      },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { display: false },
          grid: { color: '#e5e7eb' },
          pointLabels: { font: { size: 11 }, color: '#888' }
        }
      }
    }
  });
}

makeRadar('radar1', [65, 80, 70, 75]);
makeRadar('radar2', [40, 30, 35, 30]);
makeRadar('radar3', [90, 85, 80, 90]);
makeRadar('radar4', [20, 15, 25, 10]);

// Cambiar entre pestañas
function switchTab(tab, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('graficos-view').style.display = tab === 'graficos' ? 'block' : 'none';
  document.getElementById('list-view').style.display = tab === 'lista' ? 'block' : 'none';
}

// Agregar auto
function agregarAuto() {
  alert('Funcionalidad: Agregar Auto');
}