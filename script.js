document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('cutForm');
  const resultDiv = document.getElementById('result');
  const savedOrdersList = document.getElementById('savedOrders');

  const loadSavedOrders = () => {
    savedOrdersList.innerHTML = '';
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    orders.forEach((order, index) => {
      const li = document.createElement('li');
      li.className = 'list-group-item d-flex justify-content-between align-items-center';
      li.textContent = order.name;
      const btnGroup = document.createElement('div');

      const loadBtn = document.createElement('button');
      loadBtn.className = 'btn btn-sm btn-outline-primary me-2';
      loadBtn.textContent = 'Cargar';
      loadBtn.addEventListener('click', () => {
        document.getElementById('pedido').value = order.name;
        document.getElementById('panelLength').value = order.length;
        document.getElementById('panelThickness').value = order.thickness;
        document.getElementById('cuts').value = order.cuts;
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn-sm btn-outline-danger';
      deleteBtn.textContent = 'Eliminar';
      deleteBtn.addEventListener('click', () => {
        orders.splice(index, 1);
        localStorage.setItem('orders', JSON.stringify(orders));
        loadSavedOrders();
      });

      btnGroup.appendChild(loadBtn);
      btnGroup.appendChild(deleteBtn);
      li.appendChild(btnGroup);
      savedOrdersList.appendChild(li);
    });
  };

  loadSavedOrders();

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const pedido = document.getElementById('pedido').value.trim();
    const panelLength = parseInt(document.getElementById('panelLength').value);
    const thickness = document.getElementById('panelThickness').value;
    const cutsRaw = document.getElementById('cuts').value.trim().split('\n');

    const cuts = [];
    for (let line of cutsRaw) {
      const match = line.match(/^(\d+)[xX](\d+)$/);
      if (match) {
        const qty = parseInt(match[1]);
        const len = parseInt(match[2]);
        for (let i = 0; i < qty; i++) cuts.push(len);
      }
    }

    cuts.sort((a, b) => b - a);

    const panels = [];
    for (let cut of cuts) {
      let placed = false;
      for (let panel of panels) {
        const used = panel.reduce((a, b) => a + b, 0);
        if (used + cut <= panelLength) {
          panel.push(cut);
          placed = true;
          break;
        }
      }
      if (!placed) panels.push([cut]);
    }

    // Guardar pedido
    const orders = JSON.parse(localStorage.getItem('orders')) || [];
    orders.push({ name: pedido, length: panelLength, thickness, cuts: cutsRaw.join('\n') });
    localStorage.setItem('orders', JSON.stringify(orders));
    loadSavedOrders();

    // Mostrar resultado
    let html = `<h4>Pedido: ${pedido}</h4>`;
    html += `<p><strong>Grosor:</strong> ${thickness} mm</p>`;
    html += `<p><strong>Largo del panel:</strong> ${panelLength} mm</p>`;
    html += `<p><strong>Total de paneles necesarios:</strong> ${panels.length}</p>`;

    panels.forEach((panel, i) => {
      const used = panel.reduce((a, b) => a + b, 0);
      const retal = panelLength - used;
      html += `
        <div class="card mb-3">
          <div class="card-body">
            <h5>Panel ${i + 1}</h5>
            <p><strong>Cortes:</strong> ${panel.join(', ')}</p>
            <p><strong>Usado:</strong> ${used} mm</p>
            <p><strong>Retal:</strong> ${retal} mm</p>
          </div>
        </div>`;
    });

    // Botón para exportar a PDF
    html += `<button class="btn btn-success" id="exportPDF">Exportar a PDF</button>`;

    resultDiv.innerHTML = html;

    document.getElementById('exportPDF').addEventListener('click', () => {
      const doc = new jsPDF();

      doc.setFontSize(14);
      doc.text(`Pedido: ${pedido}`, 10, 10);
      doc.text(`Grosor: ${thickness} mm`, 10, 20);
      doc.text(`Largo del panel: ${panelLength} mm`, 10, 30);
      doc.text(`Total paneles: ${panels.length}`, 10, 40);

      let y = 50;
      panels.forEach((panel, i) => {
        const used = panel.reduce((a, b) => a + b, 0);
        const retal = panelLength - used;

        doc.text(`Panel ${i + 1}:`, 10, y);
        doc.text(`Cortes: ${panel.join(', ')}`, 20, y + 10);
        doc.text(`Usado: ${used} mm - Retal: ${retal} mm`, 20, y + 20);
        y += 30;

        if (y > 270) {
          doc.addPage();
          y = 20;
        }
      });

      doc.save(`${pedido}_desglose.pdf`);
    });
  });
});
