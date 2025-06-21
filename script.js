// Constantes de configuración
const CONFIG = {
    eficiencia: 0.18,       // Eficiencia del sistema solar
    costoKW: 3500000,       // Costo por kW instalado (COP)
    co2PorKWh: 0.5,         // kg de CO2 evitados por kWh solar
    kgCO2Arbol: 21.77,      // kg de CO2 absorbido por árbol al año
    kgCO2Auto: 2000,        // kg de CO2 emitido por auto al año
    diasPorMes: 30,         // Días promedio por mes para cálculos
    horasDia: 5.8           // Horas de sol promedio por día
};

// Datos regionales
const DATA = {
    departamentos: {
        "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Galapa"],
        "Bolívar": ["Cartagena", "Magangué", "Turbaco", "Arjona"],
        "Cesar": ["Valledupar", "Aguachica", "Codazzi", "Bosconia", "La Paz"],
        "Córdoba": ["Montería", "Cereté", "Sahagún", "Lorica"],
        "La Guajira": ["Riohacha", "Uribia", "Manaure", "Albania"],
        "Magdalena": ["Santa Marta", "Ciénaga", "Fundación", "Aracataca"],
        "Sucre": ["Sincelejo", "Corozal", "San Marcos", "Sampués"],
        "San Andrés y Providencia": ["San Andrés", "Providencia", "San Luis", "El Cove"]
    },
    radiacion: {
        "Barranquilla": 5.8, "Soledad": 5.7, "Malambo": 5.7, "Galapa": 5.7,
        "Cartagena": 5.7, "Magangué": 5.6, "Turbaco": 5.6, "Arjona": 5.6,
        "Valledupar": 5.6, "Aguachica": 5.5, "Codazzi": 5.5, "Bosconia": 5.5, "La Paz": 5.5,
        "Montería": 5.5, "Cereté": 5.5, "Sahagún": 5.4, "Lorica": 5.4,
        "Riohacha": 6.2, "Uribia": 6.3, "Manaure": 6.2, "Albania": 6.1,
        "Santa Marta": 5.9, "Ciénaga": 5.8, "Fundación": 5.8, "Aracataca": 5.7,
        "Sincelejo": 5.4, "Corozal": 5.4, "San Marcos": 5.4, "Sampués": 5.4,
        "San Andrés": 5.7, "Providencia": 5.6, "San Luis": 5.6, "El Cove": 5.6,
        "default": 5.8
    },
    tarifas: {
        "1": 850, "2": 950, "3": 1100, "4": 1300, "5": 1500, "6": 1800
    }
};

// Cache de elementos del DOM
const DOM = {
    form: document.getElementById('solarForm'),
    results: document.getElementById('results'),
    departamento: document.getElementById('departamento'),
    municipio: document.getElementById('municipio'),
    panelSize: document.getElementById('panelSize'),
    panelValue: document.getElementById('panelSizeValue'),
    weather: document.getElementById('weather-icon'),
    temp: document.getElementById('temperature'),
    location: document.getElementById('location'),
    contactForm: document.getElementById('contactForm'),
    contactSuccess: document.getElementById('contactSuccess'),
    resultCards: document.querySelectorAll('.result-card')
};

// Variables de estado
let solarRadiationChart = null;
let ahorroChart = null;

// Inicialización
function init() {
    setupEventListeners();
    updateWeather(28);
    DOM.temp.textContent = "28°C - Soleado";
    DOM.location.textContent = "Barranquilla, Atlántico";
    initSolarChart();
    initMap();
}

// Configuración de event listeners
function setupEventListeners() {
    // Event delegation para las tarjetas de resultados
    document.addEventListener('mouseover', handleCardHover, true);
    document.addEventListener('mouseout', handleCardHover, true);
    document.addEventListener('focusin', handleCardHover, true);
    document.addEventListener('focusout', handleCardHover, true);
    
    // Eventos de formulario
    DOM.panelSize.addEventListener('input', updatePanelSizeValue);
    DOM.departamento.addEventListener('change', handleDepartamentoChange);
    DOM.municipio.addEventListener('change', handleMunicipioChange);
    DOM.form.addEventListener('submit', handleFormSubmit);
    DOM.contactForm.addEventListener('submit', handleContactSubmit);
}

// Manejador de hover/focus para tarjetas
function handleCardHover(e) {
    const card = e.target.closest('.result-card');
    if (!card) return;
    
    const explanation = card.querySelector('.explanation');
    if (!explanation) return;
    
    if (e.type === 'mouseover' || e.type === 'focusin') {
        explanation.style.display = 'block';
    } else if (e.type === 'mouseout' || e.type === 'focusout') {
        // Verificar si el nuevo foco está dentro de la misma tarjeta
        if (e.type === 'focusout' && e.relatedTarget && e.relatedTarget.closest('.result-card') === card) {
            return;
        }
        explanation.style.display = 'none';
    }
}

// Actualiza el valor mostrado del tamaño del panel
function updatePanelSizeValue() {
    DOM.panelValue.textContent = `${DOM.panelSize.value} kW`;
}

// Maneja el cambio de departamento
function handleDepartamentoChange() {
    DOM.municipio.innerHTML = '<option value="">Seleccione...</option>';
    
    if (this.value) {
        DOM.municipio.disabled = false;
        const municipios = DATA.departamentos[this.value] || [];
        
        municipios.forEach(municipio => {
            const option = document.createElement('option');
            option.value = sanitizeInput(municipio);
            option.textContent = municipio;
            DOM.municipio.appendChild(option);
        });
    } else {
        DOM.municipio.disabled = true;
    }
}

// Maneja el cambio de municipio
function handleMunicipioChange() {
    if (this.value) {
        const temp = getTemperature(this.value);
        updateWeather(temp);
        DOM.location.textContent = `${this.value}, ${DOM.departamento.value}`;
    }
}

// Maneja el envío del formulario principal
function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        const inputs = getFormInputs();
        if (!validateInputs(inputs)) return;
        
        const results = calculateResults(inputs);
        displayResults(results);
        renderChart(results);
        
        DOM.results.style.display = 'block';
        DOM.results.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error en el cálculo:', error);
        alert('Ocurrió un error al calcular los resultados. Por favor intente nuevamente.');
    }
}

// Maneja el envío del formulario de contacto
function handleContactSubmit(e) {
    e.preventDefault();
    const email = sanitizeInput(document.getElementById('userEmail').value.trim());
    
    if (!isValidEmail(email)) {
        alert("Por favor ingrese un correo electrónico válido");
        return;
    }
    
    DOM.contactSuccess.style.display = 'block';
    this.reset();
    
    setTimeout(() => {
        DOM.contactSuccess.style.display = 'none';
    }, 5000);
}

// Obtiene temperatura basada en municipio
function getTemperature(municipio) {
    municipio = sanitizeInput(municipio);
    
    if (municipio.includes("Barranquilla") || municipio.includes("Cartagena")) {
        return Math.floor(Math.random() * 5) + 28;
    }
    if (municipio.includes("Riohacha")) {
        return Math.floor(Math.random() * 5) + 30;
    }
    if (municipio.includes("San Andrés") || municipio.includes("Providencia")) {
        return Math.floor(Math.random() * 3) + 29;
    }
    if (municipio.includes("Santa Marta")) {
        return Math.floor(Math.random() * 5) + 27;
    }
    return Math.floor(Math.random() * 5) + 26;
}

// Actualiza el widget del clima
function updateWeather(temp) {
    DOM.weather.innerHTML = '';
    const icon = document.createElement('i');
    
    if (temp > 28) {
        icon.className = 'fas fa-sun sun-icon';
        DOM.temp.textContent = `${temp}°C - Soleado`;
    } else if (temp > 24) {
        icon.className = 'fas fa-cloud-sun cloud-sun-icon';
        DOM.temp.textContent = `${temp}°C - Parcialmente nublado`;
    } else {
        icon.className = 'fas fa-cloud cloud-icon';
        DOM.temp.textContent = `${temp}°C - Nublado`;
    }
    
    DOM.weather.appendChild(icon);
}

// Obtiene los valores del formulario
function getFormInputs() {
    return {
        departamento: sanitizeInput(DOM.departamento.value),
        municipio: sanitizeInput(DOM.municipio.value),
        estrato: sanitizeInput(document.getElementById('estrato').value),
        consumo: parseFloat(document.getElementById('consumo').value),
        panelSize: parseFloat(DOM.panelSize.value)
    };
}

// Valida los inputs del formulario
function validateInputs(inputs) {
    if (!inputs.departamento || !inputs.municipio || !inputs.estrato || 
        isNaN(inputs.consumo) || inputs.consumo <= 0 || 
        isNaN(inputs.panelSize) || inputs.panelSize <= 0) {
        alert("Por favor complete todos los campos correctamente");
        return false;
    }
    
    if (inputs.consumo > 2000) {
        alert("El consumo mensual no puede exceder los 2000 kWh");
        return false;
    }
    
    return true;
}

// Realiza los cálculos principales
function calculateResults(inputs) {
    const horasSol = DATA.radiacion[inputs.municipio] || DATA.radiacion.default;
    const tarifa = DATA.tarifas[inputs.estrato] || DATA.tarifas["3"]; // Default estrato 3
    
    // Energía generada (kWh/mes) = tamaño sistema (kW) * horas sol/día * días/mes * eficiencia
    const energiaGenerada = inputs.panelSize * horasSol * CONFIG.diasPorMes * CONFIG.eficiencia;
    
    // Energía realmente consumida del sistema solar (no puede exceder el consumo total)
    const energiaConsumida = Math.min(energiaGenerada, inputs.consumo);
    
    // Ahorro monetario (la energía solar consumida * tarifa eléctrica)
    const ahorro = energiaConsumida * tarifa;
    
    // Factura actual (consumo total * tarifa)
    const facturaActual = inputs.consumo * tarifa;
    
    // Porcentaje de reducción en la factura
    const reduccionPorcentaje = Math.round((ahorro / facturaActual) * 100);
    
    // Costo del sistema solar (tamaño * costo por kW)
    const costoSistema = inputs.panelSize * CONFIG.costoKW;
    
    // Tiempo de recuperación de la inversión (años)
    const recuperacionAnios = (costoSistema / (ahorro * 12)).toFixed(1);
    
    // CO2 evitado anualmente (kg)
    const co2Evitado = Math.round(energiaGenerada * CONFIG.co2PorKWh * 12);
    
    return {
        energiaGenerada, 
        ahorro, 
        reduccionPorcentaje, 
        costoSistema, 
        recuperacionAnios,
        consumo: inputs.consumo, 
        energiaConsumida, 
        facturaActual, 
        co2Evitado,
        panelSize: inputs.panelSize, 
        horasSol, 
        tarifa, 
        estrato: inputs.estrato
    };
}

// Muestra los resultados en la interfaz
function displayResults(results) {
    const format = (num) => num.toLocaleString('es-CO');
    const round = (num) => Math.round(num);
    
    // Resultados principales
    document.getElementById('energiaGenerada').textContent = `${round(results.energiaGenerada)} kWh/mes`;
    document.getElementById('ahorroEstimado').textContent = `$${format(results.ahorro)}/mes`;
    document.getElementById('reduccionFactura').textContent = `${results.reduccionPorcentaje}%`;
    document.getElementById('costoSistema').textContent = `$${format(results.costoSistema)}`;
    document.getElementById('recuperacionInversion').textContent = `${results.recuperacionAnios} años`;
    
    // Explicaciones detalladas
    document.getElementById('explicacionGeneracion').textContent = 
        `Tu sistema de ${results.panelSize} kW puede generar aproximadamente ${round(results.energiaGenerada)} kWh/mes, ` +
        `considerando ${results.horasSol} horas de sol diarias y una eficiencia del ${CONFIG.eficiencia * 100}%.`;
    
    document.getElementById('explicacionAhorro').textContent = 
        `Ahorras $${format(results.ahorro)} al mes porque consumes ${round(results.energiaConsumida)} kWh ` +
        `de energía solar (de los ${round(results.energiaGenerada)} kWh generados), ` +
        `multiplicado por la tarifa de $${format(results.tarifa)} por kWh de tu estrato ${results.estrato}.`;
    
    document.getElementById('explicacionReduccion').textContent = 
        `Tu factura se reducirá en un ${results.reduccionPorcentaje}% porque estás reemplazando ` +
        `${Math.round((results.energiaConsumida/results.consumo)*100)}% de tu consumo con energía solar.`;
    
    document.getElementById('explicacionCosto').textContent = 
        `El costo estimado para un sistema de ${results.panelSize} kW es de $${format(results.costoSistema)}, ` +
        `considerando un precio de $${format(CONFIG.costoKW)} por kW instalado.`;
    
    document.getElementById('explicacionRecuperacion').textContent = 
        `La inversión se recuperará en ${results.recuperacionAnios} años, calculado dividiendo el costo del sistema ` +
        `($${format(results.costoSistema)}) entre tus ahorros anuales ($${format(round(results.ahorro*12))}).`;
    
    // Ahorros acumulados
    document.getElementById('ahorroAnual1').textContent = `$${format(round(results.ahorro * 12))}`;
    document.getElementById('ahorroAnual5').textContent = `$${format(round(results.ahorro * 60))}`;
    document.getElementById('ahorroAnual10').textContent = `$${format(round(results.ahorro * 120))}`;
    document.getElementById('ahorroAnual20').textContent = `$${format(round(results.ahorro * 240))}`;
    
    // Impacto ambiental
    document.getElementById('co2Evitado').textContent = `${format(results.co2Evitado)} kg`;
    document.getElementById('arbolesEquiv').textContent = `${round(results.co2Evitado / CONFIG.kgCO2Arbol)}`;
    document.getElementById('autosEquiv').textContent = `${round(results.co2Evitado / CONFIG.kgCO2Auto)}`;
}

// Inicializa el gráfico de radiación solar
function initSolarChart() {
    const ctx = document.getElementById('solarRadiationChart').getContext('2d');
    
    solarRadiationChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['La Guajira', 'Atlántico', 'Bolívar', 'Córdoba', 'Magdalena', 'Cesar', 'Sucre', 'San Andrés'],
            datasets: [{
                data: [6.2, 5.8, 5.7, 5.5, 5.9, 5.6, 5.4, 5.7],
                backgroundColor: [
                    'rgba(255, 159, 64, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(201, 203, 207, 0.7)',
                    'rgba(50, 205, 50, 0.7)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${ctx.raw} kWh/m²/día`
                    }
                },
                title: {
                    display: true,
                    text: 'Radiación Solar por Departamento'
                }
            },
            cutout: '65%',
            rotation: -30
        }
    });
}

// Renderiza el gráfico de ahorro
function renderChart(results) {
    const ctx = document.getElementById('ahorroChart').getContext('2d');
    
    // Destruir el gráfico anterior si existe
    if (ahorroChart) {
        ahorroChart.destroy();
    }
    
    ahorroChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Consumo Actual', 'Energía Generada', 'Ahorro', 'Nuevo Costo'],
            datasets: [{
                label: 'kWh/mes',
                data: [
                    results.consumo, 
                    results.energiaGenerada, 
                    Math.min(results.energiaGenerada, results.consumo), 
                    results.consumo - Math.min(results.energiaGenerada, results.consumo)
                ],
                backgroundColor: [
                    'rgba(231, 76, 60, 0.7)', 
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(46, 204, 113, 0.7)', 
                    'rgba(155, 89, 182, 0.7)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: { 
                y: { 
                    beginAtZero: true, 
                    title: { 
                        display: true, 
                        text: 'kWh/mes' 
                    } 
                } 
            },
            plugins: { 
                title: { 
                    display: true, 
                    text: 'Comparación de Consumo y Generación' 
                } 
            }
        }
    });
}

// Función para sanitizar inputs
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Validación de email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Inicializar la aplicación cuando el DOM esté listo
if (document.readyState !== 'loading') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', init);
}

const registradurias = {
    "Barranquilla": {
        coords: [10.9639, -74.7964],
        direccion: "Calle 72 #43-25, Barranquilla",
        horario: "L-V 8:00AM - 4:00PM"
    },
    "Cartagena": {
        coords: [10.3910, -75.4794],
        direccion: "Carrera 6 #36-100, Cartagena",
        horario: "L-V 8:00AM - 4:00PM"
    },
    "Santa Marta": {
        coords: [11.2408, -74.1990],
        direccion: "Calle 22 #5-55, Santa Marta",
        horario: "L-V 8:00AM - 4:00PM"
    },
    "Valledupar": {
        coords: [10.4631, -73.2532],
        direccion: "Calle 15 #10-34, Valledupar",
        horario: "L-V 8:00AM - 4:00PM"
    },
    "Montería": {
        coords: [8.7500, -75.8833],
        direccion: "Carrera 3 #24-50, Montería",
        horario: "L-V 8:00AM - 4:00PM"
    },
    "Sincelejo": {
        coords: [9.3047, -75.3978],
        direccion: "Calle 25 #15-30, Sincelejo",
        horario: "L-V 8:00AM - 4:00PM"
    },
    "Riohacha": {
        coords: [11.5442, -72.9069],
        direccion: "Calle 1 #7-50, Riohacha",
        horario: "L-V 8:00AM - 4:00PM"
    },
    "San Andrés": {
        coords: [12.5847, -81.7006],
        direccion: "Avenida Newball #3-40, San Andrés",
        horario: "L-V 8:00AM - 4:00PM"
    }
};

let map;
let userMarker;
let routingControl;

// Inicializar mapa
function initMap() {
    map = L.map('map').setView([10.0, -74.5], 7); // Centro en la región Caribe
    
    // Capa base (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    // Añadir marcadores de registradurías
    Object.entries(registradurias).forEach(([ciudad, data]) => {
        L.marker(data.coords, {
            icon: L.divIcon({ className: 'custom-marker', iconSize: [20, 20] })
        }).addTo(map)
        .bindPopup(`<b>${ciudad}</b><br>${data.direccion}<br><i>${data.horario}</i>`);
    });

    // Control de ubicación
    L.control.locate({
        position: 'topright',
        strings: { title: "Mi ubicación" },
        locateOptions: { enableHighAccuracy: true }
    }).addTo(map);

    // Evento click para seleccionar origen
    map.on('click', (e) => {
        if (routingControl) map.removeControl(routingControl);
        if (userMarker) map.removeLayer(userMarker);
        
        userMarker = L.marker([e.latlng.lat, e.latlng.lng], {
            draggable: true,
            icon: L.divIcon({ className: 'custom-marker', iconSize: [20, 20] })
        }).addTo(map)
        .bindPopup("Mi ubicación").openPopup();

        document.getElementById('route-container').style.display = 'block';
    });
}

// Calcular ruta
function calcularRuta() {
    const ciudad = document.getElementById('destino-select').value;
    if (!userMarker || !ciudad) return alert("Seleccione ubicación y destino");

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userMarker.getLatLng().lat, userMarker.getLatLng().lng),
            L.latLng(registradurias[ciudad].coords[0], registradurias[ciudad].coords[1])
        ],
        routeWhileDragging: true,
        language: 'es',
        lineOptions: { styles: [{color: '#2c3e50', opacity: 0.7, weight: 5}] },
        show: false // No mostrar instrucciones por defecto
    }).addTo(map);

    routingControl.on('routesfound', (e) => {
        const { totalDistance, totalTime } = e.routes[0].summary;
        document.getElementById('route-summary').innerHTML = `
            <div class="summary-item"><strong>Distancia:</strong><br>${(totalDistance/1000).toFixed(1)} km</div>
            <div class="summary-item"><strong>Tiempo:</strong><br>${Math.round(totalTime/60)} minutos</div>
        `;
        
        // Mostrar instrucciones
        const instructions = e.routes[0].instructions;
        let html = '<ol>';
        instructions.forEach(instruction => {
            html += `<li>${instruction.text}</li>`;
        });
        html += '</ol>';
        document.getElementById('route-instructions').innerHTML = html;
    });
}
