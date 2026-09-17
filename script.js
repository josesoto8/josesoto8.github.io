document.addEventListener("DOMContentLoaded", () => {
    // Seleccionamos todos los items que tienen un submenú
    const userAgent = window.navigator.userAgent.toLowerCase()
    const platform = window.navigator.platform.toLowerCase()
    
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    let os = 'windows';
    if (userAgent.includes('mac') || platform.includes('mac')) {
        os = 'macos';
    } else if (userAgent.includes('linux') || platform.includes('linux')) {
        os = 'linux';
    } else if (userAgent.includes('bsd') || platform.includes('bsd')) {
        os = 'bsd';
    }

    const reposSafewill = {
        windows: "https://github.com/josesoto8/Safewill-Data-Windows",
        macos: "https://github.com/josesoto8/Safewill-Data-MacOS",
        linux: "https://github.com/josesoto8/Safewill-Data-Linux",
        bsd: "https://github.com/josesoto8/Safewill-Data-BSD"
    };

    const reposVSData = {
        windows: "https://github.com/josesoto8/VSData-Windows",
        macos: "https://github.com/josesoto8/VSData-MacOS",
        linux: "https://github.com/josesoto8/VSData-Linux",
        bsd: "https://github.com/josesoto8/VSData-BSD"
    };

    const perfilGithub = "https://github.com/josesoto8"

    const safewillGhLink = document.getElementById('safewill-github');
    if (safewillGhLink) {
        if (isMobile) {
            safewillGhLink.href = perfilGithub;
            safewillGhLink.querySelector('img').title = "Ver todos en mi perfil de GitHub";
        } else if (reposSafewill[os]) {
            safewillGhLink.href = reposSafewill[os];
            safewillGhLink.querySelector('img').title = `Repositorio GitHub (${os.toUpperCase()})`;
        }
    }

    const vsdataGhLink = document.getElementById('vsdata-github');
    if (vsdataGhLink) {
        if (isMobile) {
            vsdataGhLink.href = perfilGithub;
            vsdataGhLink.querySelector('img').title = "Ver todos en mi perfil de GitHub";
        } else if (reposVSData[os]) {
            vsdataGhLink.href = reposVSData[os];
            vsdataGhLink.querySelector('img').title = `Repositorio GitHub (${os.toUpperCase()})`;
        }
    }
    
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