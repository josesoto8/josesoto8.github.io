document.addEventListener("DOMContentLoaded", () => {
    
    // Array con las rutas de tus imágenes PNG para los fondos
    const dibujos = [
        'fondo2.png',
        'fondo3.png',
        'fondo4.png' // Puedes agregar más separándolos con comas
    ];

    function cargarDibujoAleatorio() {
        const contenedorImg = document.getElementById('dibujo-aleatorio');
        
        if (contenedorImg) {
            // Elige un número al azar basado en la cantidad de dibujos
            const indice = Math.floor(Math.random() * dibujos.length);
            
            // Asignamos la ruta de la imagen
            contenedorImg.src = dibujos[indice];
            
            // Cuando la imagen termine de cargar, la mostramos suavemente
            contenedorImg.onload = () => {
                contenedorImg.classList.add('visible');
            };
        }
    }

    // Ejecuta la función
    cargarDibujoAleatorio();
});