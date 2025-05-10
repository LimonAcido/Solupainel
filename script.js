let paneles = [];

function agregarPanel() {
  const cliente = document.getElementById('cliente').value.trim();
  const grosor = parseInt(document.getElementById('grosor').value);
  const cantidad = parseInt(document.getElementById('cantidad').value);
  const largo = parseInt(document.getElementById('largo').value);

  if (cliente && grosor && cantidad && largo) {
    paneles.push({ cliente, grosor, cantidad, largo });
    mostrarPaneles();
    document.getElementById('btnExportar').disabled = true;
  } else {
    alert("Por favor, completa todos los campos correctamente.");
  }
}

function mostrarPaneles() {
  const lista = document.getElementById('lista-paneles');
  lista.innerHTML = "";
  paneles.forEach((p, index) => {
    const item = document.createElement('li');
    item.className = "list-group-item d-flex align-items-center";
    item.innerHTML = `
      Cliente: ${p.cliente} | Grosor: ${p.grosor}mm | ${p.cantidad} paneles de ${p.largo}mm
      <button class="btn btn-sm btn-danger ms-auto" onclick="eliminarPanel(${index})">Eliminar</button>
    `;
    lista.appendChild(item);
  });
}

function eliminarPanel(index) {
  paneles.splice(index, 1);
  mostrarPaneles();
}


function desglosarPaneles() {
  const panelLargo = 13500;
  let resultados = [];
  let panelesParaDesglose = [];

  paneles.forEach(p => {
    for (let i = 0; i < p.cantidad; i++) {
      panelesParaDesglose.push({ cliente: p.cliente, grosor: p.grosor, cantidad: p.cantidad, largo: p.largo });
    }
  });

  const porGrosor = {};
  panelesParaDesglose.forEach(p => {
    if (!porGrosor[p.grosor]) porGrosor[p.grosor] = [];
    porGrosor[p.grosor].push(p);
  });

  let resultadoTexto = "";

  for (const grosor in porGrosor) {
    let panelesGrosor = porGrosor[grosor].slice();
    resultadoTexto += `Grosor ${grosor}mm:
`;

    while (panelesGrosor.length > 0) {
      let largoRestante = panelLargo;
      let cortes = [];

      for (let i = 0; i < panelesGrosor.length; ) {
        if (panelesGrosor[i].largo <= largoRestante) {
          cortes.push(panelesGrosor[i]);
          largoRestante -= panelesGrosor[i].largo;
          panelesGrosor.splice(i, 1);
        } else {
          i++;
        }
      }

      resultadoTexto += `- 1 Panel de 13500mm:
`;
      cortes.forEach(c => {
        resultadoTexto += `   • ${c.largo}mm para ${c.cliente}
`;
      });
      resultadoTexto += `   (Sobrante: ${largoRestante}mm)

`;
    }
  }



  document.getElementById('resultado').textContent = resultadoTexto;
  document.getElementById('btnExportar').disabled = false;
}

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const fecha = new Date().toLocaleDateString();
  doc.setFontSize(12);
  doc.text(`Desglose de Paneles - ${fecha}`, 10, 10);
  
  const resultado = document.getElementById('resultado').textContent;
  const lineas = resultado.split('\n');
  let y = 20;
  let pageHeight = doc.internal.pageSize.height;
  
  lineas.forEach(linea => {
    if (y > pageHeight - 10) {
      doc.addPage();
      y = 10;
    }
    doc.text(linea, 10, y);
    y += 7;
  });
  
  doc.save(`desglose_${fecha.replace(/\//g, '-')}.pdf`);
}