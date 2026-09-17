// Configuración de parámetros
const parametros_gui = [
    ["O3", "NO2"],
    ["SO2", "CO"],
    ["PM10", "PM2.5"],
    ["HUM", "TEMPER"],
    ["WD", "WS"]
];

let dataProm = null;
let dataCaseta = null;

document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("formulas-grid");
    parametros_gui.forEach(([p1, p2]) => {
        grid.innerHTML += `
            <div class="formula-label">${p1}:</div>
            <input type="text" class="formula-input" id="eq_${p1}" placeholder="ej. *1.05">
            <div class="formula-label">${p2}:</div>
            <input type="text" class="formula-input" id="eq_${p2}" placeholder="ej. +1.5">
        `;
    });

    document.getElementById("file-prom").addEventListener("change", e => handleFileSelect(e, "lbl-prom", true));
    document.getElementById("file-caseta").addEventListener("change", e => handleFileSelect(e, "lbl-caseta", false));
    document.getElementById("btn-procesar").addEventListener("click", procesar);
});

// Usamos raw: false para que SheetJS nos entregue las fechas ya formateadas como texto ('MM-DD-YY' o similar)
function handleFileSelect(e, labelId, isProm) {
    const file = e.target.files[0];
    if (!file) return;
    
    document.getElementById(labelId).innerText = file.name;
    document.getElementById(labelId).style.color = "#e0e0e0";

    const reader = new FileReader();
    reader.onload = function(evt) {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, {type: 'array', cellDates: false, raw: false}); 
        
        // Buscar la hoja correcta (Crudo o la primera)
        let sheetName = workbook.SheetNames[0];
        if (!isProm && workbook.SheetNames.includes("Crudo")) {
            sheetName = "Crudo";
        }
        
        const sheet = workbook.Sheets[sheetName];
        // Convertimos a array de arrays
        const json = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null});
        
        if (isProm) dataProm = json;
        else dataCaseta = json;
        
        log(`✓ Archivo ${file.name} cargado en memoria.`);
    };
    reader.readAsArrayBuffer(file);
}

function log(msj) {
    const logDiv = document.getElementById("log-text");
    const line = document.createElement("div");
    line.className = "log-line " + (msj.includes("Error") || msj.includes("⚠") ? (msj.includes("Error") ? "log-error" : "log-warning") : "log-normal");
    line.innerText = msj;
    logDiv.appendChild(line);
    logDiv.scrollTop = logDiv.scrollHeight;
}

function aplicar_ecuacion(valor, eqStr) {
    if (!eqStr || eqStr.trim() === "" || valor === null || isNaN(valor) || valor === "") return valor;
    eqStr = eqStr.trim().toLowerCase();
    try {
        let valFloat = parseFloat(valor);
        let funcStr = "";
        if (['+', '-', '*', '/'].includes(eqStr.charAt(0))) {
            funcStr = `return ${valFloat} ${eqStr}`;
        } else if (eqStr.includes('x')) {
            funcStr = `return ${eqStr.replace(/x/g, valFloat)}`;
        } else {
            funcStr = `return ${valFloat} + ${parseFloat(eqStr)}`;
        }
        return new Function(funcStr)();
    } catch (e) {
        return valor;
    }
}

// Función auxiliar para extraer el formato "MM-DD HH" de cualquier cadena de fecha
function formatearClaveFecha(fechaStr, horaStr = "") {
    if(!fechaStr) return null;
    let text = String(fechaStr) + " " + String(horaStr);
    // Intentar extraer mes, día y hora mediante Regex
    // Busca patrones tipo: DD/MM/YYYY, MM-DD-YYYY, etc.
    let match = text.match(/(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})/);
    let hourMatch = text.match(/(?: |T)(\d{1,2}):/); 
    
    if(!match) return null;
    
    // Asumimos formato mes-día por defecto o día-mes según el estándar. 
    // Para asegurar compatibilidad con tu Python, extraemos los dos números y armamos el string
    let mes = match[1].length === 4 ? match[2] : match[1]; // Ajuste simple
    let dia = match[1].length === 4 ? match[3] : match[2];
    
    let hora = "00";
    if (horaStr && !horaStr.includes(":")) {
        hora = String(horaStr).padStart(2, '0'); // Si la hora es "11" -> "11"
    } else if (hourMatch) {
        hora = hourMatch[1].padStart(2, '0');
    }

    mes = mes.padStart(2, '0');
    dia = dia.padStart(2, '0');
    return `${mes}-${dia} ${hora}`;
}

function procesar() {
    if (!dataProm || !dataCaseta) {
        log("⚠ Atención: Por favor selecciona ambos archivos de Excel.");
        return;
    }

    document.getElementById("log-text").innerHTML = "";
    log("=== INICIANDO PROCESO DE COMPARACIÓN ===");

    try {
        const wb_out = XLSX.utils.book_new();
        let hojas_creadas = 0;

        // 1. Parsear Promediados (Imitando Pandas)
        let cols_p = [];
        let r0_p = dataProm[0] || [];
        let r1_p = dataProm[1] || [];
        
        for (let c = 0; c < Math.max(r0_p.length, r1_p.length); c++) {
            let v0 = r0_p[c] ? String(r0_p[c]).trim() : '';
            let v1 = r1_p[c] ? String(r1_p[c]).trim() : '';
            
            if (v1.toLowerCase() === 'date') cols_p.push('Date');
            else if (v1.toLowerCase() === 'time') cols_p.push('Time');
            else if (v0 !== 'nan' && v0 !== '') cols_p.push(v0);
            else cols_p.push(v1);
        }

        let df_prom = [];
        for (let i = 2; i < dataProm.length; i++) {
            let row = {};
            for (let c = 0; c < cols_p.length; c++) row[cols_p[c]] = dataProm[i][c];
            let clave = formatearClaveFecha(row['Date'], row['Time']);
            if (clave) {
                row['Clave_Fecha'] = clave;
                df_prom.push(row);
            }
        }

        // 2. Parsear Caseta (Imitando Pandas)
        let r_hdr = -1;
        for (let i = 0; i < Math.min(10, dataCaseta.length); i++) {
            if (dataCaseta[i] && dataCaseta[i].some(x => x && String(x).toLowerCase().includes('date'))) {
                r_hdr = i;
                break;
            }
        }
        if (r_hdr === -1) throw new Error("No se encontró encabezado con fecha en la Caseta.");

        let cols_c = dataCaseta[r_hdr].map(x => x ? String(x).trim() : '');
        let col_tc = cols_c.find(c => c.toLowerCase().includes('date'));
        
        let df_caseta = [];
        for (let i = r_hdr + 2; i < dataCaseta.length; i++) {
            let row = {};
            for (let c = 0; c < cols_c.length; c++) row[cols_c[c]] = dataCaseta[i][c];
            let clave = formatearClaveFecha(row[col_tc], row[col_tc]); // En caseta fecha y hora suelen venir juntas
            if (clave) {
                row['Clave_Fecha'] = clave;
                df_caseta.push(row);
            }
        }

        // 3. Mapa de Variables
        const mapa_vars = [
            ['O3', ['O3'], ['O3_Limpio', 'O3']],
            ['NO2', ['NO2'], ['NO2_Limpio', 'NO2']],
            ['SO2', ['SO2'], ['SO2_Limpio', 'SO2']],
            ['CO', ['CO'], ['CO_Limpio', 'CO']],
            ['PM2.5', ['PM2.5', 'PM25', 'PM2_5'], ['PM2_5_Limpio', 'PM2.5_Limpio', 'PM2_5', 'PM2.5']],
            ['PM10', ['PM10'], ['PM10_Limpio', 'PM10']],
            ['HUM', ['HUM', 'HR'], ['HR_Limpio', 'HUM_Limpio', 'HR', 'HUM']],
            ['TEMPER', ['TEMPER', 'TEMP'], ['Temp_Limpio', 'TEMPER_Limpio', 'Temp', 'TEMPER']],
            ['WD', ['WD', 'DV'], ['DV_Limpio', 'WD_Limpio', 'DV', 'WD']],
            ['WS', ['WS', 'VV'], ['VV_Limpio', 'WS_Limpio', 'VV', 'WS']]
        ];

        // 4. Cruce de datos (Merge Inner Join)
        mapa_vars.forEach(([tag, p_list, c_list]) => {
            let col_p = p_list.find(p => cols_p.some(c => c.toUpperCase() === p.toUpperCase()));
            if(!col_p) col_p = cols_p.find(c => p_list.some(p => c.toUpperCase().includes(p.toUpperCase())));

            let col_c = c_list.find(cp => cols_c.some(c => c.toUpperCase() === cp.toUpperCase()));
            if(!col_c) col_c = cols_c.find(c => c_list.some(cp => c.toUpperCase().includes(cp.toUpperCase())));

            if (col_p && col_c) {
                const eqInput = document.getElementById(`eq_${tag}`);
                const eqStr = eqInput ? eqInput.value : "";
                const outputData = [['Referencia', `Caseta_${tag}`, `Promediado_${tag}`]];
                
                let matches = 0;

                // Crear índice de caseta para búsqueda rápida por clave
                let casetaIndex = {};
                df_caseta.forEach(row => { casetaIndex[row['Clave_Fecha']] = row[col_c]; });

                // Inner Join sobre las fechas promediadas
                df_prom.forEach(rowP => {
                    let clave = rowP['Clave_Fecha'];
                    if (casetaIndex.hasOwnProperty(clave)) {
                        let valP = rowP[col_p];
                        let valC = casetaIndex[clave];

                        // Convertir a numérico o dejar null si está vacío/NaN
                        valP = (valP !== null && valP !== "") ? parseFloat(String(valP).replace(',', '.')) : null;
                        valC = (valC !== null && valC !== "") ? parseFloat(String(valC).replace(',', '.')) : null;

                        // Aplicar ecuación solo si el valor Promediado existe
                        if(valP !== null && !isNaN(valP)) {
                            valP = aplicar_ecuacion(valP, eqStr);
                        }

                        // Si alguno de los datos es NaN, lo volvemos null para que la celda quede en blanco en Excel
                        outputData.push([
                            clave, 
                            (valC !== null && !isNaN(valC)) ? valC : null, 
                            (valP !== null && !isNaN(valP)) ? valP : null
                        ]);
                        matches++;
                    }
                });

                if (matches > 0) {
                    const ws = XLSX.utils.aoa_to_sheet(outputData);
                    XLSX.utils.book_append_sheet(wb_out, ws, tag);
                    hojas_creadas++;
                    log(`✓ Hoja generada: ${tag} (${col_p} vs ${col_c}) - ${matches} registros`);
                }
            } else {
                log(`⚠ No se encontró coincidencia para ${tag}`);
            }
        });

        if (hojas_creadas > 0) {
            XLSX.writeFile(wb_out, "Resultado_Comparativo_10_Parametros.xlsx");
            log(`\n¡ÉXITO! Se generó el archivo con ${hojas_creadas} pestañas.`);
        } else {
            log("⚠ No se lograron mapear columnas para generar el libro.");
        }

    } catch (e) {
        log(`Error general: ${e.message}`);
    }
}