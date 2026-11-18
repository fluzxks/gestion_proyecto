(() => {
  'use strict';
  const { render, esc, num } = window.Piloto;
  const pct = (value) => `${num(value * 100, 0)}%`;
  const names = {
    KMeans: 'K-Means', Ward_k5: 'Ward jerárquico', GMM_k5: 'Mezcla gaussiana', DBSCAN_eps05_min5: 'DBSCAN'
  };
  const alternatives = {
    KMeans: 'Centros reutilizables para asignar nuevos clientes.',
    Ward_k5: 'Mejor silueta por un margen estrecho. Requiere definir la asignación de casos nuevos.',
    GMM_k5: 'Entrega pertenencias suaves. Se evaluaron cinco componentes.',
    DBSCAN_eps05_min5: 'La silueta excluye los casos marcados como ruido.'
  };
  const cases = {
    directo: ['Datos completos', 'Ingreso 60 k$ · Puntaje 50'],
    estimado: ['Falta el puntaje', 'Ingreso 60 k$ · Edad 35 · Sin puntaje'],
    invalido: ['Ingreso negativo', 'Ingreso −1 k$ · Puntaje 50'],
    incompleto: ['Información insuficiente', 'Ingreso 60 k$ · Sin puntaje ni edad'],
    fuera: ['Ingreso fuera del rango', 'Ingreso 1.000 k$ · Puntaje 50'],
    puntaje: ['Puntaje fuera de escala', 'Ingreso 60 k$ · Puntaje 101'],
    texto: ['Ingreso no numérico', 'Ingreso «no numérico» · Puntaje 50'],
    puntaje_texto: ['Puntaje no numérico', 'Ingreso 60 k$ · Edad 35 · Puntaje «error»']
  };
  const methods = {
    directo: 'Asignación directa', estimado: 'Estimación por árbol',
    rechazado: 'Registro rechazado', fuera_de_dominio: 'Fuera del rango observado'
  };
  const safeguards = {
    '200_asignaciones': ['Cobertura de asignación', 'Todos los registros del caso tienen grupo'],
    particiones_sin_interseccion: ['Separación de muestras', 'Entrenamiento y prueba no comparten filas'],
    sin_genero_en_arbol: ['Variables del árbol', 'La estimación usa edad e ingreso']
  };
  const links = (items) => `<div class="tech-links">${items.map(([url, text]) => `<a href="evidencias/${url}" target="_blank" rel="noopener">${text}<span aria-hidden="true"> ↗</span></a>`).join('')}</div>`;
  const section = (label, title, subtitle) => `<header class="section-head"><div class="eyebrow">${label}</div><h1>${title}</h1><p class="lead">${subtitle}</p></header>`;
  const metric = (label, value, context) => `<div class="tech-metric"><span>${label}</span><strong>${value}</strong><small>${context}</small></div>`;

  function modelHtml(r) {
    const size = r.filas;
    const nTest = r.metricas.n_test;
    const from = r.genero.find((item) => item.genero === 'F');
    const to = r.genero.find((item) => item.genero === 'M');
    const gap = from.media - to.media;
    const [lo, hi] = r.ic95_diferencia;
    return `${section('EVIDENCIA DEL MODELO', 'Cómo elegimos los cinco grupos', 'La selección equilibra separación entre perfiles y facilidad de asignación para operar el piloto.')}
      <div class="tech-stats">
        ${metric('Registros del caso', num(size), `${num(size - nTest)} para ajustar · ${num(nTest)} reservados para prueba`)}
        ${metric('Silueta en entrenamiento', num(r.silueta_train, 3), 'K-Means · cinco grupos')}
        ${metric('Silueta en prueba', num(r.silueta_test, 3), 'Separación interna en la muestra reservada')}
      </div>
      <div class="tech-grid tech-grid--analysis">
        <article class="panel tech-panel">
          <div class="tech-panel-head"><div><div class="eyebrow">SELECCIÓN DE K</div><h2>Silueta por número de grupos</h2></div><span class="tech-pill">K-Means</span></div>
          <p class="muted tech-chart-caption">Un valor mayor indica grupos más compactos y separados. Selecciona una barra para inspeccionarla.</p>
          <div class="tech-chart-shell" aria-label="Gráfico de silueta de entrenamiento por número de grupos">
            <div class="tech-axis" aria-hidden="true"><span>0,60</span><span>0,45</span><span>0,30</span><span>0,15</span><span>0</span></div>
            <div class="tech-plot-grid">${r.comparacion.map((entry) => `<button class="tech-k" type="button" data-tech-k="${entry.k}" aria-pressed="${entry.k === r.k}" aria-label="${entry.k} grupos, silueta ${num(entry.silueta_media, 3)}" style="--height:${entry.silueta_media / .6 * 100}%">
              <span class="tech-stick"><span class="tech-value">${num(entry.silueta_media, 3)}</span></span><span class="tech-k-label">${entry.k}</span></button>`).join('')}</div>
          </div>
          <div class="tech-k-detail" data-tech-k-detail aria-live="polite"></div>
        </article>
        <article class="panel tech-panel">
          <div class="eyebrow">ALTERNATIVAS</div><h2>Por qué operar con K-Means</h2>
          <div class="tech-alternatives">${r.alternativas.map((a) => `<div class="tech-alt${a.modelo === 'KMeans' ? ' tech-alt--chosen' : ''}">
            <div><strong>${esc(names[a.modelo] || a.modelo)}</strong><small>${num(a.grupos)} grupos${a.ruido ? ` · ${num(a.ruido)} fuera de los grupos` : ''}</small></div>
            <b>${num(a.silueta, 3)}</b><p>${esc(alternatives[a.modelo] || '')}</p>
          </div>`).join('')}</div>
          <p class="tech-note">Ward obtuvo ${num(r.alternativas.find((a) => a.modelo === 'Ward_k5').silueta - r.silueta_train, 4)} más de silueta. Conservamos K-Means para aplicar centros ya calculados a cada nuevo lote.</p>
        </article>
      </div>
      <div class="tech-grid">
        <article class="panel tech-panel"><div class="eyebrow">VARIABLES</div><h2>Ingreso y puntaje orientan la oferta</h2>
          <p>El agrupamiento cruza ingreso anual y puntaje de gasto. Al estandarizar ambos, su escala original no altera el peso de cada variable en la distancia.</p>
          <div class="tech-tags"><span>Ingreso anual en k$</span><span>Puntaje de 1 a 100</span></div>
          <p class="tech-note">El puntaje es un indicador de la fuente. Para confirmar compras, recurrencia o margen hace falta el historial comercial.</p>
        </article>
        <article class="panel tech-panel"><div class="eyebrow">ANÁLISIS DESCRIPTIVO</div><h2>Por qué no segmentamos por género</h2>
          <div class="tech-gender-bars" aria-label="Puntaje medio observado por categoría de género">${[from, to].map((a) => `<div><span>${a.genero === 'F' ? 'Mujeres' : 'Hombres'} <small>(n=${num(a.n)})</small></span><div class="tech-track" aria-hidden="true"><i style="width:${a.media}%"></i></div><strong>${num(a.media, 2)}</strong></div>`).join('')}</div>
          <p>Diferencia observada de <strong>${num(gap, 2)} puntos</strong>. El intervalo bootstrap al 95% va de ${num(lo, 2)} a ${num(hi, 2)} y cruza cero. El caso aporta evidencia insuficiente para usar género como criterio comercial.</p>
        </article>
      </div>
      <article class="panel tech-panel tech-pipeline"><div class="eyebrow">REPRODUCIBILIDAD</div><h2>De la muestra al piloto</h2>
        <ol class="tech-steps"><li><strong>Validar</strong><span>Revisar esquema, valores y rangos de entrada.</span></li>
          <li><strong>Ajustar</strong><span>Separar los datos, estandarizar con entrenamiento y probar K de 2 a 10 con cinco semillas.</span></li>
          <li><strong>Comprobar</strong><span>Medir silueta en la muestra reservada y contrastar el árbol con la regla mayoritaria.</span></li>
          <li><strong>Revisar</strong><span>Asignar por fila y derivar estimaciones y casos fuera de rango. Validar ofertas con un control comercial posterior.</span></li></ol>
        <p class="tech-note">En ${num(r.sensibilidad_muestreo.repeticiones)} submuestras de entrenamiento, el ARI medio fue ${num(r.sensibilidad_muestreo.ari_media, 3)}. Mide estabilidad de la agrupación en este caso.</p>
        ${links([['resultados.json', 'Resultados y rangos'], ['seleccion_k.csv', 'Comparación por K'], ['alternativas.csv', 'Métodos comparados']])}
      </article>`;
  }

  render.modelo = (el, { resultados: r }) => {
    el.innerHTML = modelHtml(r);
    const detail = el.querySelector('[data-tech-k-detail]');
    const bars = [...el.querySelectorAll('[data-tech-k]')];
    const update = (k) => {
      const m = r.comparacion.find((entry) => entry.k === k);
      bars.forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.techK) === k)));
      detail.innerHTML = `<span class="tech-pill">${k === r.k ? 'Configuración elegida' : 'Alternativa explorada'}</span>
        <strong>${k} grupos · Silueta ${num(m.silueta_media, 3)}</strong>
        <span>ARI entre inicializaciones ${num(m.ari_inicializaciones, 3)}</span>`;
    };
    bars.forEach((button) => button.addEventListener('click', () => update(Number(button.dataset.techK))));
    update(r.k);
  };

  function resultCard(row) {
    const method = row.Metodo;
    const review = row.Revision === true || String(row.Revision).toLowerCase() === 'true';
    const hasGroup = row.Grupo !== '' && row.Grupo != null;
    const group = hasGroup ? `G${num(Number(row.Grupo), 0)}` : 'Sin asignación';
    let explanation = row.Motivo;
    if (method === 'estimado') explanation = 'El árbol propuso un grupo con edad e ingreso. Antes de usarlo, un analista debe revisar la asignación.';
    if (method === 'directo') explanation = 'Los datos cumplen el contrato. K-Means asignó el registro al centro más cercano.';
    return `<div class="tech-result tech-result--${esc(method)}"><div class="tech-result-meta"><div class="eyebrow">SALIDA REGISTRADA</div><span class="tech-pill">${esc(methods[method] || method)}</span></div>
      <strong>${group}</strong><p>${esc(explanation)}</p><small>${review ? 'Requiere revisión humana' : 'Registro válido para la asignación descriptiva'}</small></div>`;
  }

  function matrixHtml(m) {
    return `<div class="table-wrap"><table class="tech-matrix"><caption>Matriz de 40 casos. Filas = K-Means y columnas = grupo estimado por el árbol.</caption>
      <thead><tr><th scope="col">Grupo K-Means</th>${m.matriz[0].map((_, i) => `<th scope="col">G${i + 1}</th>`).join('')}</tr></thead>
      <tbody>${m.matriz.map((row, ri) => `<tr><th scope="row">G${ri + 1}</th>${row.map((v, ci) => `<td class="${ri === ci ? 'tech-diagonal' : v > 0 ? 'tech-off' : ''}">${num(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  render.pruebas = (el, { resultados: r, pruebasEntrada: input }) => {
    const passed = r.pruebas.filter((p) => p.ok).length;
    const m = r.metricas;
    const quick = ['directo', 'estimado', 'fuera', 'invalido'].filter((id) => input.some((row) => row.CustomerID === id));
    el.innerHTML = `${section('CONTROL DE CALIDAD', 'Qué pasa al procesar un lote', 'Explora casos de prueba ya ejecutados y comprueba cómo el piloto asigna, deriva a revisión o rechaza cada fila.')}
      <div class="tech-stats">
        ${metric('Pruebas aprobadas', `${passed}/${r.pruebas.length}`, 'Contratos, integración y salvaguardas')}
        ${metric('Acuerdo árbol vs. K-Means', pct(m.coincidencia), `${m.aciertos} de ${m.n_test} grupos coincidentes`)}
        ${metric('Referencia mayoritaria', pct(m.referencia_mayoria), 'Asignar siempre el grupo más frecuente')}
      </div>
      <article class="panel tech-panel tech-demo">
        <div class="tech-panel-head"><div><div class="eyebrow">DEMO INTERACTIVA</div><h2>Una fila, una decisión trazable</h2></div><span class="tech-pill">Ejecución reproducida</span></div>
        <div class="tech-shortcuts" aria-label="Casos rápidos">${quick.map((id) => `<button type="button" class="tech-case" data-tech-case="${id}" aria-pressed="false">${cases[id][0]}</button>`).join('')}</div>
        <div class="tech-grid tech-demo-grid">
          <div class="tech-case-input">
            <label for="tech-case-select">Caso de prueba</label>
            <select id="tech-case-select">${input.map((row) => `<option value="${esc(row.CustomerID)}">${esc(cases[row.CustomerID]?.[0] || row.CustomerID)}</option>`).join('')}</select>
            <p data-tech-case-input></p>
            <small>Los casos sintetizan fallos de entrada para probar cada ruta.</small>
          </div>
          <div data-tech-case-result aria-live="polite" aria-atomic="true"></div>
        </div>
        <p class="tech-note">La demo muestra salidas guardadas de la ejecución. Seleccionar un caso no vuelve a entrenar ni ejecuta el modelo.</p>
      </article>
      <div class="tech-grid tech-grid--checks">
        <article class="panel tech-panel"><div class="eyebrow">PRUEBAS DEL ARTEFACTO</div><h2>Resultados de integración</h2>
          <div class="table-wrap"><table class="tech-checks"><thead><tr><th scope="col">Caso</th><th scope="col">Resultado</th><th scope="col">Estado</th></tr></thead>
          <tbody>${r.pruebas.map((p) => `<tr><th scope="row">${esc(cases[p.prueba]?.[0] || safeguards[p.prueba]?.[0] || p.prueba)}</th>
          <td>${esc(methods[p.obtenido] || safeguards[p.prueba]?.[1] || p.obtenido || '—')}</td><td><span class="tech-status${p.ok ? '' : ' tech-status--failed'}">${p.ok ? 'Aprobada' : 'Fallida'}</span></td></tr>`).join('')}</tbody></table></div>
        </article>
        <article class="panel tech-panel"><div class="eyebrow">VALIDACIÓN DEL ESTIMADOR</div><h2>Cuándo revisar la sugerencia</h2>
          ${matrixHtml(m)}
          <div class="callout tech-warning">En ${num(m.matriz[4][3])} casos, el árbol sugirió G4 para registros G5. Ese cambio podría alterar la oferta, por eso las estimaciones pasan a revisión humana.</div>
          <p class="tech-note">El acuerdo compara las predicciones del árbol con los grupos de K-Means en la muestra de prueba. La conversión y el margen requieren un piloto comercial con control.</p>
        </article>
      </div>
      ${links([['pruebas_entradas.csv', 'Salidas de los ocho casos'], ['pruebas.csv', 'Listado de las once pruebas'], ['reglas_arbol.txt', 'Reglas del árbol']])}`;
    const select = el.querySelector('#tech-case-select');
    const description = el.querySelector('[data-tech-case-input]');
    const output = el.querySelector('[data-tech-case-result]');
    const buttons = [...el.querySelectorAll('[data-tech-case]')];
    function change(id) {
      const row = input.find((item) => item.CustomerID === id);
      if (!row) return;
      select.value = id;
      description.textContent = cases[id]?.[1] || '';
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.techCase === id)));
      output.innerHTML = resultCard(row);
    }
    select.addEventListener('change', () => change(select.value));
    buttons.forEach((button) => button.addEventListener('click', () => change(button.dataset.techCase)));
    change(select.value);
  };
})();
