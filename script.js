document.addEventListener('DOMContentLoaded', () => {
    // --- NAVEGACIÓN Y VISTAS ---
    const navLinks = { desglose: document.getElementById('navDesglose'), historial: document.getElementById('navHistorial') };
    const views = { desglose: document.getElementById('viewDesglose'), resultados: document.getElementById('viewResultados'), historial: document.getElementById('viewHistorial') };
    const backToCuttingListBtn = document.getElementById('backToCuttingListBtn');

    function navigateTo(viewName) {
        Object.values(views).forEach(v => v.classList.remove('active'));
        views[viewName].classList.add('active');
        Object.values(navLinks).forEach(link => link.classList.remove('active'));
        if (navLinks[viewName]) {
            navLinks[viewName].classList.add('active');
        }
        if (viewName === 'historial') {
            renderHistory();
        }
    }

    navLinks.desglose.addEventListener('click', (e) => { e.preventDefault(); navigateTo('desglose'); });
    navLinks.historial.addEventListener('click', (e) => { e.preventDefault(); navigateTo('historial'); });
    backToCuttingListBtn.addEventListener('click', () => navigateTo('desglose'));

    // --- ESTADO Y CONSTANTES ---
    const PANEL_LARGO_FIJO = 13500;
    const CORTE_BONUS = 10; // 10mm de bonus por cada corte/pieza
    const HISTORY_KEY = 'solupainel_history_v4';
    let cuttingList = [];
    let lastCalculationResult = null;

    // --- ELEMENTOS DEL DOM ---
    const clienteInput = document.getElementById('cliente');
    const grosorInput = document.getElementById('grosor');
    const piezaLargoInput = document.getElementById('piezaLargo');
    const piezaCantidadInput = document.getElementById('piezaCantidad');
    const addPieceBtn = document.getElementById('addPieceBtn');
    const cuttingListContainer = document.getElementById('cuttingListContainer');
    const calculateBtn = document.getElementById('calculateBtn');
    const resultsContainer = document.getElementById('resultsContainer');
    const clearListBtn = document.getElementById('clearListBtn');
    const historialListContainer = document.getElementById('historialListContainer');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // --- LÓGICA DE LA LISTA DE CORTE ---
    addPieceBtn.addEventListener('click', addPieceToList);
    clearListBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres limpiar la lista de corte actual?')) {
            cuttingList = [];
            renderCuttingList();
        }
    });
    
    function addPieceToList() {
        const cliente = clienteInput.value.trim();
        const grosor = grosorInput.value;
        const largo = parseFloat(piezaLargoInput.value);
        const cantidad = parseInt(piezaCantidadInput.value);

        if (!cliente) { alert('Por favor, introduce un nombre de cliente.'); return; }
        if (!largo || !cantidad || largo <= 0 || cantidad <= 0) { alert('Por favor, introduce un largo y cantidad válidos.'); return; }
        if (largo > PANEL_LARGO_FIJO + CORTE_BONUS) { alert(`El largo de la pieza (${largo}mm) no puede ser mayor que el del panel.`); return; }

        cuttingList.push({ id: Date.now(), cliente, grosor, largo, cantidad });
        renderCuttingList();
        
        // Limpiar inputs para la siguiente entrada
        piezaLargoInput.value = '';
        piezaCantidadInput.value = '1';
        piezaLargoInput.focus();
    }

    function renderCuttingList() {
        if (cuttingList.length === 0) {
            cuttingListContainer.innerHTML = `<p class="text-slate-500">Aún no hay piezas en la lista.</p>`;
            calculateBtn.disabled = true;
            clearListBtn.disabled = true;
            return;
        }

        cuttingListContainer.innerHTML = '';
        cuttingList.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex items-center justify-between bg-slate-100 p-3 rounded-lg gap-4 flex-wrap';
            itemDiv.innerHTML = `
                <div class="flex-grow font-semibold text-slate-800">${item.cliente}</div>
                <div class="flex items-center gap-4 text-sm">
                    <span class="bg-slate-200 py-1 px-2 rounded">${item.grosor}</span>
                    <div>
                        <span class="font-semibold">${item.cantidad}</span>
                        <span class="text-slate-600"> x </span>
                        <span class="font-semibold">${item.largo} mm</span>
                    </div>
                </div>
                <button class="delete-btn text-red-500 hover:text-red-700" data-id="${item.id}">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            itemDiv.querySelector('.delete-btn').addEventListener('click', () => removePieceFromList(item.id));
            cuttingListContainer.appendChild(itemDiv);
        });

        calculateBtn.disabled = false;
        clearListBtn.disabled = false;
    }

    function removePieceFromList(id) {
        cuttingList = cuttingList.filter(item => item.id !== id);
        renderCuttingList();
    }

    // --- LÓGICA DE CÁLCULO Y OPTIMIZACIÓN ---
    calculateBtn.addEventListener('click', () => {
        if (cuttingList.length === 0) return;

        // 1. Crear una lista plana de todas las piezas a cortar
        const allPieces = [];
        cuttingList.forEach(item => {
            for (let i = 0; i < item.cantidad; i++) {
                allPieces.push({ 
                    largo: item.largo, 
                    effectiveLargo: item.largo - CORTE_BONUS, // Aplicar regla de -10mm
                    cliente: item.cliente, 
                    grosor: item.grosor 
                });
            }
        });

        // 2. Ordenar de mayor a menor para el algoritmo FFD
        allPieces.sort((a, b) => b.largo - a.largo);

        // 3. Algoritmo de Bin Packing (First Fit Decreasing)
        const panels = [];
        
        allPieces.forEach(piece => {
            let placed = false;
            // Intentar colocar en un panel existente
            for (const panel of panels) {
                if (piece.effectiveLargo <= panel.remainingSpace) {
                    panel.pieces.push(piece);
                    panel.totalActualLength += piece.largo;
                    panel.remainingSpace -= piece.effectiveLargo;
                    placed = true;
                    break;
                }
            }
            // Si no cabe en ninguno, crear un panel nuevo
            if (!placed) {
                const newPanel = {
                    id: panels.length + 1,
                    pieces: [piece],
                    totalActualLength: piece.largo,
                    remainingSpace: PANEL_LARGO_FIJO - piece.effectiveLargo
                };
                panels.push(newPanel);
            }
        });
        
        // 4. Guardar resultado para posible guardado en historial
        lastCalculationResult = {
            id: Date.now(),
            name: `Lista del ${new Date().toLocaleDateString('es-ES')}`,
            createdAt: new Date().toISOString(),
            cuttingList: JSON.parse(JSON.stringify(cuttingList)), // Deep copy
            panels: panels
        };

        // 5. Mostrar resultados
        renderResults(lastCalculationResult);
        navigateTo('resultados');
    });

    function renderResults(calculationData) {
        resultsContainer.innerHTML = '';

        const summaryDiv = document.createElement('div');
        summaryDiv.className = 'bg-white p-6 rounded-2xl shadow-lg';
        summaryDiv.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="font-bold text-xl mb-4">Resumen General</h3>
                    <div class="flex justify-between text-lg mt-2">
                        <span>Total de Paneles Necesarios:</span>
                        <span class="font-bold text-2xl text-indigo-600 ml-4">${calculationData.panels.length}</span>
                    </div>
                </div>
                <button id="saveToHistoryBtn" class="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center gap-2">
                    <i class="fa-solid fa-save"></i> Guardar
                </button>
            </div>
        `;
        resultsContainer.appendChild(summaryDiv);
        summaryDiv.querySelector('#saveToHistoryBtn').addEventListener('click', saveToHistory);

        calculationData.panels.forEach(panel => {
            const panelDiv = document.createElement('div');
            panelDiv.className = 'bg-white p-6 rounded-2xl shadow-lg fade-in';
            
            const piecesHtml = panel.pieces.map(p => `
                <div class="bg-indigo-100 text-indigo-800 font-semibold py-1 px-3 rounded text-center">
                    ${p.largo} mm
                    <div class="text-xs font-normal text-indigo-600">${p.cliente} (${p.grosor})</div>
                </div>
            `).join('');
            
            const merma = PANEL_LARGO_FIJO - panel.totalActualLength;
            const totalLengthClass = panel.totalActualLength > PANEL_LARGO_FIJO ? 'text-orange-600' : 'text-slate-600';

            panelDiv.innerHTML = `
                <div class="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h4 class="font-bold text-lg">Panel #${panel.id}</h4>
                    <div>
                        <span class="text-sm font-semibold ${totalLengthClass}">Largo Total: ${panel.totalActualLength} mm</span>
                        <span class="text-sm font-semibold ${merma < 0 ? 'text-orange-600' : 'text-red-600'} ml-4">Merma: ${merma.toFixed(0)} mm</span>
                    </div>
                </div>
                <div class="bg-slate-200 p-4 rounded-lg">
                    <div class="flex flex-wrap gap-2">
                        ${piecesHtml}
                    </div>
                </div>
            `;
            resultsContainer.appendChild(panelDiv);
        });
    }
    
    // --- LÓGICA DEL HISTORIAL ---
    function getHistory() {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    }

    function saveToHistory() {
        if (!lastCalculationResult) return;
        const history = getHistory();
        const newName = prompt("Introduce un nombre para esta lista de corte:", lastCalculationResult.name);
        if (newName) {
            lastCalculationResult.name = newName;
            history.unshift(lastCalculationResult);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            alert(`'${newName}' guardado en el historial.`);
            document.getElementById('saveToHistoryBtn').disabled = true;
            document.getElementById('saveToHistoryBtn').textContent = 'Guardado';
        }
    }

    function renderHistory() {
        const history = getHistory();
        historialListContainer.innerHTML = '';
        clearHistoryBtn.disabled = history.length === 0;

        if (history.length === 0) {
            historialListContainer.innerHTML = `<p class="text-slate-500 col-span-full text-center mt-8">No hay listas guardadas en el historial.</p>`;
            return;
        }

        history.forEach(item => {
            const totalPieces = item.cuttingList.reduce((sum, curr) => sum + curr.cantidad, 0);
            const card = document.createElement('div');
            card.className = 'bg-white p-6 rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col justify-between';
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start">
                        <h4 class="font-bold text-lg mb-2 truncate">${item.name}</h4>
                        <span class="text-xs text-slate-500">${new Date(item.createdAt).toLocaleDateString('es-ES')}</span>
                    </div>
                    <div class="text-sm text-slate-600 space-y-1 mt-2">
                        <p><strong>Paneles usados:</strong> ${item.panels.length}</p>
                        <p><strong>Total de piezas:</strong> ${totalPieces}</p>
                    </div>
                </div>
                <div class="flex gap-2 mt-6">
                    <button class="load-btn w-full bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-2 px-4 rounded-lg transition" data-id="${item.id}">Cargar</button>
                    <button class="delete-btn bg-red-100 hover:bg-red-200 text-red-600 font-semibold py-2 px-4 rounded-lg transition" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            historialListContainer.appendChild(card);
        });
    }

    historialListContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = Number(target.dataset.id);
        if (target.classList.contains('load-btn')) {
            loadFromHistory(id);
        } else if (target.classList.contains('delete-btn')) {
            deleteFromHistory(id);
        }
    });
    
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres borrar TODO el historial? Esta acción no se puede deshacer.')) {
            localStorage.removeItem(HISTORY_KEY);
            renderHistory();
        }
    });

    function loadFromHistory(id) {
        const history = getHistory();
        const item = history.find(h => h.id === id);
        if (item) {
            cuttingList = item.cuttingList;
            renderCuttingList();
            renderResults(item);
            navigateTo('resultados');
        }
    }

    function deleteFromHistory(id) {
        if (confirm('¿Quieres eliminar esta lista del historial?')) {
            let history = getHistory();
            history = history.filter(h => h.id !== id);
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
            renderHistory();
        }
    }

    // --- INICIALIZACIÓN ---
    navigateTo('desglose');
    renderCuttingList();
});
