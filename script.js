document.addEventListener("DOMContentLoaded", () => {
    // Seleccionamos todos los items que tienen un submenú
    const menus = document.querySelectorAll('.has-submenu');

    menus.forEach(menu => {
        const trigger = menu.querySelector('.trigger');
        
        // Al tocar (o hacer clic) en la imagen principal (2 o 3)
        trigger.addEventListener('click', (e) => {
            // Cierra los otros menús si estaban abiertos
            menus.forEach(m => {
                if (m !== menu) m.classList.remove('active');
            });

            // Abre o cierra el menú actual
            menu.classList.toggle('active');
        });
    });

    // Si el usuario toca en cualquier otra parte fuera de las imágenes, se esconden las opciones
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.has-submenu')) {
            menus.forEach(menu => menu.classList.remove('active'));
        }
    });
});