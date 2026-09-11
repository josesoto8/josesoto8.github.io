document.addEventListener("DOMContentLoaded", () => {
    const menus = document.querySelectorAll('.has-submenu');

    menus.forEach(menu => {
        const trigger = menu.querySelector('.trigger');
        
        trigger.addEventListener('click', (e) => {
            menus.forEach(m => {
                if (m !== menu) m.classList.remove('active');
            });
            menu.classList.toggle('active');
            e.stopPropagation();
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.has-submenu')) {
            menus.forEach(menu => menu.classList.remove('active'));
        }
    });
});