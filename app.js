(() => {
  'use strict';
  const data = window.CASO3;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const num = (value, dec=0) => new Intl.NumberFormat('es-CL',{minimumFractionDigits:dec,maximumFractionDigits:dec}).format(value);
  const money = value => new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(value);
  const render = {};
  window.Piloto = { render, esc, num, money };

  const profiles = {
    1:{name:'Ingreso menor, puntaje alto',offer:'Fidelización de bajo costo',idea:'Probar un beneficio sencillo por recurrencia si existen compras previas.'},
    2:{name:'Ingreso menor, puntaje bajo',offer:'Incentivo de compra acotado',idea:'Testear un beneficio con límite de costo y medir margen por cliente elegible.'},
    3:{name:'Ingreso y puntaje intermedios',offer:'Beneficio por frecuencia',idea:'Medir si un beneficio escalonado cambia la frecuencia de compra.'},
    4:{name:'Ingreso alto, puntaje alto',offer:'Beneficio por recurrencia',idea:'Probar una oferta de fidelización en clientes con compras previas observadas.'},
    5:{name:'Ingreso alto, puntaje bajo',offer:'Reactivación acotada',idea:'Considerar esta oferta únicamente si el historial confirma inactividad.'}
  };
  const stages = [
    {view:'resumen', label:'Decisión del cliente', cue:'Pregunta si el cliente ofrecería lo mismo a dos perfiles con ingresos parecidos.'},
    {view:'segmentos', label:'G4 frente a G5', cue:'Muestra la diferencia de 66 puntos y las dos hipótesis de oferta.'},
    {view:'evidencia-gasto', label:'Qué dice el análisis por género', cue:'Señala el cero en el intervalo. La muestra no da evidencia suficiente para usar género como criterio de oferta.'},
    {view:'pruebas', label:'Evidencia técnica', cue:'Selecciona el caso estimado y explica por qué va a revisión humana.'},
    {view:'plan', label:'Por qué 30 días', cue:'Muestra 112 h de integración y las pruebas de usuario desde D19.'},
    {view:'inversion', label:'Costo y precio por separado', cue:'Explica el costo del piloto, el margen sobre la venta y el soporte opcional después de recibir el sistema.'},
    {view:'control', label:'Cierre y aprobación', cue:'Termina pidiendo patrocinador, acceso autorizado y aprobación del tope.'}
  ];
  const state = { a:4, b:5, demo:false };
  const $ = id => document.getElementById(id);
  let observer, scene3d;

  function head(kicker,title,description){
    return `<header class="section-head"><p class="eyebrow">${esc(kicker)}</p><h1>${esc(title)}</h1><p class="lead">${esc(description)}</p></header>`;
  }
  function path(uri,label){ return `<a href="${esc(uri)}" target="_blank" rel="noopener">${esc(label)} ↗</a>`; }
  const groupColor = {1:'#ad97ff',2:'#ffc681',3:'#6e9fff',4:'#39e0ff',5:'#ef79e0'};
  const withSign = (value, digits=2) => (value<0?'−':value>0?'+':'') + num(Math.abs(value),digits);

  function plotCentres(canvas, points, onSelect){
    let selected=4, locations=[];
    function draw(){
      const w=canvas.clientWidth,h=canvas.clientHeight;
      if(!w||!h)return;
      const px=Math.min(devicePixelRatio||1,2);
      canvas.width=w*px; canvas.height=h*px;
      const ctx=canvas.getContext('2d');
      ctx.scale(px,px);
      const l=34,r=w-36,t=13,b=h-36;
      const x=v=>l+(v-10)/100*(r-l),y=v=>b-v/100*(b-t);
      ctx.font='12px Segoe UI, sans-serif';ctx.fillStyle='#acbdd3';
      ctx.textAlign='right';ctx.textBaseline='middle';
      for(const k of [0,25,50,75,100]){
        ctx.strokeStyle='#364657';ctx.beginPath();ctx.moveTo(l,y(k));ctx.lineTo(r,y(k));ctx.stroke();
        ctx.fillText(k,l-7,y(k));
      }
      ctx.textAlign='center';
      for(const k of [20,40,60,80,100])ctx.fillText(k,x(k),b+13);
      ctx.fillText('Ingreso anual del perfil (miles de USD)',(l+r)/2,h-6);
      const p4=points.find(p=>p.grupo===4),p5=points.find(p=>p.grupo===5);
      ctx.strokeStyle='#9e83f5';ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(x(p4.ingreso),y(p4.puntaje));ctx.lineTo(x(p5.ingreso),y(p5.puntaje));ctx.stroke();ctx.setLineDash([]);
      locations=[];
      for(const p of points){
        const active=p.grupo===selected,cx=x(p.ingreso),cy=y(p.puntaje),color=groupColor[p.grupo];
        locations.push({grupo:p.grupo,cx,cy});
        if(active){ctx.beginPath();ctx.arc(cx,cy,14,0,Math.PI*2);ctx.fillStyle=color+'23';ctx.fill();}
        ctx.beginPath();ctx.arc(cx,cy,active?8:6,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
        ctx.strokeStyle='#171f2c';ctx.lineWidth=2;ctx.stroke();ctx.lineWidth=1;
        ctx.textAlign='left';ctx.font='bold 12px Segoe UI, sans-serif';ctx.fillStyle=color;
        ctx.fillText('G'+p.grupo,cx+12,cy);
      }
    }
    observer = new ResizeObserver(draw);
    observer.observe(canvas);
    draw();
    const near = e => {
      const pos=canvas.getBoundingClientRect();
      return locations.find(p=>Math.hypot(p.cx+pos.left-e.clientX,p.cy+pos.top-e.clientY)<22);
    };
    canvas.onpointermove=e=>{canvas.style.cursor=near(e)?'pointer':'default';};
    canvas.onclick=e=>{const hit=near(e);if(hit)onSelect(hit.grupo);};
    return id=>{selected=id;draw();};
  }

  render.resumen = (el,{resultados:r,plan}) => {
    const g4=r.perfiles.find(p=>p.grupo===4),g5=r.perfiles.find(p=>p.grupo===5);
    const difference=num(Math.abs(g4.puntaje-g5.puntaje));
    const females=r.genero.find(g=>g.genero==='F');
    const males=r.genero.find(g=>g.genero==='M');
    const diferenciaGenero=females.media-males.media;
    let accumulated=0;
    const maxGroup=Math.max(...r.perfiles.map(p=>p.clientes));
    const donut=r.perfiles.map(p=>{
      const start=accumulated;
      accumulated+=100*p.clientes/r.filas;
      return `${groupColor[p.grupo]} ${start}% ${accumulated}%`;
    }).join(',');
    el.innerHTML = `
      <header class="case-intro"><div><p class="eyebrow">CASO 03 · PROPUESTA PARA GERENCIA COMERCIAL</p><h1>¿Probarías la misma oferta?</h1><p class="lead">Con ingresos parecidos, G4 y G5 se separan por ${difference} puntos en el puntaje de gasto.</p></div><div class="case-source" aria-label="Alcance de la muestra"><b>${num(r.filas)} registros</b><span>${num(r.k)} perfiles · piloto académico</span></div></header>
      <section class="overview-grid">
        <figure class="plot">
          <div class="plot-head"><h2>Mapa de perfiles</h2><span class="plot-live" id="map-state">Órbita 3D</span></div>
          <div class="stage-toolbar" role="group" aria-label="Controles del mapa">
            <button type="button" data-map-mode="3d" aria-pressed="true">3D</button><button type="button" data-map-mode="2d" aria-pressed="false">2D</button>
            <button type="button" id="focus-pair" aria-pressed="false">Enfocar G4 y G5</button><button type="button" id="toggle-motion" aria-pressed="false">Pausar giro</button>
          </div>
          <div class="plot-stage" data-mode="3d">
            <span class="stage-orbit" aria-hidden="true"></span>
            <canvas id="constellation" class="constellation" tabindex="0" role="img" aria-label="Mapa en tres dimensiones. Las flechas giran la vista; los botones G1 a G5 dan los valores exactos." aria-describedby="map-instructions"></canvas>
            <canvas id="centres" hidden role="img" aria-label="Cinco centros por ingreso anual y puntaje de gasto. Usa los botones de grupo para explorar."></canvas>
          </div>
          <p class="stage-instructions" id="map-instructions">Arrastra para girar. La altura es el puntaje; la base cruza ingresos y cantidad de registros.</p>
          <div class="plot-choices" role="group" aria-label="Elegir un grupo en el mapa">${r.perfiles.map(p=>`<button type="button" data-plot-group="${p.grupo}" style="--group:${groupColor[p.grupo]}" aria-pressed="${p.grupo===4}">G${p.grupo}</button>`).join('')}</div>
          <figcaption class="plot-readout" id="plot-readout" aria-live="polite"></figcaption>
        </figure>
        <article class="decision-panel">
          <header class="panel-head"><p class="eyebrow">DÓNDE CAMBIA LA OFERTA</p><h2>G5 frente a G4</h2><p>Sus ingresos anuales típicos difieren en solo <b>US$ ${num(Math.abs(g4.ingreso-g5.ingreso),1)} mil</b>.</p></header>
          <div class="score-gap" style="--start:${(g5.puntaje-1)/.99}%;--end:${(g4.puntaje-1)/.99}%">
            <div class="score-gap-title"><strong>${difference} puntos</strong><span>de diferencia en el puntaje de gasto</span></div>
            <div class="score-line" aria-label="Puntaje de gasto de 1 a 100">
              <i class="score-span" aria-hidden="true"></i><span class="score-tick" aria-hidden="true">1</span><span class="score-tick" aria-hidden="true">100</span>
              <button type="button" data-score-group="5" style="--anchor:var(--start);--group:${groupColor[5]}" aria-label="Ver G5, ${num(g5.puntaje)} puntos"><span>G5</span><b>${num(g5.puntaje)}</b></button>
              <button type="button" data-score-group="4" style="--anchor:var(--end);--group:${groupColor[4]}" aria-label="Ver G4, ${num(g4.puntaje)} puntos"><span>G4</span><b>${num(g4.puntaje)}</b></button>
            </div>
          </div>
          <div class="offer-pair">
            <div><span class="offer-dot" style="--group:${groupColor[4]}"></span><b>G4 · ${num(g4.clientes)} registros</b><p>Probar un beneficio por recurrencia.</p></div>
            <div><span class="offer-dot" style="--group:${groupColor[5]}"></span><b>G5 · ${num(g5.clientes)} registros</b><p>Probar reactivación si se confirma inactividad.</p></div>
          </div>
          <div class="decision-actions"><a class="button button-lime" href="#segmentos" id="hero-compare">Comparar G4 y G5 <span aria-hidden="true">↗</span></a><a class="button button-outline" href="#campana" id="hero-campana">Probar una oferta</a></div>
        </article>
      </section>
      <section class="decision-trail" aria-label="Evidencia para decidir">
        <a href="#evidencia-gasto" class="trail-gasto"><div><span>¿Mujeres y hombres tienen distinto puntaje?</span><strong>${withSign(diferenciaGenero)} puntos</strong><small>El intervalo de confianza del 95% incluye cero.</small></div><span aria-hidden="true">↗</span></a>
        <a href="#campana" class="trail-campana"><div><span>¿La oferta paga sus costos?</span><strong>Margen frente a control</strong><small>Prueba compras, incentivo y contacto con un caso ilustrativo.</small></div><span aria-hidden="true">↗</span></a>
        <a href="#inversion" class="trail-plan"><div><span>¿Qué tendría que pagar el cliente?</span><strong>$${num(plan.oferta_comercial.precio_piloto/1e6,2)} M netos</strong><small>Precio referencial del piloto de ${num(plan.control_capacidad.dias_habiles)} días hábiles.</small></div><span aria-hidden="true">↗</span></a>
      </section>
      <div class="next-grid">
        <section class="panel"><div class="panel-head"><h2>Distribución de la muestra</h2><p class="muted">Registros asignados a cada perfil.</p></div>
          <div class="distribution"><div class="donut" style="--segments:conic-gradient(${donut})" aria-hidden="true"><span><strong>${num(r.filas)}</strong>registros</span></div>
          <ul class="distribution-list">${r.perfiles.map(p=>`<li><button type="button" data-dist-group="${p.grupo}" aria-label="Explorar G${p.grupo}, ${p.clientes} registros" style="--group:${groupColor[p.grupo]};--share:${p.clientes/maxGroup*100}%"><span>G${p.grupo}</span><i aria-hidden="true"></i><strong>${num(p.clientes)}</strong></button></li>`).join('')}</ul></div>
        </section>
        <section class="panel"><div class="panel-head"><p class="eyebrow">DECISIÓN SOLICITADA</p><h2>Autorizar un piloto en sombra</h2></div><p class="muted">Acordar alcance y presupuesto, designar responsables y validar el acceso antes de iniciar. Las ofertas propuestas son hipótesis.</p><ol class="story-list"><li>Aceptar fuente y parámetros de calidad.</li><li>Validar cinco lotes sin enviar ofertas.</li><li>Medir margen frente a un grupo de control en la fase comercial.</li></ol></section>
      </div>`;
    const focusPlot=plotCentres(el.querySelector('#centres'),r.perfiles,update);
    const motion=el.querySelector('#toggle-motion');
    const pairButton=el.querySelector('#focus-pair');
    let focusedPair=false;
    scene3d=window.MapaPerfiles3D.mount(el.querySelector('#constellation'),r.perfiles,groupColor,update,(playing,reduced)=>{
      motion.textContent=reduced?'Movimiento reducido':playing?'Pausar giro':'Reanudar giro';
      motion.disabled=reduced;
      motion.setAttribute('aria-pressed',String(!playing));
    });
    function setMode(mode){
      const in3d=mode==='3d';
      el.querySelector('.plot-stage').dataset.mode=mode;
      el.querySelector('#constellation').hidden=!in3d;
      el.querySelector('#centres').hidden=in3d;
      motion.hidden=!in3d;
      el.querySelectorAll('[data-map-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapMode===mode)));
      el.querySelector('#map-state').textContent=in3d?'Órbita 3D':'Vista 2D';
      el.querySelector('#map-instructions').textContent=in3d?'Arrastra para girar. La altura es el puntaje; la base cruza ingresos y cantidad de registros.':'Compara ingreso anual (horizontal) y puntaje de gasto (vertical, 1–100).';
      scene3d.activate(in3d);
      if(!in3d)setFocus(false);
    }
    function setFocus(on){
      focusedPair=on;
      pairButton.setAttribute('aria-pressed',String(on));
      pairButton.textContent=on?'Ver los cinco perfiles':'Enfocar G4 y G5';
      scene3d.focusPair(on);
    }
    motion.onclick=()=>scene3d.toggleMotion();
    pairButton.onclick=()=>{
      const next=!focusedPair;
      setMode('3d');
      setFocus(next);
      if(next)update(4);
    };
    el.querySelectorAll('[data-map-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mapMode));
    function update(id){
      const p=r.perfiles.find(p=>p.grupo===id);
      el.querySelectorAll('[data-plot-group]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.plotGroup)===id)));
      el.querySelector('#plot-readout').innerHTML=`<div><b>G${id} · ${esc(profiles[id].name)}</b><p>${num(p.clientes)} registros · US$ ${num(p.ingreso,1)} mil de ingreso anual · ${num(p.puntaje,1)} puntos</p></div><a class="plot-open" href="#segmentos">Comparar <span aria-hidden="true">↗</span></a>`;
      el.querySelector('.plot-open').onclick=()=>{state.a=id;state.b=id===5?4:5;};
      if(focusedPair&&id!==4&&id!==5)setFocus(false);
      focusPlot(id);
      scene3d.select(id);
    }
    el.querySelectorAll('[data-plot-group]').forEach(b=>b.onclick=()=>update(Number(b.dataset.plotGroup)));
    el.querySelectorAll('[data-score-group]').forEach(b=>b.onclick=()=>update(Number(b.dataset.scoreGroup)));
    el.querySelectorAll('[data-dist-group]').forEach(b=>b.onclick=()=>{
      const id=Number(b.dataset.distGroup);
      state.a=id;state.b=id===5?4:5;
      location.hash='segmentos';
    });
    el.querySelector('#hero-compare').onclick=()=>{state.a=4;state.b=5;};
    el.querySelector('#hero-campana').onclick=()=>{window.Piloto.campaignGroup=5;};
    setMode('3d');
    update(4);
  };

  function card(p,variant,total){
    const info=profiles[p.grupo];
    return `<article class="cohort" data-variant="${variant}"><span class="badge ${variant==='b'?'badge-purple':''}">G${p.grupo} · ${num(p.clientes/total*100,1)}% de la muestra</span><h3>${esc(info.name)}</h3>
      <div class="cohort-stats"><div><b>${num(p.clientes)}</b><span>registros</span></div><div><b>${num(p.ingreso,1)}</b><span>ingreso centro (k$)</span></div><div><b>${num(p.puntaje,1)}</b><span>puntaje centro</span></div></div>
      <div class="meter" aria-label="Puntaje ${num(p.puntaje,1)} de 100" role="img"><span style="width:${p.puntaje}%"></span></div>
      <div class="offer"><b>${esc(info.offer)}</b><p class="muted">${esc(info.idea)}</p></div></article>`;
  }
  render.segmentos = (el,{resultados:r}) => {
    const option = v => r.perfiles.map(p=>`<option value="${p.grupo}"${v===p.grupo?' selected':''}>G${p.grupo} · ${esc(profiles[p.grupo].name)}</option>`).join('');
    el.innerHTML=head('VALOR COMERCIAL','Compara los perfiles','Elige dos grupos y revisa cómo cambiaría la oferta. Los ingresos y puntajes se refieren a sus centros.')+`
      <section class="panel compare-shell"><div class="filters">
        <label for="compare-a">Segmento A <select id="compare-a">${option(state.a)}</select></label>
        <label for="compare-b">Segmento B <select id="compare-b">${option(state.b)}</select></label>
        <button type="button" class="button button-outline" id="swap-pair" aria-label="Intercambiar segmento A y B">⇄ Intercambiar</button>
        <button type="button" class="button button-quiet" id="pair-reset">Ver G4 y G5</button>
      </div><div id="pair-data" aria-live="polite"></div></section>
      <section class="panel"><div class="panel-head"><h2>Los cinco segmentos</h2><p class="muted">Los conteos incluyen entrenamiento y prueba. El puntaje es un indicador de la fuente en escala 1–100.</p></div><div class="table-wrap"><table><thead><tr><th scope="col">Grupo</th><th scope="col">Registros</th><th scope="col">Ingreso (k$)</th><th scope="col">Puntaje</th><th scope="col">Hipótesis de oferta</th><th scope="col">Explorar</th></tr></thead><tbody>${r.perfiles.map(p=>`<tr><td>G${p.grupo} · ${esc(profiles[p.grupo].name)}</td><td>${num(p.clientes)}</td><td>${num(p.ingreso,1)}</td><td>${num(p.puntaje,1)}</td><td>${esc(profiles[p.grupo].offer)}</td><td><button type="button" class="button button-quiet" data-compare="${p.grupo}">Ver en A</button></td></tr>`).join('')}</tbody></table></div></section>
      <section class="callout"><div class="panel-head"><h2>¿Suben las compras o también el margen?</h2></div><p>Con historial autorizado, asignar al azar a oferta o control y medir margen neto por elegible. La ficha permite ensayar una decisión con cifras ilustrativas.</p><div class="decision-actions spacer"><a class="button" href="#campana" id="compare-campana">Abrir ficha para el segmento B ↗</a></div></section>`;
    const a=el.querySelector('#compare-a'),b=el.querySelector('#compare-b');
    el.querySelector('#compare-campana').onclick=()=>{window.Piloto.campaignGroup=Number(b.value);};
    function compare(){
      state.a=Number(a.value); state.b=Number(b.value);
      const pa=r.perfiles.find(p=>p.grupo===state.a),pb=r.perfiles.find(p=>p.grupo===state.b);
      const gap=state.a===state.b?'Selecciona dos grupos distintos para ver la brecha.':`Brecha de <strong>${num(Math.abs(pa.puntaje-pb.puntaje),1)} puntos</strong> en el puntaje de gasto y <strong>${num(Math.abs(pa.ingreso-pb.ingreso),1)} k$</strong> de ingreso entre centros.`;
      el.querySelector('#pair-data').innerHTML=`<div class="compare-pair">${card(pa,'a',r.filas)}${card(pb,'b',r.filas)}</div><p class="compare-summary">${gap}</p>`;
    }
    a.onchange=b.onchange=compare;
    el.querySelector('#swap-pair').onclick=()=>{[a.value,b.value]=[b.value,a.value];compare();};
    el.querySelector('#pair-reset').onclick=()=>{a.value='4';b.value='5';compare();};
    el.querySelectorAll('[data-compare]').forEach(btn=>btn.onclick=()=>{ a.value=btn.dataset.compare;compare();a.focus(); });
    compare();
  };

  render.control = (el,{riesgos,desviaciones,tarjetas}) => {
    el.innerHTML=head('SEGUIMIENTO DEL PILOTO','Riesgos, decisiones y control','El cierre académico registra pruebas ejecutadas. El piloto comercial comienza cuando se aprueban alcance, datos y presupuesto.')+`
      <section class="callout"><div class="panel-head"><h2>Estado del proyecto</h2></div><p>Revisa los entregables académicos documentados en el registro académico, las correcciones comprobadas y la condición de inicio del piloto.</p><p>${path('gestion/Estado_Caso03.html','Ver estado y resultados')}</p></section>
      <section class="panel"><div class="panel-head"><h2>Acciones correctivas</h2></div><div class="status-list">${['A04','A06','H0'].map(id=>{const t=tarjetas.find(c=>c.id===id);return `<a href="${t.evidencia?''+esc(t.evidencia):'gestion/Estado_Caso03.html'}"><span class="badge ${id==='H0'?'badge-warn':''}">${esc(id)} · ${id==='H0'?'Pendiente':'Ver respaldo'}</span><p><b>${esc(t.titulo)}</b></p></a>`;}).join('')}</div>
        <div class="table-wrap"><table><thead><tr><th scope="col">Control</th><th scope="col">Hallazgo</th><th scope="col">Impacto</th><th scope="col">Acción</th></tr></thead><tbody>${desviaciones.filter(d=>['D2','D4','D6'].includes(d.id)).map(d=>`<tr><td><b>${esc(d.id)}</b></td><td>${esc(d.hallazgo)}</td><td>${esc(d.impacto)}</td><td>${esc(d.accion)}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="panel"><div class="panel-head"><h2>Registro priorizado de riesgos</h2><p class="muted">Exposición = probabilidad × impacto. Las puntuaciones son de planificación.</p></div><div class="filters"><label for="risk-filter">Exposición <select id="risk-filter"><option value="all">Todas</option><option value="high">Alta (15–25)</option><option value="other">Hasta 14</option></select></label></div><div id="risk-table" class="table-wrap spacer" aria-live="polite"></div></section>
      <div class="grid-two"><section class="callout"><div class="panel-head"><h2>Control semanal</h2></div><p>Comparar hitos, horas y costo contra el plan. Escalar 2 o más días de atraso crítico o necesidad de reserva. El patrocinador decide los cambios.</p><p>${path('gestion/Tablero_local.html','Abrir tablero operativo con historial')}</p></section>
      <section class="panel"><div class="panel-head"><h2>Aceptación del cliente</h2></div><p>100% de filas con ruta registrada, permisos probados, cinco lotes en sombra y cero defectos críticos abiertos.</p><p>${path('gestion/bitacora_verificacion.csv','Ver bitácora del cierre académico')}</p></section></div>`;
    const filter=el.querySelector('#risk-filter');
    function risks(){
      const shown=riesgos.filter(r=>filter.value==='all'||(filter.value==='high'?r.exposicion>=15:r.exposicion<15)).sort((a,b)=>b.exposicion-a.exposicion);
      el.querySelector('#risk-table').innerHTML=`<table><thead><tr><th scope="col">Riesgo</th><th scope="col">Responsable</th><th scope="col">Exposición</th><th scope="col">Respuesta propuesta</th></tr></thead><tbody>${shown.map(r=>`<tr><td><b>${esc(r.id)}</b> · ${esc(r.riesgo)}</td><td>${esc(r.dueno)}</td><td><span class="badge risk-score ${r.exposicion>=15?'badge-warn':''}">${r.probabilidad_1a5} × ${r.impacto_1a5} = ${r.exposicion}</span></td><td>${esc(r.respuesta)}<br><small class="muted">${esc(r.condicion)}</small></td></tr>`).join('')}</tbody></table>`;
    }
    filter.onchange=risks; risks();
  };

  render.evidencias = el => {
    const anchors=[['Presentación EP6','Ocho diapositivas con notas para la defensa.','entregables/Presentacion_EP6_Cliente.pptx'],['Informe EP5','Ocho páginas con decisión, modelo, EDT y control.','entregables/Informe_EP5_Piloto_Cliente.pdf'],['Notebook del piloto','Resultados y análisis reproducible.','evidencias/Piloto_Caso3.ipynb'],['Evidencia A04','Corrección del lote mixto y resultados de pruebas.','evidencias/pruebas.csv'],['Evidencia A06','Horas por actividad, persona y día.','gestion/asignacion_diaria.csv'],['Guía de defensa','Guion, preguntas y roadmap.','entregables/Guia_defensa.md'],['Presupuesto','Horas, tarifas, provisiones y reservas.','gestion/presupuesto.csv'],['Propuesta comercial','Precio referencial, soporte y margen del proveedor.','entregables/Propuesta_comercial.md'],['Tablero operativo','Tarjetas, Gantt e historial de control.','gestion/Tablero_local.html']];
    anchors.unshift(['Estado del proyecto','Plan verificado, resultados y evidencia de esta revisión.','gestion/Estado_Caso03.html'],['Seguimiento en Excel','Plan frente a ejecución y bitácora.','gestion/Seguimiento_Caso03.xlsx'],['Pruebas técnicas','Resultados de la revisión del cierre.','evidencias/pruebas_cierre.csv']);
    el.innerHTML=head('TRAZABILIDAD','Evidencias del proyecto','Abre desde aquí los respaldos técnicos y de gestión. Mantén el paquete de entrega extraído para que funcionen los enlaces.')+`
      <section class="panel"><div class="panel-head"><h2>Archivos del proyecto</h2></div><div class="evidence-grid">${anchors.filter(([, ,uri]) => !/\.(xlsx|pptx|pdf|ipynb|md)$/.test(uri)).map(([name,desc,uri])=>`<a class="evidence-link" href="${esc(uri)}" target="_blank" rel="noopener"><div><b>${esc(name)}</b><small>${esc(desc)}</small></div><span aria-hidden="true">↗</span></a>`).join('')}</div></section>`;
  };

  function refreshDemo(route){
    const bar=$('demo-bar');
    bar.hidden=!state.demo;
    if(!state.demo)return;
    const index=stages.findIndex(s=>s.view===route);
    if(index<0){bar.innerHTML='<span>Modo presentación</span><a class="button button-outline" href="#resumen">Volver al inicio</a>';return;}
    bar.innerHTML=`<div><b>${index+1}/${stages.length} · ${esc(stages[index].label)}</b><span class="demo-cue">${esc(stages[index].cue)}</span></div><div><button class="button button-outline" type="button" id="demo-prev" ${index===0?'disabled':''}>Anterior</button><button class="button" type="button" id="demo-next" ${index===stages.length-1?'disabled':''}>Siguiente</button></div>`;
    $('demo-prev').onclick=()=>moveDemo(-1);
    $('demo-next').onclick=()=>moveDemo(1);
  }
  function moveDemo(diff){
    const at=stages.findIndex(s=>s.view===location.hash.slice(1));
    const dest=stages[at+diff];
    if(dest)location.hash=dest.view;
  }
  function go(initial=false){
    const hash=location.hash.slice(1);
    if(hash==='contenido')return;
    const view=Object.hasOwn(render,hash)?hash:'resumen';
    document.body.dataset.view=view;
    observer?.disconnect();
    scene3d?.destroy();
    scene3d=undefined;
    document.querySelectorAll('[data-route]').forEach(a=>a.dataset.route===view?a.setAttribute('aria-current','page'):a.removeAttribute('aria-current'));
    refreshDemo(view);
    render[view]($('view'),data);
    if(!initial){ window.scrollTo(0,0); $('contenido').focus({preventScroll:true}); }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    if(!data){$('view').textContent='Extrae el paquete completo para abrir el dashboard.';return;}
    window.addEventListener('hashchange',()=>go());
    $('demo').onclick=()=>{
      state.demo=!state.demo;
      document.body.classList.toggle('demo',state.demo);
      $('demo').textContent=state.demo?'Salir de presentación':'Modo presentación ↗';
      if(state.demo && location.hash!=='#resumen')location.hash='resumen';else go(true);
    };
    window.addEventListener('keydown',e=>{
      if(!state.demo||e.target.closest('select,input,textarea,button,a'))return;
      if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();moveDemo(e.key==='ArrowRight'?1:-1);}
    });
    go(true);
  });
})();
