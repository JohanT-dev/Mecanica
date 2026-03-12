// Color dinámico en selects de documentación
function colorDoc(sel) {
  sel.className = 'doc-select val-' + sel.value;
}
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.doc-select').forEach(sel => {
    colorDoc(sel);
    sel.addEventListener('change', () => colorDoc(sel));
  });
});

// Actualizar slider visual
function updateSlider(id) {
  const input = document.getElementById(id);
  const val = input.value;
  document.getElementById('val-' + id).textContent = val + '%';
  document.getElementById('bar-' + id).style.width = val + '%';
}

// Validar campos requeridos
function validarCampos() {
  const requeridos = ['nombre', 'placa', 'marca', 'modelo'];
  let valido = true;

  requeridos.forEach(id => {
    const input = document.getElementById(id);
    if (!input.value.trim()) {
      input.classList.add('error');
      valido = false;
    } else {
      input.classList.remove('error');
    }
  });

  return valido;
}

// Limpiar error al escribir
['nombre', 'placa', 'marca', 'modelo'].forEach(id => {
  document.getElementById(id).addEventListener('input', function () {
    this.classList.remove('error');
  });
});

// Guardar auto y volver al dashboard
async function guardarAuto() {
  if (!validarCampos()) return;

  // 1. Obtener el token del usuario logueado
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("Debes iniciar sesión para guardar un vehículo.");
    return;
  }
  const token = await user.getIdToken();

  // 2. Recolectar los datos del formulario (ya lo tienes casi listo)
  const auto = {
    nombre:      document.getElementById('nombre').value.trim(),
    placa:       document.getElementById('placa').value.trim(),
    marca:       document.getElementById('marca').value.trim(),
    modelo:      document.getElementById('modelo').value.trim(),
    anio:        document.getElementById('anio').value,
    color:       document.getElementById('color').value.trim(),
    estado:      document.querySelector('input[name="estado"]:checked').value,
    // Estos son los sliders
    salud_motor:      document.getElementById('motor').value,
    salud_frenos:     document.getElementById('frenos').value,
    salud_neumaticos: document.getElementById('neumaticos').value,
    combustible:      document.getElementById('combustible').value,
  };

  try {
    // 3. ENVIAR A PYTHON
    const response = await fetch('http://127.0.0.1:5000/api/guardar-auto', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // <--- Aquí va la seguridad
      },
      body: JSON.stringify(auto)
    });

    if (response.ok) {
      alert("✅ Vehículo guardado correctamente en la flota");
      window.location.href = 'index.html';
    } else {
      const errorData = await response.json();
      alert("Error al guardar: " + errorData.error);
    }
  } catch (error) {
    console.error("Error de conexión:", error);
    alert("No se pudo conectar con el servidor backend.");
  }
}