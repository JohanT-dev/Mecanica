// auth-handler.js
firebase.auth().onAuthStateChanged((user) => {
    const btnDesktop = document.getElementById('btn-auth-desktop');
    const btnMobile = document.getElementById('btn-auth-mobile');

    if (user) {
        // Usuario logueado: Cambiamos texto y función
        const texto = `Salir (${user.email.split('@')[0]})`;
        
        if (btnDesktop) {
            btnDesktop.querySelector('span').textContent = texto;
            btnDesktop.onclick = () => firebase.auth().signOut();
        }
        if (btnMobile) {
            btnMobile.querySelector('span').textContent = texto;
            btnMobile.onclick = () => { closeMobileMenu(); firebase.auth().signOut(); };
        }
    } else {
        // Usuario no logueado: Restaurar botones originales
        if (btnDesktop) {
            btnDesktop.querySelector('span').textContent = "Iniciar sesión";
            btnDesktop.onclick = () => window.location.href = 'Public/html/Login.html';
        }
        if (btnMobile) {
            btnMobile.querySelector('span').textContent = "Iniciar sesión";
            btnMobile.onclick = () => window.location.href = 'Public/html/Login.html';
        }

        // Proteger páginas: Si no está logueado y trata de entrar a "Agregar Auto", redirigir
        if (window.location.pathname.includes('agregar-auto.html')) {
            window.location.href = 'Public/html/Login.html';
        }
    }
});