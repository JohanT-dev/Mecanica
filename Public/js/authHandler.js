// AuthHandler.js
firebase.auth().onAuthStateChanged((user) => {
    const btnDesktop = document.getElementById('btn-auth-desktop');
    const btnMobile = document.getElementById('btn-auth-mobile');

    if (user) {
        const nombreCorto = user.email.split('@')[0];
        const texto = `Salir (${nombreCorto})`;
        
        if (btnDesktop) {
            btnDesktop.querySelector('span').textContent = texto;
            btnDesktop.onclick = () => firebase.auth().signOut();
        }
        if (btnMobile) {
            btnMobile.querySelector('span').textContent = texto;
            btnMobile.onclick = () => { closeMobileMenu(); firebase.auth().signOut(); };
        }
    } else {
        if (btnDesktop) {
            btnDesktop.querySelector('span').textContent = "Iniciar sesión";
            btnDesktop.onclick = () => window.location.href = 'Public/html/Login.html';
        }
        
        // PROTECCIÓN DE RUTAS
        const paginasPrivadas = ['agregar-auto.html', 'actualizar.html'];
        if (paginasPrivadas.some(p => window.location.pathname.includes(p))) {
            window.location.href = 'Public/html/Login.html';
        }
    }
});