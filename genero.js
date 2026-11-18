(() => {
  'use strict';

  const {render, esc, num} = window.Piloto;
  const signed = (value, decimals = 2) => `${value < 0 ? '−' : value > 0 ? '+' : ''}${num(Math.abs(value), decimals)}`;
  const pct = value => `${value.toFixed(4)}%`;
  const scoreAt = value => pct((value - 1) * 100 / 99);

  function gradeMean(row, heading, tone) {
    const aria = `${heading}: ${num(row.media, 2)} puntos de media, ${num(row.n)} registros.`;
    return `<div class="sp-mean-row" data-tone="${tone}">
      <div class="sp-mean-group"><b>${heading}</b><span>${num(row.n)} registros</span></div>
      <div class="sp-mean-rail" aria-hidden="true"><span class="sp-mean-fill" style="width:${scoreAt(row.media)}"></span><i class="sp-median" style="--median:${scoreAt(row.mediana)}" hidden></i></div>
      <strong aria-label="${esc(aria)}">${num(row.media, 2)}</strong>
    </div>`;
  }

  function intervalPlot(lo, hi, mean) {
    const min = Math.min(lo, 0, mean);
    const max = Math.max(hi, 0, mean);
    const step = Math.max(1, Math.ceil((max - min) / 6));
    const start = Math.floor(min / step) * step;
    const end = Math.max(start + step, Math.ceil(max / step) * step);
    const at = value => pct(100 * (value - start) / (end - start));
    const axis = [];
    for (let t = start; t <= end; t += step) {
      axis.push(`<span class="sp-axis-mark" style="--x:${at(t)}">${signed(t, 0)}</span>`);
    }
    const aria = `Intervalo bootstrap del 95%. Desde ${signed(lo)} hasta ${signed(hi)} puntos. Diferencia estimada ${signed(mean)} puntos entre mujeres y hombres. ${lo <= 0 && hi >= 0 ? 'El intervalo incluye cero.' : 'El intervalo queda a un lado del cero.'}`;

    return `<div class="sp-interval" role="img" aria-label="${esc(aria)}" style="--lo:${at(lo)};--hi:${at(hi)};--mean:${at(mean)};--zero:${at(0)}">
      <div class="sp-ci-axis" aria-hidden="true"></div>
      <div class="sp-zero-guide" aria-hidden="true"><span>Cero</span></div>
      <div class="sp-ci-segment" aria-hidden="true"></div>
      <span class="sp-ci-bound sp-ci-bound-lo" aria-hidden="true">${signed(lo)}</span>
      <span class="sp-ci-bound sp-ci-bound-hi" aria-hidden="true">${signed(hi)}</span>
      <div class="sp-ci-estimate" aria-hidden="true"><i></i><b>${signed(mean)}</b></div>
      <div class="sp-axis-labels" aria-hidden="true">${axis.join('')}</div>
    </div>`;
  }

  function scaleNote(profiles, difference) {
    const g4 = profiles?.find(p => p.grupo === 4);
    const g5 = profiles?.find(p => p.grupo === 5);
    if (!g4 || !g5) return '';
    const gap = g4.puntaje - g5.puntaje;
    return `<details class="sp-details sp-context">
      <summary>Poner la diferencia en contexto</summary>
      <div class="sp-details-body">
        <div class="sp-gap-pair"><div><strong>${num(Math.abs(difference), 2)} pts</strong><span>Brecha entre promedios por género</span></div><div><strong>${num(Math.abs(gap))} pts</strong><span>Brecha entre los centros G4 y G5</span></div></div>
        <p>Son referencias en la misma escala, calculadas sobre agrupaciones distintas. El puntaje participó en la formación de G4 y G5, por lo que sus centros sirven para describir esos segmentos.</p>
        <a class="sp-context-link" href="#segmentos">Explorar G4 y G5 <span aria-hidden="true">↗</span></a>
      </div>
    </details>`;
  }

  render['evidencia-gasto'] = (el, data) => {
    const results = data.resultados;
    const women = results.genero.find(row => row.genero === 'F');
    const men = results.genero.find(row => row.genero === 'M');
    const [lo, hi] = results.ic95_diferencia;
    const difference = women.media - men.media;
    const containsZero = lo <= 0 && hi >= 0;

    el.innerHTML = `<section class="sp-study">
      <header class="section-head sp-intro">
        <p class="eyebrow">Evidencia de gasto · análisis descriptivo</p>
        <h1>¿Cambia el puntaje de gasto por género?</h1>
        <p class="lead">Comparamos los promedios de mujeres y hombres según las categorías registradas en el Caso 03.</p>
      </header>
      <section class="sp-mean-panel" aria-labelledby="sp-mean-title">
        <div class="sp-means">
          <header class="sp-section-head"><div><h2 id="sp-mean-title">Puntaje medio</h2><p>Escala del índice de gasto: 1 a 100 puntos.</p></div><button type="button" class="sp-median-toggle" aria-pressed="false" aria-controls="sp-means-chart">Ver medianas</button></header>
          <div class="sp-mean-chart" id="sp-means-chart">
            ${gradeMean(women, 'Mujeres', 'cyan')}
            ${gradeMean(men, 'Hombres', 'amber')}
            <div class="sp-mean-axis" aria-hidden="true">${[1, 25, 50, 75, 100].map(tick => `<span style="--x:${scoreAt(tick)}">${tick}</span>`).join('')}</div>
          </div>
          <p class="sp-median-readout" hidden aria-live="polite">Medianas · Mujeres ${num(women.mediana, 2)} puntos y hombres ${num(men.mediana, 2)} puntos. La línea violeta marca cada mediana.</p>
        </div>
        <aside class="sp-mean-difference" aria-label="Diferencia observada">
          <p>Diferencia de promedios</p><strong>${signed(difference)}<small> pts</small></strong><span>Mujeres menos hombres</span>
          <small class="sp-sample">${num(women.n + men.n)} registros en estas categorías</small>
        </aside>
      </section>
      <section class="sp-inference" aria-labelledby="sp-ic-title">
        <figure class="sp-uncertainty">
          <figcaption><p class="eyebrow">Incertidumbre del promedio</p><h2 id="sp-ic-title">Intervalo bootstrap del 95%</h2><p class="sp-ic-definition">Diferencia de puntaje medio, mujeres menos hombres.</p></figcaption>
          ${intervalPlot(lo, hi, difference)}
          <div class="sp-plot-legend" aria-hidden="true"><span><i class="sp-key-line"></i> Intervalo del 95%</span><span><i class="sp-key-point"></i> Diferencia observada</span><span><i class="sp-key-zero"></i> Sin diferencia</span></div>
        </figure>
        <article class="sp-reading"><p class="eyebrow">Lectura para gerencia</p><h2>${containsZero ? 'El intervalo incluye cero' : 'El intervalo queda a un lado del cero'}</h2>
          <p>${containsZero ? 'Este análisis admite diferencias negativas, positivas y nulas. La evidencia disponible resulta insuficiente para segmentar ofertas por género.' : 'Esta muestra presenta una diferencia descriptiva. Antes de cambiar ofertas, se necesita validar el hallazgo con datos del cliente y criterios comerciales.'}</p>
          <p class="sp-reading-note">Demostrar igualdad o causalidad requeriría otro diseño. El indicador está en puntos. La fuente carece de compras observadas y montos gastados en CLP.</p>
        </article>
      </section>
      ${scaleNote(results.perfiles, difference)}
      <details class="sp-details">
        <summary>Cómo se calculó el intervalo</summary>
        <div class="sp-details-body"><p>Se hicieron 5.000 remuestreos con reemplazo dentro de cada categoría registrada, manteniendo el tamaño de cada grupo. En cada réplica se restó la media de hombres a la de mujeres. Los percentiles 2,5 y 97,5 de esas diferencias fijan los límites.</p><p>Es una comparación descriptiva de la muestra del caso. El análisis no ajusta por edad, ingreso ni otras variables.</p></div>
      </details>
      <p class="sp-source">Fuente · <a href="evidencias/resultados.json">Resultados reproducibles del Caso 03</a></p>
    </section>`;

    const toggle = el.querySelector('.sp-median-toggle');
    const markers = el.querySelectorAll('.sp-median');
    const readout = el.querySelector('.sp-median-readout');
    toggle.addEventListener('click', () => {
      const shown = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', String(shown));
      toggle.textContent = shown ? 'Ocultar medianas' : 'Ver medianas';
      markers.forEach(marker => { marker.hidden = !shown; });
      readout.hidden = !shown;
    });
  };
})();
