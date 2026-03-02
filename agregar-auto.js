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
function guardarAuto() {
  if (!validarCampos()) {
    return;
  }

  const auto = {
    nombre:      document.getElementById('nombre').value.trim(),
    placa:       document.getElementById('placa').value.trim(),
    marca:       document.getElementById('marca').value.trim(),
    modelo:      document.getElementById('modelo').value.trim(),
    anio:        document.getElementById('anio').value,
    color:       document.getElementById('color').value.trim(),
    estado:      document.querySelector('input[name="estado"]:checked').value,
    motor:       document.getElementById('motor').value,
    frenos:      document.getElementById('frenos').value,
    neumaticos:  document.getElementById('neumaticos').value,
    combustible: document.getElementById('combustible').value,
  };

  console.log('Auto guardado:', auto);

  // Mostrar toast y redirigir
  const toast = document.getElementById('toast');
  toast.classList.add('show');

  setTimeout(() => {
    window.location.href = 'index.html';
  }, 1800);
}