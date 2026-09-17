// Variables globales
let archivosAcumulados = [];

// Elementos de la interfaz
const fileInput = document.getElementById('fileInput');
const btnAddFiles = document.getElementById('btnAddFiles');
const btnClear = document.getElementById('btnClear');
const fileListUI = document.getElementById('fileList');
const btnSaveCSV = document.getElementById('btnSaveCSV');
const btnSaveExcel = document.getElementById('btnSaveExcel');
const statusMsg = document.getElementById('statusMsg');
const chkPromedio = document.getElementById('chkPromedio');

// Saludo aleatorio
const saludos = [
    { t: "¡Hola!", s: "¿Qué archivos quieres que unamos hoy?" },
    { t: "00010011:", s: "Tranquilo, hoy no habrá errores." }
];
const saludoElegido = saludos[Math.floor(Math.random() * saludos.length)];
document.getElementById('titulo').innerText = saludoElegido.t;
document.getElementById('subtitulo').innerText = saludoElegido.s;

// Eventos de botones de interfaz
btnAddFiles.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (event) => {
    const nuevosArchivos = Array.from(event.target.files);
    archivosAcumulados = archivosAcumulados.concat(nuevosArchivos);
    actualizarInterfaz();
    fileInput.value = ""; 
});

btnClear.addEventListener('click', () => {
    archivosAcumulados = [];
    actualizarInterfaz();
});

function actualizarInterfaz() {
    fileListUI.innerHTML = "";
    if (archivosAcumulados.length === 0) {
        fileListUI.innerHTML = '<li class="empty-msg">Sin archivos seleccionados</li>';
        btnSaveCSV.disabled = true;
        btnSaveExcel.disabled = true;
        statusMsg.innerText = "";
        return;
    }
    archivosAcumulados.forEach((archivo, index) => {
        const li = document.createElement('li');
        li.innerText = `${index + 1}. ${archivo.name}`;
        fileListUI.appendChild(li);
    });
    btnSaveCSV.disabled = false;
    btnSaveExcel.disabled = false;
    statusMsg.innerText = `${archivosAcumulados.length} archivos listos para procesar.`;
}

// -----------------------------------------------------------
// LÓGICA DE PROCESAMIENTO (Traducción de tu código Python)
// -----------------------------------------------------------

function limpiarValor(val) {
    val = val.trim();
    // Corrige fechas de YY-M-D a DD/MM/YYYY
    let partes = val.split("-");
    if (partes.length === 3 && partes.every(p => !isNaN(p))) {
        let yy = partes[0], mm = partes[1], dd = partes[2];
        let yyyy = yy.length === 2 ? "20" + yy : yy;
        return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
    }
    // Convierte a número si es posible
    if (!isNaN(val) && val !== "") return Number(val);
    return val;
}

async function procesarDatos() {
    const promediar = chkPromedio.checked;
    let sensores = [];
    let unidades = [];
    let registrosParseados = []; 

    for (let i = 0; i < archivosAcumulados.length; i++) {
        const texto = await archivosAcumulados[i].text();
        // Separar por líneas y comas, limpiando los valores
        const filas = texto.split('\n')
            .map(linea => linea.split(',').map(limpiarValor))
            .filter(row => row.length > 0 && !String(row[0]).toLowerCase().includes('sep='));

        if (filas.length < 3) continue;

        let nombreSensor = filas[0].length >= 2 ? String(filas[0][1]).trim() : "";
        let unidad = filas[1].length >= 3 ? String(filas[1][2]).trim() : "Value";
        
        sensores.push(nombreSensor);
        unidades.push(unidad);

        let datos = filas.slice(2);
        
        if (promediar) {
            let grupos = {};
            for (let fila of datos) {
                if (fila.length < 3) continue;
                let fecha = fila[0];
                let horaCompleta = String(fila[1]).trim();
                // Extraer solo la hora "12:05:00" -> "12"
                let horaSimple = horaCompleta.includes(":") ? horaCompleta.split(":")[0] : horaCompleta;
                let valor = fila[2];

                if (typeof valor !== "number") continue;

                let clave = `${fecha}_${horaSimple}`;
                if (!grupos[clave]) grupos[clave] = { fecha, horaSimple, valores: [] };
                grupos[clave].valores.push(valor);
            }
            
            for (let clave in grupos) {
                let g = grupos[clave];
                let prom = g.valores.reduce((a, b) => a + b, 0) / g.valores.length;
                prom = Number(prom.toFixed(4));
                // Para poder ordenar cronológicamente
                let dtStr = g.fecha.split('/').reverse().join('-') + 'T' + g.horaSimple.padStart(2, '0') + ':00:00';
                let dt = new Date(dtStr).getTime();
                registrosParseados.push({ dt, fecha: g.fecha, hora: g.horaSimple, idxArchivo: i, valor: prom });
            }
        } else {
            for (let fila of datos) {
                if (fila.length < 3) continue;
                let fecha = fila[0];
                let horaCompleta = String(fila[1]).trim();
                let valor = fila[2];
                
                let dtStr = fecha.split('/').reverse().join('-') + 'T' + horaCompleta;
                let dt = new Date(dtStr).getTime();

                registrosParseados.push({ dt: isNaN(dt) ? 0 : dt, fecha, hora: horaCompleta, idxArchivo: i, valor: valor });
            }
        }
    }

    // Construir encabezados
    let encabezado1 = ["", "Sensor Type", ...sensores];
    let encabezado2 = ["Date", "Time", ...unidades];
    
    if (registrosParseados.length === 0) return [encabezado1, encabezado2];

    // Ordenar cronológicamente
    registrosParseados.sort((a, b) => a.dt - b.dt);

    let mapaTabla = new Map();
    let ordenFechasHoras = [];

    // Acomodar valores en columnas según el archivo
    for (let r of registrosParseados) {
        let clave = `${r.fecha}|${r.hora}`;
        if (!mapaTabla.has(clave)) {
            mapaTabla.set(clave, new Array(archivosAcumulados.length).fill(""));
            ordenFechasHoras.push({ fecha: r.fecha, hora: r.hora, clave: clave });
        }
        mapaTabla.get(clave)[r.idxArchivo] = r.valor;
    }

    // Armar la matriz final 2D
    let matrizFinal = [encabezado1, encabezado2];
    for (let o of ordenFechasHoras) {
        matrizFinal.push([o.fecha, o.hora, ...mapaTabla.get(o.clave)]);
    }

    return matrizFinal;
}

// -----------------------------------------------------------
// FUNCIONES DE DESCARGA
// -----------------------------------------------------------

function obtenerNombreArchivo(extension) {
    const fecha = new Date();
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    const hr = String(fecha.getHours()).padStart(2, '0');
    const min = String(fecha.getMinutes()).padStart(2, '0');
    
    const prefijo = chkPromedio.checked ? "union_de_datos_PROMEDIADOS" : "union_de_datos";
    return `${prefijo}_${dia}-${mes}-${anio}_${hr}-${min}${extension}`;
}

btnSaveCSV.addEventListener('click', async () => {
    statusMsg.innerText = "Procesando CSV...";
    statusMsg.style.color = "#FFCE44";
    
    try {
        const datosMatriz = await procesarDatos();
        // Convertir matriz a texto CSV
        const csvContent = "\uFEFF" + datosMatriz.map(e => e.join(",")).join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = obtenerNombreArchivo(".csv");
        enlace.click();
        
        URL.revokeObjectURL(url);
        statusMsg.innerText = "¡CSV guardado con éxito!";
        statusMsg.style.color = "green";
    } catch (e) {
        statusMsg.innerText = "Hubo un error al procesar el CSV.";
        statusMsg.style.color = "red";
        console.error(e);
    }
});

btnSaveExcel.addEventListener('click', async () => {
    statusMsg.innerText = "Generando Excel...";
    statusMsg.style.color = "#FFCE44";
    
    try {
        const datosMatriz = await procesarDatos();
        
        const ws = XLSX.utils.aoa_to_sheet(datosMatriz);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos Unidos");
        
        XLSX.writeFile(wb, obtenerNombreArchivo(".xlsx"));
        statusMsg.innerText = "¡Excel guardado con éxito!";
        statusMsg.style.color = "green";
    } catch (e) {
        statusMsg.innerText = "Hubo un error al crear el Excel.";
        statusMsg.style.color = "red";
        console.error(e);
    }
});