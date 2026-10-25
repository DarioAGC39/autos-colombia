/**
 * ==============================================================
 * PROYECTO UNIVERSITARIO: AUTOS COLOMBIA
 * Script de JavaScript Puro (Vanilla JS)
 * Archivo: app.js
 * ==============================================================
 *
 * Guía para el estudiante:
 * Este archivo implementa:
 * 1. El reloj en tiempo real sincronizado con la hora de Colombia.
 * 2. La limpieza y validación de placas en el navegador.
 * 3. La consulta asíncrona a la API de Flask para autocompletar
 *    los datos del vehículo si ya fue registrado previamente.
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==============================================================
    // 1. RELOJ EN TIEMPO REAL - HORA DE COLOMBIA (UTC-5)
    // ==============================================================
    function actualizarRelojColombia() {
        const elementoTexto = document.getElementById('fecha-hora-texto');
        if (!elementoTexto) return;

        const ahora = new Date();
        // Opciones de formato en español
        const opciones = {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };

        try {
            const formateador = new Intl.DateTimeFormat('es-CO', opciones);
            const partes = formateador.formatToParts(ahora);

            let dia = '', mes = '', anio = '', hora = '', minuto = '';
            partes.forEach(p => {
                if (p.type === 'day') dia = p.value;
                if (p.type === 'month') mes = p.value;
                if (p.type === 'year') anio = p.value;
                if (p.type === 'hour') hora = p.value;
                if (p.type === 'minute') minuto = p.value;
            });

            elementoTexto.textContent = `${dia} de ${mes} de ${anio} - ${hora}:${minuto} · Hora de Colombia`;
        } catch (e) {
            // Fallback si el navegador no soporta timeZone específico
            elementoTexto.textContent = ahora.toLocaleDateString('es-CO') + ' · Hora de Colombia';
        }
    }

    // Iniciar reloj y actualizar cada segundo
    actualizarRelojColombia();
    setInterval(actualizarRelojColombia, 10000);


    // ==============================================================
    // 2. NORMALIZACIÓN Y VALIDACIÓN DE PLACAS
    // ==============================================================
    const inputsPlaca = document.querySelectorAll('input[name="placa"], input#placa, input#placa-search');

    inputsPlaca.forEach(input => {
        input.addEventListener('input', (e) => {
            // Convertir a mayúsculas y quitar espacios y guiones
            let valor = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (valor.length > 7) {
                valor = valor.slice(0, 7);
            }
            e.target.value = valor;
        });
    });


    // ==============================================================
    // 3. AUTOCOMPLETADO ASÍNCRONO EN "REGISTRAR ENTRADA"
    // ==============================================================
    const inputPlacaEntrada = document.getElementById('placa');
    const selectTipo = document.getElementById('tipo');
    const inputColor = document.getElementById('color');
    const inputMarca = document.getElementById('marca');
    const inputModelo = document.getElementById('modelo');
    const formEntrada = document.getElementById('form-registrar-entrada');

    if (inputPlacaEntrada && selectTipo && inputColor && inputMarca && inputModelo) {

        // Cuando el usuario escribe la placa completa (6 caracteres)
        inputPlacaEntrada.addEventListener('blur', () => {
            consultarVehiculoExistente(inputPlacaEntrada.value.trim());
        });

        inputPlacaEntrada.addEventListener('keyup', (e) => {
            if (e.target.value.trim().length === 6) {
                consultarVehiculoExistente(e.target.value.trim());
            }
        });

        async function consultarVehiculoExistente(placa) {
            if (placa.length < 5) return;

            try {
                const respuesta = await fetch(`/api/vehiculo/${encodeURIComponent(placa)}`);
                if (!respuesta.ok) return;

                const datos = await respuesta.json();

                if (datos.encontrado && datos.vehiculo) {
                    // Si el vehículo ya existe en la base de datos, autocompletamos los campos
                    if (datos.vehiculo.tipo) selectTipo.value = datos.vehiculo.tipo;
                    if (datos.vehiculo.color) inputColor.value = datos.vehiculo.color;
                    if (datos.vehiculo.marca) inputMarca.value = datos.vehiculo.marca;
                    if (datos.vehiculo.modelo) inputModelo.value = datos.vehiculo.modelo;

                    // Si ya tiene un movimiento activo, avisar visualmente al usuario
                    if (datos.tiene_activo) {
                        mostrarAvisoMovimientoActivo(placa);
                    }
                }
            } catch (error) {
                console.log('Consulta informativa de vehículo:', error);
            }
        }

        function mostrarAvisoMovimientoActivo(placa) {
            // Si ya existe una alerta previa, no duplicarla
            if (document.getElementById('alerta-activo-dinamica')) return;

            const contenedorAlertas = document.querySelector('.alerts-container');
            if (!contenedorAlertas) return;

            const alerta = document.createElement('div');
            alerta.id = 'alerta-activo-dinamica';
            alerta.className = 'alert-banner alert-warning';
            alerta.innerHTML = `
                <div class="alert-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div class="alert-content">
                    <div class="alert-title">Este vehículo ya tiene un movimiento activo</div>
                    <div class="alert-text">No se puede registrar otra entrada para ${placa}. Primero debes registrar la salida del vehículo.</div>
                </div>
            `;
            contenedorAlertas.prepend(alerta);
        }

        // Validación en cliente antes de enviar formulario
        if (formEntrada) {
            formEntrada.addEventListener('submit', (e) => {
                let hayErrores = false;
                const placaVal = inputPlacaEntrada.value.trim().toUpperCase();

                // Validación simple de placa
                const regexPlaca = /^[A-Z]{3}[0-9]{3}$|^[A-Z]{3}[0-9]{2}[A-Z]{1}$/;
                if (!regexPlaca.test(placaVal)) {
                    marcarErrorCampo(inputPlacaEntrada, 'Formato inválido. Usa 3 letras y 3 números (KLM482).');
                    hayErrores = true;
                } else {
                    limpiarErrorCampo(inputPlacaEntrada);
                }

                if (!selectTipo.value) {
                    marcarErrorCampo(selectTipo, 'Selecciona el tipo de vehículo.');
                    hayErrores = true;
                } else {
                    limpiarErrorCampo(selectTipo);
                }

                if (!inputColor.value.trim()) {
                    marcarErrorCampo(inputColor, 'Ingresa el color del vehículo.');
                    hayErrores = true;
                } else {
                    limpiarErrorCampo(inputColor);
                }

                if (!inputMarca.value.trim()) {
                    marcarErrorCampo(inputMarca, 'Ingresa la marca del vehículo.');
                    hayErrores = true;
                } else {
                    limpiarErrorCampo(inputMarca);
                }

                if (!inputModelo.value.trim()) {
                    marcarErrorCampo(inputModelo, 'Ingresa el modelo del vehículo.');
                    hayErrores = true;
                } else {
                    limpiarErrorCampo(inputModelo);
                }

                if (hayErrores) {
                    e.preventDefault();
                }
            });
        }
    }

    function marcarErrorCampo(elemento, mensaje) {
        const grupo = elemento.closest('.form-group');
        if (!grupo) return;
        grupo.classList.add('has-error');

        let msgElemento = grupo.querySelector('.field-error-message');
        if (!msgElemento) {
            msgElemento = document.createElement('div');
            msgElemento.className = 'field-error-message';
            msgElemento.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><span>${mensaje}</span>`;
            grupo.appendChild(msgElemento);
        } else {
            msgElemento.querySelector('span').textContent = mensaje;
        }
    }

    function limpiarErrorCampo(elemento) {
        const grupo = elemento.closest('.form-group');
        if (!grupo) return;
        grupo.classList.remove('has-error');
        const msgElemento = grupo.querySelector('.field-error-message');
        if (msgElemento) msgElemento.remove();
    }

    // Botón Limpiar
    const btnLimpiar = document.getElementById('btn-limpiar');
    if (btnLimpiar && formEntrada) {
        btnLimpiar.addEventListener('click', () => {
            const errores = formEntrada.querySelectorAll('.has-error');
            errores.forEach(err => err.classList.remove('has-error'));
            const msgs = formEntrada.querySelectorAll('.field-error-message');
            msgs.forEach(m => m.remove());
            const alerta = document.getElementById('alerta-activo-dinamica');
            if (alerta) alerta.remove();
        });
    }

});
