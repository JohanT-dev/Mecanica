/**
 * main.js - Manejo global de la interfaz (Header y Menú Móvil)
 * Este archivo debe cargarse como type="module" en todos los HTML
 */

document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    // Verificamos que los elementos existan en el DOM actual
    if (hamburgerBtn && mobileMenu) {
        
        // 1. Alternar menú al hacer clic en la hamburguesa
        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita que el clic cierre el menú inmediatamente
            mobileMenu.classList.toggle('active');
            
            // Opcional: Cambiar apariencia del botón cuando está activo
            hamburgerBtn.style.borderColor = mobileMenu.classList.contains('active') 
                ? '#4f8ef7' 
                : 'rgba(255, 255, 255, 0.1)';
        });

        // 2. Cerrar el menú si se hace clic en cualquier enlace móvil
        const mobileLinks = mobileMenu.querySelectorAll('a, button');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('active');
                hamburgerBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            });
        });

        // 3. Cerrar el menú si se hace clic fuera de él (en el cuerpo de la página)
        document.addEventListener('click', (e) => {
            if (!mobileMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
                if (mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    hamburgerBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
            }
        });
    }
});