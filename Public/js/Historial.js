import { db } from './firebase-config.js';
import { collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

async function renderizarHistorial() {
    const timeline = document.getElementById('timeline-container');
    const totalDisplay = document.getElementById('count-total');
    
    try {
        const q = query(collection(db, "Inspecciones"), orderBy("fecha", "desc"));
        const querySnapshot = await getDocs(q);
        
        let htmlBus = "";
        let total = 0;
        let lastMonth = "";

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            total++;

            // Agrupar por mes (Ene 2026, Feb 2026, etc.)
            const fecha = new Date(data.fecha);
            const mesActual = fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
            
            if (mesActual !== lastMonth) {
                htmlBus += `<div class="timeline-month">${mesActual.charAt(0).toUpperCase() + mesActual.slice(1)}</div>`;
                lastMonth = mesActual;
            }

            // Definir ícono y badge según el estado
            const config = {
                operativo: { icon: '✅', class: 'icon-ok', badge: 'badge-green' },
                mantenimiento: { icon: '🔧', class: 'icon-warn', badge: 'badge-yellow' },
                fuera: { icon: '⚠️', class: 'icon-bad', badge: 'badge-red' }
            };
            const estilo = config[data.estado] || config.operativo;

            htmlBus += `
                <div class="timeline-item">
                    <div class="timeline-icon ${estilo.class}">${estilo.icon}</div>
                    <div class="timeline-body">
                        <h4>Inspección — ${data.placa}</h4>
                        <p>Placa: ${data.placa} · Km: ${data.kilometraje.toLocaleString()} · ${data.observaciones || 'Sin observaciones'}</p>
                    </div>
                    <div class="timeline-meta">
                        <div class="date">${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</div>
                        <span class="badge ${estilo.badge}">${data.estado}</span>
                    </div>
                </div>
            `;
        });

        timeline.innerHTML = htmlBus || "<p>No hay registros de inspección.</p>";
        if(totalDisplay) totalDisplay.innerText = total;

    } catch (e) {
        console.error("Error al cargar historial: ", e);
        timeline.innerHTML = "<p>Error al conectar con la base de datos.</p>";
    }
}

document.addEventListener('DOMContentLoaded', renderizarHistorial);import { db } from './firebase-config.js';
import { collection, query, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Variable global para guardar los datos originales y no re-leer de Firebase
let todasLasInspecciones = [];

async function cargarDatos() {
    const timeline = document.getElementById('timeline-container');
    try {
        const q = query(collection(db, "Inspecciones"), orderBy("fecha", "desc"));
        const querySnapshot = await getDocs(q);
        
        todasLasInspecciones = [];
        querySnapshot.forEach(doc => {
            todasLasInspecciones.push({ id: doc.id, ...doc.data() });
        });

        // Poblar el filtro de vehículos dinámicamente
        poblarFiltroVehiculos();
        // Renderizar por primera vez
        filtrarYMostrar();

    } catch (e) {
        console.error("Error:", e);
        timeline.innerHTML = "<p>Error al cargar datos.</p>";
    }
}

function poblarFiltroVehiculos() {
    const selectVehiculo = document.querySelector('.filter-select:nth-child(1)');
    const placasUnicas = [...new Set(todasLasInspecciones.map(ins => ins.placa))];
    
    // Limpiar opciones previas excepto la primera
    selectVehiculo.innerHTML = '<option value="">Todos los vehículos</option>';
    placasUnicas.forEach(placa => {
        const opt = document.createElement('option');
        opt.value = placa;
        opt.textContent = placa;
        selectVehiculo.appendChild(opt);
    });
}

function filtrarYMostrar() {
    const timeline = document.getElementById('timeline-container');
    const filtroPlaca = document.querySelector('.filter-select:nth-child(1)').value;
    const filtroEstado = document.querySelector('.filter-select:nth-child(2)').value.toLowerCase();
    const busqueda = document.querySelector('.filter-search').value.toLowerCase();

    // Lógica de filtrado
    const filtrados = todasLasInspecciones.filter(ins => {
        const coincidePlaca = filtroPlaca === "" || ins.placa === filtroPlaca;
        const coincideEstado = filtroEstado === "" || ins.estado.toLowerCase() === filtroEstado;
        const coincideBusqueda = ins.placa.toLowerCase().includes(busqueda) || 
                                 (ins.observaciones && ins.observaciones.toLowerCase().includes(busqueda));
        
        return coincidePlaca && coincideEstado && coincideBusqueda;
    });

    renderizarLista(filtrados);
    actualizarContadores(filtrados);
}

function renderizarLista(lista) {
    const timeline = document.getElementById('timeline-container');
    let html = "";
    let lastMonth = "";

    if (lista.length === 0) {
        timeline.innerHTML = "<p class='no-results'>No se encontraron revisiones con esos filtros.</p>";
        return;
    }

    lista.forEach(data => {
        const fecha = new Date(data.fecha);
        const mesActual = fecha.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
        
        if (mesActual !== lastMonth) {
            html += `<div class="timeline-month">${mesActual.toUpperCase()}</div>`;
            lastMonth = mesActual;
        }

        const config = {
            operativo: { icon: '✅', class: 'icon-ok', badge: 'badge-green' },
            mantenimiento: { icon: '🔧', class: 'icon-warn', badge: 'badge-yellow' },
            fuera: { icon: '⚠️', class: 'icon-bad', badge: 'badge-red' }
        };
        const estilo = config[data.estado] || config.operativo;

        html += `
            <div class="timeline-item">
                <div class="timeline-icon ${estilo.class}">${estilo.icon}</div>
                <div class="timeline-body">
                    <h4>Inspección — ${data.placa}</h4>
                    <p>Km: ${data.kilometraje.toLocaleString()} · ${data.observaciones || 'Sin observaciones'}</p>
                </div>
                <div class="timeline-meta">
                    <div class="date">${fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</div>
                    <span class="badge ${estilo.badge}">${data.estado}</span>
                </div>
            </div>`;
    });
    timeline.innerHTML = html;
}

function actualizarContadores(lista) {
    document.getElementById('count-total').innerText = lista.length;
    // Aquí podrías filtrar la lista por estado para actualizar los otros 3 cuadros
}

// Escuchar eventos
document.addEventListener('DOMContentLoaded', () => {
    cargarDatos();
    
    // Filtros
    document.querySelectorAll('.filter-select').forEach(el => el.addEventListener('change', filtrarYMostrar));
    document.querySelector('.filter-search').addEventListener('input', filtrarYMostrar);
});