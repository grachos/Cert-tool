import db from './src/db';
import { v4 as uuidv4 } from 'uuid';

const rspoRequirements = [
  // PRINCIPIO 1: Comportarse etica y transparentemente
  { clause: '1.1.1', title: 'Politica de transparencia y divulgacion publica', description: 'La UoC cuenta con una politica de transparencia y divulgacion publica aprobada por la alta direccion.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '1.1.2', title: 'Informacion disponible al publico', description: 'Se mantiene un sitio web o repositorio accesible con informacion actualizada de la UoC.', status: 'COMPLIANT', evidenceCount: 1 },
  { clause: '1.1.3', title: 'Designacion de responsable', description: 'Se designa un responsable de transparencia y divulgacion dentro de la estructura organizacional.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '1.2.1', title: 'Codigo de conducta', description: 'Existe un codigo de conducta que cubre practicas eticas y comerciales.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '1.2.2', title: 'Capacitacion en etica', description: 'Se capacita regularmente al personal sobre el codigo de conducta y etica empresarial.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '1.2.3', title: 'Compromiso de proveedores', description: 'Los proveedores y contratistas firman compromiso de adhesion al codigo de conducta.', status: 'PARTIAL', evidenceCount: 1 },
  { clause: '1.3.1', title: 'Politica anticorrupcion', description: 'Existe una politica de tolerancia cero frente a la corrupcion y el soborno.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '1.3.2', title: 'Denuncia de irregularidades', description: 'Se implementa un canal confidencial para denunciar irregularidades y actos de corrupcion.', status: 'COMPLIANT', evidenceCount: 1 },
  { clause: '1.3.3', title: 'Evaluacion de riesgos de corrupcion', description: 'Se realiza evaluacion periodica de riesgos de corrupcion en las operaciones.', status: 'PARTIAL', evidenceCount: 2 },
  { clause: '1.4.1', title: 'Compromiso de divulgacion activa', description: 'La UoC divulga proactivamente informacion sobre sus operaciones, certificacion y desempeno.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '1.4.2', title: 'Acceso a documentos', description: 'Los documentos clave estan disponibles para partes interesadas previa solicitud.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '1.5.1', title: 'Informe publico anual', description: 'Se elabora y publica un informe de progreso anual con indicadores de desempeno RSPO.', status: 'COMPLIANT', evidenceCount: 1 },
  { clause: '1.5.2', title: 'Contenido minimo del informe', description: 'El informe incluye datos de produccion, cumplimiento, quejas y desempeno social y ambiental.', status: 'PARTIAL', evidenceCount: 1 },
  { clause: '1.6.1', title: 'Sistema de quejas y reclamos', description: 'Se implementa un sistema documentado para recibir, registrar, investigar y resolver quejas.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '1.6.2', title: 'Publicidad del sistema de quejas', description: 'El procedimiento de quejas se comunica a trabajadores, comunidades y partes interesadas.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '1.6.3', title: 'Resolucion de quejas', description: 'Se resuelven las quejas en plazos definidos y se documentan los resultados.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '1.7.1', title: 'Mapa de partes interesadas', description: 'Se identifican y mapean las partes interesadas internas y externas de la UoC.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '1.7.2', title: 'Plan de participacion', description: 'Existe un plan de participacion con partes interesadas que define canales y frecuencia.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '1.7.3', title: 'Documentacion de consultas', description: 'Se documentan y archivan las consultas, reuniones y acuerdos con partes interesadas.', status: 'PARTIAL', evidenceCount: 2 },

  // PRINCIPIO 2
  { clause: '2.1.1', title: 'Identidad legal', description: 'La UoC cuenta con registro legal vigente, licencias y permisos de operacion.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '2.1.2', title: 'Representante legal', description: 'Se designa un representante legal con facultades para actuar en nombre de la UoC.', status: 'COMPLIANT', evidenceCount: 1 },
  { clause: '2.2.1', title: 'Matriz de requisitos legales', description: 'Se mantiene una matriz actualizada de todos los requisitos legales aplicables.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '2.2.2', title: 'Evaluacion de cumplimiento legal', description: 'Se evalua periodicamente el cumplimiento de los requisitos legales identificados.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '2.2.3', title: 'Registro de licencias y permisos', description: 'Se mantiene un registro de todas las licencias, permisos y autorizaciones con sus vigencias.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '2.3.1', title: 'Derechos de uso de la tierra', description: 'Se demuestra el derecho legal a utilizar la tierra mediante documentos oficiales.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '2.3.2', title: 'Mapas de uso del suelo', description: 'Se mantienen mapas actualizados que delimitan el area de operacion de la UoC.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '2.3.3', title: 'Respeto a derechos consuetudinarios', description: 'Se identifican y respetan los derechos consuetudinarios sobre la tierra.', status: 'PARTIAL', evidenceCount: 1 },
  { clause: '2.4.1', title: 'Procedimiento de resolucion de conflictos', description: 'Existe un procedimiento documentado para resolucion de conflictos de tierra.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '2.4.2', title: 'Registro de conflictos', description: 'Se mantiene un registro de todos los conflictos y su estado de resolucion.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '2.4.3', title: 'Mecanismos alternativos', description: 'Se ofrecen mecanismos alternativos de resolucion de conflictos (mediacion, arbitraje).', status: 'PENDING', evidenceCount: 0 },
  { clause: '2.5.1', title: 'Cumplimiento laboral', description: 'Se cumple con la legislacion laboral nacional y los convenios fundamentales de la OIT.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '2.5.2', title: 'Contratos de trabajo', description: 'Todos los trabajadores cuentan con contratos escritos en el idioma que comprenden.', status: 'COMPLIANT', evidenceCount: 6 },
  { clause: '2.6.1', title: 'Sistema de gestion SST', description: 'Se implementa un sistema de gestion de seguridad y salud en el trabajo.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '2.6.2', title: 'Comite de seguridad', description: 'Existe un comite paritario de seguridad y salud ocupacional.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '2.6.3', title: 'Identificacion de peligros', description: 'Se realiza identificacion y evaluacion de peligros y riesgos laborales (HIRARC).', status: 'PARTIAL', evidenceCount: 3 },
  { clause: '2.7.1', title: 'Plan de remediacion', description: 'Existe un plan para remediar impactos adversos causados por las operaciones.', status: 'PARTIAL', evidenceCount: 2 },
  { clause: '2.7.2', title: 'Compensacion por impactos', description: 'Se establecen mecanismos de compensacion justa para comunidades afectadas.', status: 'PENDING', evidenceCount: 0 },

  // PRINCIPIO 3
  { clause: '3.1.1', title: 'Plan de gestion', description: 'Existe un plan de gestion a mediano/largo plazo con objetivos estrategicos.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '3.1.2', title: 'Mejora continua', description: 'Se implementa un sistema de mejora continua basado en el ciclo PHVA.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '3.1.3', title: 'Indicadores de desempeno', description: 'Se definen y monitorean indicadores clave de desempeno (KPI).', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '3.2.1', title: 'Sistema de monitoreo', description: 'Se implementa un sistema de monitoreo de las operaciones agricolas y de proceso.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '3.2.2', title: 'Monitoreo de calidad', description: 'Se monitorean parametros de calidad del aceite y subproductos.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '3.2.3', title: 'Auditorias internas', description: 'Se realizan auditorias internas periodicas del sistema de gestion.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '3.3.1', title: 'Programa de capacitacion', description: 'Existe un programa anual de capacitacion basado en necesidades identificadas.', status: 'COMPLIANT', evidenceCount: 6 },
  { clause: '3.3.2', title: 'Evaluacion de competencias', description: 'Se evalua la competencia del personal en sus funciones asignadas.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '3.3.3', title: 'Desarrollo profesional', description: 'Se ofrecen oportunidades de desarrollo profesional y certificacion de competencias.', status: 'PARTIAL', evidenceCount: 2 },
  { clause: '3.4.1', title: 'Investigacion y desarrollo', description: 'Se realizan actividades de investigacion para mejorar practicas sostenibles.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '3.4.2', title: 'Adopcion de tecnologia', description: 'Se evalua y adopta tecnologia para mejorar eficiencia y reducir impactos.', status: 'PARTIAL', evidenceCount: 1 },
  { clause: '3.5.1', title: 'Plan de viabilidad financiera', description: 'Existe un plan financiero que demuestra la viabilidad economica a largo plazo.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '3.5.2', title: 'Analisis de rentabilidad', description: 'Se realiza analisis periodico de costos, ingresos y rentabilidad.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '3.5.3', title: 'Diversificacion de ingresos', description: 'Se evaluan estrategias de diversificacion para fortalecer la resiliencia economica.', status: 'PENDING', evidenceCount: 0 },

  // PRINCIPIO 4
  { clause: '4.1.1', title: 'Evaluacion de impacto social', description: 'Se realiza una evaluacion de impacto social y de derechos humanos (EISDH).', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '4.1.2', title: 'Gestion de impactos sociales', description: 'Se implementa un plan de gestion de impactos sociales.', status: 'PARTIAL', evidenceCount: 1 },
  { clause: '4.1.3', title: 'Participacion en la EISDH', description: 'Las comunidades afectadas participan en la elaboracion y revision de la EISDH.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '4.2.1', title: 'Proceso de consulta', description: 'Existe un procedimiento documentado para la consulta a comunidades.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '4.2.2', title: 'Consulta previa', description: 'Se realiza consulta previa, libre e informada antes de cualquier nuevo desarrollo.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '4.2.3', title: 'Documentacion de acuerdos', description: 'Se documentan todos los acuerdos alcanzados con comunidades.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '4.3.1', title: 'Documentos de propiedad', description: 'Existen documentos que demuestran la propiedad legal de la tierra.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '4.3.2', title: 'Mapas de derechos', description: 'Se elaboran mapas de derechos legales mediante mapeo participativo.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '4.4.1', title: 'Procedimiento CLPI', description: 'Existe un procedimiento para obtener el Consentimiento Libre, Previo e Informado.', status: 'COMPLIANT', evidenceCount: 1 },
  { clause: '4.4.2', title: 'Aplicacion del CLPI', description: 'Se obtuvo CLPI para todo desarrollo de palma de aceite.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '4.4.3', title: 'Verificacion del CLPI', description: 'Se verifica periodicamente que las condiciones del CLPI se mantienen.', status: 'PARTIAL', evidenceCount: 1 },
  { clause: '4.5.1', title: 'Procedimiento de compensacion', description: 'Existe un procedimiento para calcular y distribuir compensacion justa.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '4.5.2', title: 'Acuerdos de compensacion', description: 'Se documentan todos los acuerdos de compensacion.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '4.5.3', title: 'Revision de compensacion', description: 'Se revisa periodicamente la adecuacion de la compensacion.', status: 'PENDING', evidenceCount: 0 },
  { clause: '4.6.1', title: 'Sistema de quejas comunitario', description: 'Se cuenta con un sistema de quejas accesible para comunidades.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '4.6.2', title: 'Personal designado para quejas', description: 'Se designa personal responsable de gestionar las quejas comunitarias.', status: 'COMPLIANT', evidenceCount: 1 },
  { clause: '4.6.3', title: 'Resolucion oportuna', description: 'Las quejas se resuelven en plazos definidos y se informa a los reclamantes.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '4.7.1', title: 'Programa de desarrollo local', description: 'La UoC contribuye al desarrollo local con programas de inversion social.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '4.7.2', title: 'Prioridades comunitarias', description: 'Los programas responden a las prioridades identificadas por las comunidades.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '4.7.3', title: 'Empleo local', description: 'Se prioriza la contratacion de personal de las comunidades locales.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '4.8.1', title: 'Derechos de pueblos indigenas', description: 'Se identifican y respetan los derechos de los pueblos indigenas.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '4.8.2', title: 'Consulta a pueblos indigenas', description: 'Se consulta a las comunidades indigenas segun sus protocolos tradicionales.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '4.8.3', title: 'Proteccion de sitios culturales', description: 'Se identifican y protegen los sitios de importancia cultural e historica.', status: 'COMPLIANT', evidenceCount: 2 },

  // PRINCIPIO 5
  { clause: '5.1.1', title: 'Procesos justos para productores', description: 'Existen procesos para conducta justa y transparente con pequenos productores.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '5.1.2', title: 'Contratos con productores', description: 'Se establecen contratos o acuerdos escritos con pequenos productores.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '5.1.3', title: 'Precios justos', description: 'Se garantizan precios justos y condiciones de pago transparentes.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '5.1.4', title: 'Abastecimiento de RFF', description: 'Se prioriza el abastecimiento fisico de RFF de pequenos productores.', status: 'PARTIAL', evidenceCount: 2 },
  { clause: '5.2.1', title: 'Programa de inclusion', description: 'Existe un programa documentado para la inclusion de pequenos productores.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '5.2.2', title: 'Trazabilidad de productores', description: 'Se mantiene trazabilidad del origen del fruto de pequenos productores.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '5.2.3', title: 'Registro de productores', description: 'Se mantiene un registro actualizado de pequenos productores.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '5.3.1', title: 'Capacitacion tecnica', description: 'Se brinda capacitacion tecnica sobre buenas practicas agricolas.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '5.3.2', title: 'Extension agricola', description: 'Se ofrece servicio de extension agricola a pequenos productores.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '5.3.3', title: 'Apoyo a la certificacion', description: 'Se apoya a los pequenos productores en su camino hacia la certificacion RSPO.', status: 'PARTIAL', evidenceCount: 1 },

  // PRINCIPIO 6
  { clause: '6.1.1', title: 'Politica de no discriminacion', description: 'Existe una politica de no discriminacion e igualdad de oportunidades.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '6.1.2', title: 'Capacitacion en no discriminacion', description: 'Se capacita al personal sobre la politica de no discriminacion.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '6.1.3', title: 'Comite de equidad', description: 'Se constituye un comite de equidad de genero y diversidad.', status: 'PARTIAL', evidenceCount: 1 },
  { clause: '6.2.1', title: 'Procedimientos de contratacion', description: 'Existen procedimientos documentados de reclutamiento, contratacion y despido.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '6.2.2', title: 'Condiciones contractuales', description: 'Los contratos establecen las condiciones de empleo conformes a la ley.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '6.2.3', title: 'Registro de trabajadores', description: 'Se mantiene un registro actualizado de todos los trabajadores.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '6.2.4', title: 'Jornada laboral', description: 'Se respetan los limites legales de jornada laboral y horas extras.', status: 'COMPLIANT', evidenceCount: 6 },
  { clause: '6.2.5', title: 'Trabajadores temporales', description: 'Los trabajadores temporales reciben el mismo trato que los permanentes.', status: 'PARTIAL', evidenceCount: 2 },
  { clause: '6.2.6', title: 'Pago oportuno', description: 'Los trabajadores reciben su salario en las fechas pactadas.', status: 'COMPLIANT', evidenceCount: 8 },
  { clause: '6.3.1', title: 'Salario digno', description: 'Se paga un Salario Digno a todos los trabajadores.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '6.3.2', title: 'Calculo de salario digno', description: 'Se realiza y documenta el calculo de salario digno.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '6.3.3', title: 'Revision periodica', description: 'Se revisa periodicamente el salario digno frente a inflacion.', status: 'COMPLIANT', evidenceCount: 1 },
  { clause: '6.4.1', title: 'Politica de libertad de asociacion', description: 'Existe politica de respeto a la libertad de asociacion.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '6.4.2', title: 'Sindicatos y asociaciones', description: 'Se reconoce a los sindicatos legalmente constituidos.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '6.4.3', title: 'Convenio colectivo', description: 'Se cumplen los terminos del convenio colectivo.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '6.5.1', title: 'Politica de proteccion infantil', description: 'Existe politica de proteccion de la infancia y prohibicion del trabajo infantil.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '6.5.2', title: 'Verificacion de edad', description: 'Se verifica la edad de todos los trabajadores al contratar.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '6.5.3', title: 'Trabajo juvenil protegido', description: 'El trabajo juvenil es formativo, sin riesgo y con tutoria.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '6.6.1', title: 'Politica anti-acoso', description: 'Existe politica de prohibicion de acoso, abuso y violencia.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '6.6.2', title: 'Comite de convivencia', description: 'Se constituye un comite de convivencia laboral.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '6.6.3', title: 'Mecanismo confidencial', description: 'Se implementa un mecanismo confidencial para denunciar acoso.', status: 'COMPLIANT', evidenceCount: 1 },
  { clause: '6.7.1', title: 'Politica contra trabajo forzoso', description: 'Existe politica de prevencion del trabajo forzoso.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '6.7.2', title: 'Documentacion retenida', description: 'Se prohibe la retencion de documentos de identidad.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '6.7.3', title: 'Libertad de movimiento', description: 'Se garantiza la libertad de movimiento de los trabajadores.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '6.8.1', title: 'Politica antitrata', description: 'Existen politicas de prevencion del trabajo forzoso y trata.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '6.8.2', title: 'Verificacion de agencias', description: 'Se verifican las agencias de contratacion para prevenir trata.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '6.9.1', title: 'Politica de SST', description: 'Existe una politica de salud y seguridad ocupacional.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '6.9.2', title: 'Comite de SST', description: 'Se establecio el Comite de Salud y Seguridad.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '6.9.3', title: 'Evaluacion de riesgos SST', description: 'Se realiza evaluacion de riesgos de SST para todas las actividades.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '6.9.4', title: 'Capacitacion en SST', description: 'Se brinda capacitacion regular en SST a todos los trabajadores.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '6.9.5', title: 'EPP gratuito', description: 'Se proporciona EPP gratuito, adecuado y en buen estado.', status: 'COMPLIANT', evidenceCount: 6 },
  { clause: '6.9.6', title: 'Atencion medica', description: 'Se garantiza acceso a atencion medica basica en el lugar de trabajo.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '6.9.7', title: 'Registro de accidentes', description: 'Se lleva un registro de accidentes con analisis de causas.', status: 'COMPLIANT', evidenceCount: 4 },

  // PRINCIPIO 7
  { clause: '7.1.1', title: 'Plan MIP', description: 'Existe un plan de Manejo Integrado de Plagas documentado.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '7.1.2', title: 'Pesticidas prohibidos', description: 'Se prohibe el uso de pesticidas restringidos por convenios internacionales.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '7.1.3', title: 'Registro de pesticidas', description: 'Se registran todos los usos de pesticidas con fecha, dosis y area.', status: 'COMPLIANT', evidenceCount: 5 },
  { clause: '7.1.4', title: 'Reduccion de pesticidas', description: 'Se implementa programa de reduccion progresiva de pesticidas quimicos.', status: 'PARTIAL', evidenceCount: 2 },
  { clause: '7.1.5', title: 'Almacenamiento de quimicos', description: 'Los agroquimicos se almacenan en bodegas seguras y con control.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '7.2.1', title: 'Plan de conservacion de suelos', description: 'Se implementa un plan de conservacion de suelos contra la erosion.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '7.2.2', title: 'Analisis de suelos', description: 'Se realizan analisis periodicos de fertilidad del suelo.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '7.2.3', title: 'Manejo de residuos', description: 'Se implementa un plan de manejo integral de residuos.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '7.2.4', title: 'Abonos organicos', description: 'Se prioriza el uso de abonos organicos y subproductos.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '7.3.1', title: 'Identificacion de zonas fragiles', description: 'Se identifican y cartografian zonas con pendientes y suelos fragiles.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '7.3.2', title: 'Restriccion en pendientes', description: 'No se realizan nuevas siembras en pendientes superiores al limite.', status: 'COMPLIANT', evidenceCount: 1 },
  { clause: '7.3.3', title: 'Terrazas y cobertura', description: 'Se implementan terrazas y cultivos de cobertura en zonas de pendiente.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '7.4.1', title: 'Proteccion de turberas', description: 'No se realizan nuevas plantaciones en turberas desde nov/2018.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '7.4.2', title: 'Inventario de turberas', description: 'Se cuenta con un inventario de turberas en el area de la UoC.', status: 'COMPLIANT', evidenceCount: 1 },
  { clause: '7.4.3', title: 'Manejo hidrologico', description: 'Las turberas cuentan con manejo hidrologico para minimizar oxidacion.', status: 'PARTIAL', evidenceCount: 2 },
  { clause: '7.5.1', title: 'Plan de gestion del agua', description: 'Existe un plan de gestion del agua con fuentes, usos y conservacion.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '7.5.2', title: 'Monitoreo de calidad del agua', description: 'Se monitorea la calidad del agua en fuentes y efluentes.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '7.5.3', title: 'Proteccion de fuentes', description: 'Se protegen las fuentes de agua y rondas hídricas.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '7.5.4', title: 'Eficiencia hidrica', description: 'Se implementan medidas de uso eficiente del agua.', status: 'PARTIAL', evidenceCount: 1 },
  { clause: '7.6.1', title: 'Calculo de GEI', description: 'Se identifican y evaluan emisiones de GEI usando PalmGHG.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '7.6.2', title: 'Plan de reduccion GEI', description: 'Se implementa un plan de reduccion de emisiones de GEI.', status: 'PARTIAL', evidenceCount: 1 },
  { clause: '7.6.3', title: 'Energia renovable', description: 'Se evalua el uso de energia renovable en las operaciones.', status: 'PARTIAL', evidenceCount: 1 },
  { clause: '7.6.4', title: 'Captura de metano', description: 'Se captura el metano de lagunas para generacion de energia.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '7.6.5', title: 'Prohibicion de quemas', description: 'Se prohibe el uso de quemas para preparacion del terreno.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '7.7.1', title: 'Proteccion de AVC', description: 'Se protegen Areas de Alto Valor de Conservacion.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '7.7.2', title: 'Evaluacion AVC-ARC', description: 'Se realiza evaluacion de AVC y ARC por expertos calificados.', status: 'COMPLIANT', evidenceCount: 3 },
  { clause: '7.7.3', title: 'Plan de gestion AVC', description: 'Existe un plan de gestion y monitoreo de AVC.', status: 'COMPLIANT', evidenceCount: 2 },
  { clause: '7.7.4', title: 'Monitoreo de biodiversidad', description: 'Se implementa programa de monitoreo de biodiversidad.', status: 'COMPLIANT', evidenceCount: 4 },
  { clause: '7.7.5', title: 'Corredores biologicos', description: 'Se mantienen corredores biologicos entre areas de conservacion.', status: 'PARTIAL', evidenceCount: 2 }
];

async function reseedRSPO() {
  console.log('Deleting old RSPO requirements...');
  await db.query('DELETE FROM Requirement WHERE standardId = ?', ['RSPO']);
  await db.query('DELETE FROM Standard WHERE id = ?', ['RSPO']);

  console.log('Inserting RSPO P&C 2024 standard...');
  await db.query(
    'INSERT INTO Standard (id, name, fullName, description, color, icon) VALUES (?, ?, ?, ?, ?, ?)',
    ['RSPO', 'RSPO P&C 2024', 'RSPO Principles & Criteria 2024',
     'Aceite de palma sostenible — Principios y Criterios RSPO 2024 (7 Principios, 162 Indicadores)',
     '#65a30d', 'RSPO']
  );

  console.log(`Inserting ${rspoRequirements.length} requirements...`);
  for (const req of rspoRequirements) {
    const reqId = uuidv4();
    await db.query(
      'INSERT INTO Requirement (id, clause, title, description, status, evidenceCount, standardId) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [reqId, req.clause, req.title, req.description, req.status, req.evidenceCount, 'RSPO']
    );
  }

  console.log(`✅ RSPO P&C 2024 re-seeded with ${rspoRequirements.length} indicators across 7 principles.`);
}

reseedRSPO()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.end();
  });
