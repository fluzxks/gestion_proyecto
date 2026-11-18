(() => {
  'use strict';

  const { render, esc, num, money } = window.Piloto;
  const dayRange = (start, end) => start === end ? `D${start}` : `D${start}–D${end}`;
  const dates = Array.from({ length: 6 }, (_, i) => ({ label: `S${i + 1}`, start: i * 5 + 1, end: i * 5 + 5 }));
  const roleTag = (role) => `<span class="gm-role gm-role-${esc(role)}">${esc(role)}</span>`;
  const metric = (label, value, description = '') => `<div class="gm-metric"><dt>${esc(label)}</dt><dd>${esc(value)}</dd>${description ? `<dd class="gm-metric-note">${esc(description)}</dd>` : ''}</div>`;

  render.plan = (el, data) => {
    const source = data.plan;
    const tasks = source.plan;
    const roles = source.roles;
    const capacity = source.control_capacidad;
    let selectedTask = '4.1';

    el.innerHTML = `
      <header class="section-head">
        <p class="eyebrow">Ejecución propuesta</p>
        <h1>Plan de trabajo del piloto</h1>
        <p class="lead">La EDT ordena el trabajo y sus criterios de aceptación. El Gantt muestra cuándo se entrega cada parte desde la aprobación de inicio.</p>
      </header>
      <dl class="gm-metrics" aria-label="Resumen del cronograma">
        ${metric('Plazo del piloto', `${num(capacity.dias_habiles,0)} días hábiles`, 'Seis semanas desde el inicio aprobado')}
        ${metric('Esfuerzo total', `${num(capacity.horas,0)} h-persona`, `${roles.length} roles con dedicación planificada`)}
        ${metric('Pruebas de aceptación', `Día ${capacity.inicio_pruebas}`, 'Requieren el proceso por lotes y el tablero')}
      </dl>
      <section class="panel gm-panel" aria-labelledby="gm-gantt-title">
        <header class="panel-head gm-panel-head">
          <div><h2 id="gm-gantt-title">Gantt y entregables</h2><p class="muted">Selecciona una actividad para revisar su plazo, dependencias y evidencia esperada.</p></div>
          <div class="gm-field"><label for="gm-role-filter">Rol responsable</label><select id="gm-role-filter"><option value="">Todos los roles</option>${roles.map(r => `<option value="${esc(r.id)}">${esc(r.id)} · ${esc(r.rol)}</option>`).join('')}</select></div>
        </header>
        <div class="gm-gantt-scroll" tabindex="0" role="region" aria-label="Gantt de seis semanas, desplazable">
          <div class="gm-gantt-grid">
            <div class="gm-gantt-row gm-gantt-header"><span>Actividad · EDT</span><div class="gm-gantt-weeks">${dates.map(week => `<div><b>${week.label}</b><small>${dayRange(week.start, week.end)}</small></div>`).join('')}</div></div>
            <div data-gm-gantt></div>
          </div>
        </div>
        <div data-gm-task-detail aria-live="polite" class="gm-task-detail"></div>
        <p class="gm-source">Fuente · Plan maestro y EDT. Los días se cuentan desde el inicio aprobado. Disponibilidad y fechas pendientes de confirmación en H0.</p>
      </section>
      <section class="panel gm-panel" aria-labelledby="gm-capacity-title">
        <header class="panel-head gm-panel-head">
          <div><h2 id="gm-capacity-title">Capacidad del tramo de integración</h2><p class="muted">Proceso y tablero acumulan <strong>${num(capacity.horas_integracion,0)} h-persona</strong> entre D15 y D18, con un máximo de ${num(capacity.maximo_diario_por_persona,0)} h diarias por persona.</p></div>
          <div class="gm-field"><label for="gm-day-filter">Detalle de la jornada</label><select id="gm-day-filter">${data.diario.map(r => `<option value="${Number(r.dia)}"${Number(r.dia) === 15 ? ' selected' : ''}>Día ${Number(r.dia)} · Semana ${Number(r.semana)}</option>`).join('')}</select></div>
        </header>
        <div class="gm-capacity-grid">
          <div class="gm-capacity-chart" aria-label="Horas de integración por día">
            <p class="gm-legend"><span><i class="gm-key gm-key-pipe"></i>Proceso por lotes</span><span><i class="gm-key gm-key-bi"></i>Tablero</span></p>
            ${capacity.integracion.map(r => `<button type="button" class="gm-load" data-gm-load-day="${Number(r.dia)}" aria-pressed="${Number(r.dia) === 15}" aria-label="Día ${Number(r.dia)}. ${Number(r.proceso)} horas de proceso, ${Number(r.tablero)} de tablero, ${Number(r.total)} horas en total. Ver asignación.">
              <span>D${Number(r.dia)}</span><span class="gm-load-track" aria-hidden="true"><i class="gm-load-pipe" style="width:${100 * r.proceso / 40}%"></i><i class="gm-load-bi" style="width:${100 * r.tablero / 40}%"></i></span><strong>${num(r.total,0)} h</strong>
            </button>`).join('')}
            <p class="gm-source">La escala llega a 40 h-persona en un día para el equipo completo.</p>
          </div>
          <div class="gm-day-summary" data-gm-day-summary aria-live="polite"></div>
        </div>
        <details class="gm-details"><summary>Ver horas por persona y actividad de la jornada seleccionada</summary><div data-gm-day-assignments></div></details>
      </section>
      <section class="panel gm-panel" aria-labelledby="gm-team-title">
        <header class="panel-head"><h2 id="gm-team-title">Equipo y dedicación</h2><p class="muted">La planificación reserva tiempo para ejecución técnica, validación y coordinación con gerencia.</p></header>
        <div class="table-wrap gm-table-wrap"><table class="gm-table">
          <caption class="gm-sr-only">Dedicación semanal por rol en horas-persona</caption>
          <thead><tr><th scope="col">Rol / integrante</th>${dates.map(w => `<th class="gm-number" scope="col">${w.label}</th>`).join('')}<th class="gm-number" scope="col">Total</th></tr></thead>
          <tbody>${roles.map(r => `<tr><th scope="row">${roleTag(r.id)} ${esc(r.persona)}<small>${esc(r.responsabilidad)}</small></th>${r.semanas.map(h => `<td class="gm-number">${num(h,0)}</td>`).join('')}<td class="gm-number"><b>${num(r.horas,0)} h</b></td></tr>`).join('')}</tbody>
          <tfoot><tr><th scope="row">Total equipo</th>${dates.map((w, index) => `<td class="gm-number">${num(roles.reduce((sum,r) => sum + r.semanas[index], 0),0)}</td>`).join('')}<td class="gm-number">${num(capacity.horas,0)} h</td></tr></tfoot>
        </table></div>
        <p class="gm-source">Fuente · Asignación diaria por EDT y rol. Se trata de horas propuestas, validadas contra la capacidad del equipo.</p>
      </section>`;

    const filter = el.querySelector('#gm-role-filter');
    const gantt = el.querySelector('[data-gm-gantt]');
    const detail = el.querySelector('[data-gm-task-detail]');
    const day = el.querySelector('#gm-day-filter');
    const daySummary = el.querySelector('[data-gm-day-summary]');
    const dayAssignments = el.querySelector('[data-gm-day-assignments]');

    function showTask(task) {
      const owner = roles.find(r => r.id === task.responsable);
      const predecessors = String(task.dependencias || '').split(',').map(x => x.trim()).filter(Boolean);
      const blockers = predecessors.map(x => {
        const prior = tasks.find(t => t.id === x);
        return prior ? `${prior.id} · ${prior.tarea}` : x;
      });
      detail.innerHTML = `
        <div class="gm-task-detail-intro"><p class="eyebrow">Actividad ${esc(task.id)}</p><h3>${esc(task.tarea)}</h3><p>${roleTag(task.responsable)} ${esc(owner?.persona || '')} · ${dayRange(task.inicio_dia,task.fin_dia)} · ${num(task.horas_persona,0)} h-persona</p></div>
        <dl class="gm-task-facts"><div><dt>Depende de</dt><dd>${blockers.length ? blockers.map(esc).join(' · ') : 'Sin predecesora en la EDT'}</dd></div><div><dt>Criterio de aceptación</dt><dd>${esc(task.aceptacion)}</dd></div><div><dt>Justificación del esfuerzo</dt><dd>${esc(task.justificacion)}</dd></div></dl>`;
    }

    function showGantt() {
      const visible = filter.value ? tasks.filter(t => t.responsable === filter.value) : tasks;
      if (!visible.some(t => t.id === selectedTask)) selectedTask = visible[0]?.id;
      gantt.innerHTML = visible.map(t => {
        const range = dayRange(t.inicio_dia, t.fin_dia);
        return `<div class="gm-gantt-row ${t.id === selectedTask ? 'gm-is-selected' : ''}">
          <button type="button" class="gm-task-button" data-gm-task="${esc(t.id)}" aria-pressed="${t.id === selectedTask}"><span class="gm-task-code">${esc(t.id)}</span><span><strong>${esc(t.tarea)}</strong><small>${range} · ${esc(t.responsable)}</small></span></button>
          <div class="gm-timeline" aria-hidden="true"><span class="gm-timeline-bar gm-bar-${esc(t.responsable)}" style="grid-column:${Number(t.inicio_dia)} / ${Number(t.fin_dia) + 1}">${range}</span></div>
        </div>`;
      }).join('');
      const task = visible.find(t => t.id === selectedTask);
      if (task) showTask(task);
      else detail.textContent = 'El rol seleccionado no tiene actividades asociadas.';
    }

    function showDay() {
      const selected = Number(day.value);
      const summary = data.diario.find(row => Number(row.dia) === selected);
      const assignments = data.asignacion.filter(row => Number(row.dia) === selected);
      el.querySelectorAll('[data-gm-load-day]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.gmLoadDay) === selected)));
      daySummary.innerHTML = `<p class="eyebrow">Semana ${Number(summary.semana)}</p><h3>Día ${selected} <span>${num(summary.total,0)} h</span></h3>
        <dl class="gm-day-roles">${roles.map(r => `<div><dt>${esc(r.id)}</dt><dd>${num(summary[r.id],0)} h</dd></div>`).join('')}</dl>`;
      dayAssignments.innerHTML = `<div class="table-wrap gm-table-wrap"><table class="gm-table"><caption class="gm-sr-only">Asignación de la jornada ${selected}</caption><thead><tr><th scope="col">Actividad · EDT</th><th scope="col">Responsable de las horas</th><th scope="col" class="gm-number">Horas</th></tr></thead><tbody>
        ${assignments.map(r => `<tr><th scope="row">${esc(r.edt)} · ${esc(r.tarea)}</th><td>${roleTag(r.rol)} ${esc(r.persona)}</td><td class="gm-number">${num(r.horas,0)} h</td></tr>`).join('')}
        </tbody><tfoot><tr><th scope="row" colspan="2">Total jornada</th><td class="gm-number">${num(summary.total,0)} h</td></tr></tfoot></table></div>`;
    }

    filter.addEventListener('change', showGantt);
    gantt.addEventListener('click', event => {
      const button = event.target.closest('[data-gm-task]');
      if (!button) return;
      selectedTask = button.dataset.gmTask;
      gantt.querySelectorAll('[data-gm-task]').forEach(item => {
        item.setAttribute('aria-pressed', String(item === button));
        item.closest('.gm-gantt-row').classList.toggle('gm-is-selected', item === button);
      });
      showTask(tasks.find(t => t.id === selectedTask));
    });
    day.addEventListener('change', showDay);
    el.querySelectorAll('[data-gm-load-day]').forEach(button => button.addEventListener('click', () => {
      day.value = button.dataset.gmLoadDay;
      showDay();
    }));
    showGantt();
    showDay();
  };

  render.inversion = (el, data) => {
    const source = data.plan;
    const roles = source.roles;
    const offer = source.oferta_comercial ?? {};
    const limit = (value, fallback, max) => {
      const parsed = value == null || value === '' ? fallback : Number(value);
      return Math.min(max, Math.max(0, Number.isFinite(parsed) ? Math.round(parsed) : fallback));
    };
    const initialMargin = limit(offer.margen_pct, 20, 35);
    const initialMonths = limit(offer.meses_soporte, 12, 12);
    const labor = roles.reduce((sum, r) => sum + r.costo, 0);
    const provisions = source.costo_directo - labor;
    const contingency = source.linea_base - source.costo_directo;
    const reserve = source.tope - source.linea_base;
    const contingencyRate = contingency / source.costo_directo;
    const reserveRate = reserve / source.costo_directo;
    const composition = [
      { id:'labor', label:'Trabajo del equipo', total:labor },
      { id:'fixed', label:'Provisiones', total:provisions },
      { id:'cont', label:'Contingencia', total:contingency },
      { id:'reserve', label:'Reserva de gestión', total:reserve },
    ];
    const percentage = x => `${num(x * 100,0)}%`;

    el.innerHTML = `
      <header class="section-head">
        <p class="eyebrow">Presupuesto y propuesta comercial</p><h1>Costos y precio del piloto</h1>
        <p class="lead">Revisa qué cuesta ejecutar el piloto y qué precio resultaría al aplicar un margen bruto al precio de venta. Los montos son referenciales, en pesos chilenos netos.</p>
      </header>
      <section class="panel gm-panel gm-cost-overview" aria-labelledby="gm-cost-title">
        <header class="panel-head"><p class="eyebrow">Costo interno estimado</p><h2 id="gm-cost-title">Costos del piloto</h2><p class="muted">El tope cubre ejecución y reservas. El soporte se considera por separado.</p></header>
        <dl class="gm-metrics gm-cost-figures" aria-label="Costos internos">
          ${metric('Costo directo', money(source.costo_directo), 'Equipo, infraestructura y talleres')}
          ${metric('Línea base de costo', money(source.linea_base), 'Costo directo más contingencia')}
          ${metric('Costo máximo del piloto', money(source.tope), 'Incluye reserva de gestión')}
          ${metric('Costo mensual de soporte', money(source.opex_mensual), 'Operación después de la recepción')}
        </dl>
      </section>
      <section class="panel gm-panel gm-commercial" aria-labelledby="gm-commercial-title">
        <header class="panel-head"><p class="eyebrow">Precio de venta</p><h2 id="gm-commercial-title">Propuesta comercial referencial</h2><p class="muted">Simula el precio del piloto y los meses de soporte que se incluirían. La estimación está sujeta a revisión y aprobación.</p></header>
        <div class="gm-commercial-grid">
          <div class="gm-commercial-settings">
            <label class="gm-price-setting" for="gm-margin-range">Margen bruto sobre precio <output id="gm-margin-value" for="gm-margin-range">${num(initialMargin,0)}%</output></label>
            <input id="gm-margin-range" type="range" min="0" max="35" value="${initialMargin}" step="1" aria-describedby="gm-margin-help">
            <div class="gm-range-scale" aria-hidden="true"><span>0%</span><span>35%</span></div>
            <p id="gm-margin-help" class="gm-price-formula">Precio = costo ÷ (1 − margen). Cada precio se redondea al peso siguiente si corresponde.</p>
            <div class="gm-field gm-support-field"><label for="gm-support-months">Meses de soporte opcional</label><select id="gm-support-months">${Array.from({length:13}, (_, n) => `<option value="${n}"${n === initialMonths ? ' selected' : ''}>${n ? `${n} ${n === 1 ? 'mes' : 'meses'}` : '0 · Sin soporte'}</option>`).join('')}</select></div>
            <p class="gm-commercial-terms">El soporte comienza tras la recepción del piloto y termina al completar el plazo contratado, sin renovación automática.</p>
          </div>
          <div class="gm-price-sheet" aria-live="polite" aria-atomic="true">
            <p class="eyebrow">Precio total simulado</p><strong class="gm-price-total" id="gm-price-total"></strong><p class="gm-price-term" id="gm-price-term"></p>
            <dl class="gm-price-breakdown">
              <div><dt>Precio del piloto</dt><dd id="gm-price-pilot"></dd></div>
              <div><dt>Tarifa mensual de soporte</dt><dd id="gm-price-monthly"></dd></div>
              <div><dt>Subtotal de soporte</dt><dd id="gm-price-support"></dd></div>
              <div><dt>Costo del escenario</dt><dd id="gm-price-cost"></dd></div>
              <div class="gm-price-profit-row"><dt>Utilidad bruta estimada</dt><dd id="gm-price-profit"></dd></div>
            </dl>
          </div>
        </div>
        <p class="gm-source">La propuesta usa el costo base del piloto con todas las reservas como costo conservador y el costo mensual base de soporte. El simulador de tarifas de la sección de costos se consulta por separado. Montos netos, sin IVA.</p>
      </section>
      <section class="panel gm-panel" aria-labelledby="gm-budget-title">
        <header class="panel-head"><h2 id="gm-budget-title">De las horas al financiamiento</h2><p class="muted">La tarifa de cada rol se multiplica por su dedicación. Infraestructura, respaldo y talleres tienen provisiones propias.</p></header>
        <div class="gm-budget-stack" aria-hidden="true">${composition.map(x => `<span class="gm-budget-${x.id}" style="width:${100 * x.total / source.tope}%"></span>`).join('')}</div>
        <ul class="gm-budget-key" aria-label="Composición del tope propuesto">${composition.map(x => `<li><i class="gm-key gm-budget-${x.id}" aria-hidden="true"></i><span>${esc(x.label)}</span><strong>${esc(money(x.total))}</strong></li>`).join('')}</ul>
        <div class="table-wrap gm-table-wrap"><table class="gm-table">
          <caption class="gm-sr-only">Costo de trabajo por rol</caption><thead><tr><th scope="col">Rol / integrante</th><th scope="col" class="gm-number">Dedicación</th><th scope="col" class="gm-number">Tarifa estimada</th><th scope="col" class="gm-number">Subtotal</th></tr></thead>
          <tbody>${roles.map(r => `<tr><th scope="row">${roleTag(r.id)} ${esc(r.rol)}<small>${esc(r.persona)}</small></th><td class="gm-number">${num(r.horas,0)} h</td><td class="gm-number">${esc(money(r.tarifa))}/h</td><td class="gm-number">${esc(money(r.costo))}</td></tr>`).join('')}</tbody>
          <tfoot><tr><th scope="row">Trabajo del equipo</th><td class="gm-number">${num(source.horas,0)} h</td><td></td><td class="gm-number">${esc(money(labor))}</td></tr></tfoot>
        </table></div>
        <dl class="gm-budget-notes">${source.presupuesto.slice(roles.length,roles.length+2).map(item => `<div><dt>${esc(item.concepto)} <span>${esc(money(item.monto))}</span></dt><dd>${esc(item.base)}. ${esc(item.tipo)}.</dd></div>`).join('')}
          <div><dt>Contingencia <span>${percentage(contingencyRate)}</span></dt><dd>Riesgos identificados, como reproceso o demoras de acceso. Forma parte de la línea base.</dd></div>
          <div><dt>Reserva de gestión <span>${percentage(reserveRate)}</span></dt><dd>Se calcula sobre el costo directo. Su liberación requiere autorización del patrocinador.</dd></div>
        </dl>
        <p class="gm-source">Fuente · Presupuesto y equipo del plan maestro. Tarifas y provisiones son supuestos de planificación pendientes de cotización.</p>
      </section>
      <section class="panel gm-panel gm-scenario" aria-labelledby="gm-scenario-title">
        <header class="panel-head"><p class="eyebrow">Simulador de costo interno</p><h2 id="gm-scenario-title">Qué cambia si varían las tarifas</h2><p class="muted">Ajusta el costo de mano de obra entre −20% y +20%. Las horas y provisiones permanecen fijas. Contingencia y reserva se recalculan. El precio referencial conserva los costos base.</p></header>
        <div class="gm-scenario-grid">
          <div class="gm-scenario-input">
            <label for="gm-labor-range">Variación de mano de obra <output for="gm-labor-range" class="gm-range-output">0%</output></label>
            <input id="gm-labor-range" type="range" min="-20" max="20" value="0" step="1">
            <div class="gm-range-scale" aria-hidden="true"><span>−20%</span><span>Base</span><span>+20%</span></div>
            <div class="gm-presets" aria-label="Escenarios rápidos"><button type="button" data-gm-delta="-10">−10%</button><button type="button" data-gm-delta="0">Base</button><button type="button" data-gm-delta="10">+10%</button></div>
          </div>
          <div class="gm-scenario-result" data-gm-scenario aria-live="polite" aria-atomic="true"></div>
        </div>
      </section>
      <section class="panel gm-panel" aria-labelledby="gm-opex-title">
        <header class="panel-head"><h2 id="gm-opex-title">Continuidad después del piloto</h2><p class="muted">Si el cliente decide mantener la operación, el plan contempla soporte, almacenamiento y respaldo. El escenario base suma inversión máxima y doce meses de operación.</p></header>
        <dl class="gm-metrics gm-metrics-compact" aria-label="Costos de continuidad">
          ${metric('Operación mensual estimada', money(source.opex_mensual), 'Soporte, almacenamiento y respaldo')}
          ${metric('Piloto + 12 meses de operación', money(source.tco_12_meses), 'Escenario de referencia, neto')}
        </dl>
        <p class="gm-source">La evaluación comercial requiere datos reales de margen, compras y costos promocionales. El costo de continuidad sirve como referencia para evaluar si una futura ampliación se paga.</p>
      </section>`;

    const range = el.querySelector('#gm-labor-range');
    const output = el.querySelector('.gm-range-output');
    const scenario = el.querySelector('[data-gm-scenario]');
    const presets = [...el.querySelectorAll('[data-gm-delta]')];
    const signed = (value, format) => `${value < 0 ? '−' : value > 0 ? '+' : ''}${format(Math.abs(value))}`;
    const margin = el.querySelector('#gm-margin-range');
    const term = el.querySelector('#gm-support-months');
    const marginOutput = el.querySelector('#gm-margin-value');
    const amounts = Object.fromEntries(['total', 'term', 'pilot', 'monthly', 'support', 'cost', 'profit'].map(key => [key, el.querySelector(`#gm-price-${key}`)]));

    function showPrice() {
      const pct = Number(margin.value);
      const months = Number(term.value);
      const priceAtMargin = cost => Math.ceil(cost * 100 / (100 - pct));
      const pilotPrice = priceAtMargin(source.tope);
      const monthlyPrice = priceAtMargin(source.opex_mensual);
      const total = pilotPrice + monthlyPrice * months;
      const totalCost = source.tope + source.opex_mensual * months;
      marginOutput.value = `${num(pct,0)}%`;
      margin.setAttribute('aria-valuetext', marginOutput.value);
      amounts.total.textContent = money(total);
      amounts.term.textContent = months ? `Piloto + ${num(months,0)} ${months === 1 ? 'mes' : 'meses'} de soporte` : 'Piloto, sin soporte contratado';
      amounts.pilot.textContent = money(pilotPrice);
      amounts.monthly.textContent = `${money(monthlyPrice)}/mes`;
      amounts.support.textContent = months ? money(monthlyPrice * months) : 'No incluido';
      amounts.cost.textContent = money(totalCost);
      amounts.profit.textContent = money(total - totalCost);
    }

    function showScenario() {
      const delta = Number(range.value);
      const adjustedLabor = Math.round(labor * (1 + delta / 100));
      const direct = adjustedLabor + provisions;
      const adjustedContingency = Math.round(direct * contingencyRate);
      const adjustedReserve = Math.round(direct * reserveRate);
      const adjustedTotal = direct + adjustedContingency + adjustedReserve;
      const change = adjustedTotal - source.tope;
      output.value = signed(delta, v => `${num(v,0)}%`);
      range.setAttribute('aria-valuetext', output.value);
      presets.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.gmDelta) === delta)));
      scenario.innerHTML = `<p class="eyebrow">Tope simulado</p><strong class="gm-scenario-total">${esc(money(adjustedTotal))}</strong><p class="gm-scenario-difference">${change ? `${esc(signed(change, money))} frente al tope propuesto` : 'Coincide con el escenario base'}</p>
        <dl><div><dt>Trabajo del equipo</dt><dd>${esc(money(adjustedLabor))}</dd></div><div><dt>Provisiones fijas</dt><dd>${esc(money(provisions))}</dd></div><div><dt>Contingencia</dt><dd>${esc(money(adjustedContingency))}</dd></div><div><dt>Reserva de gestión</dt><dd>${esc(money(adjustedReserve))}</dd></div></dl>`;
    }

    range.addEventListener('input', showScenario);
    presets.forEach(button => button.addEventListener('click', () => {
      range.value = button.dataset.gmDelta;
      showScenario();
    }));
    margin.addEventListener('input', showPrice);
    term.addEventListener('change', showPrice);
    showPrice();
    showScenario();
  };
})();
