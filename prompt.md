# KairosMix — Informe Final de Entrega (Curso de IA)

Redacta el informe final de entrega siguiendo **exactamente** la estructura
de la Sección 4 ("Requisitos de Documentación") y la Sección 6 ("Rúbrica de
Evaluación") del documento del profesor (`C:\Users\User\Septimo\KairosMix\PROYECTO_INTELIGENCIA_ARTIFICIAL.pdf`).
No inventes datos, capacidades, o resultados que no estén respaldados por el
código real o por las pruebas que ya se corrieron en este proyecto — todo
debe ser verificable contra el repositorio.

Formato de entrega: documento Latex `.tex`, sin compilar solo código.

## Estructura obligatoria (calca los pesos de la rúbrica)

### 1. Definición del Problema (15%)

- **Contexto**: KairosMix es un e-commerce de tienda única de mezclas
  personalizadas de frutos secos/snacks.
- **Problema real**: armar mezclas de forma manual es genérico o propenso a
  desbalancear macronutrientes, calorías, y no considera restricciones
  críticas (alergias, tipo de dieta).
- **Justificación técnica**: por qué esto requiere un LLM y no solo un
  algoritmo determinista — la parte de balanceo de proporciones y
  razonamiento sobre combinaciones de ingredientes es donde el LLM aporta
  valor real; el cálculo aritmético final y el filtrado de seguridad
  (alérgenos) se resuelven con código determinista porque el LLM no es
  confiable para eso. Explica esta separación de responsabilidades como el
  argumento central de por qué la arquitectura es la correcta.

### 2. Integración de Resultados IA (35% — la sección más importante)

Explica el motor de IA (`app/api/v1/ia/generar-mezcla/route.ts`) como el
núcleo computacional real del sistema, con sus 5 pasos:

1. Filtro determinista pre-LLM (alérgenos, stock, dieta, precio)
2. Llamada a Gemini con salida estructurada (`responseSchema`) — el LLM
   decide composición y proporciones relativas, nunca gramos exactos
3. Cálculo determinista post-LLM de gramos/macros reales
4. Validación de factibilidad matemática ANTES de llamar al LLM (rechaza en
   `<1s` metas imposibles con el catálogo disponible — inclúyelo como punto
   fuerte, es una capa que la mayoría de proyectos de este nivel no tiene) y
   loop de tolerancia ±15% con reintentos post-LLM
5. Persistencia y auditoría

Categorías de la Sección 1 del PDF que cubre: **Personalización** (mezcla
adaptada al perfil del usuario) y **Toma de Decisiones** (evaluación
probabilística para incluir/excluir y proporcionar ingredientes).

Incluye evidencia real, no solo descripción: cita los resultados reales de
las pruebas ya corridas (ej. el caso `500 kcal/20g/200g` que llegó a
`metasCumplidas: true` en el intento 2 con `difTotal=0.0660`, y el caso
`400 kcal/20g/200g` correctamente rechazado por inviable matemáticamente
con `minCaloriasPosibles: 482`).

### 3. Implementación Técnica (30%)

Arquitectura funcional completa: Next.js App Router (monolito — aclara que
se abandonó el plan original de NestJS + microservicios al descubrir que la
plataforma de despliegue solo corre Next.js, y que esto fue una decisión de
ingeniería informada, no un error), Prisma + PostgreSQL, autenticación JWT
con RBAC de 3 roles, transacciones atómicas en checkout (menciona el fix de
condición de carrera con evidencia de la prueba de concurrencia real), y la
integración de Gemini vía `@google/genai`.

Menciona el modelo y versión exactos: `gemini-3.6-flash` (y por qué se migró
desde `gemini-2.5-flash` — dejó de responder de forma consistente).

### 4. Documentación y Copiloto (10%)

Esta sección tiene DOS registros distintos, no los mezcles:

**a) Prompts del producto** (el motor de IA de KairosMix): ya existen en
`docs/prompts-ia-generacion.md` — referencia ese archivo, no lo dupliques
aquí completo, solo cita 1-2 ejemplos representativos.

**b) Prompts usados como copiloto de desarrollo** (esto es lo que falta —
documenta cómo se usó IA para CONSTRUIR el proyecto, no lo que el proyecto
hace): lista los modelos/herramientas de IA usados durante el desarrollo
(el asistente de chat usado para diseño y debugging, y el agente de código
de la plataforma) y documenta 4-5 ejemplos reales y específicos de prompts
que resolvieron bloqueos concretos, por ejemplo:

- El diagnóstico del bug de refresh token reutilizable (truncamiento de
  bcrypt a 72 bytes)
- La detección de que el "backend NestJS" auditado nunca corría en runtime
- El diagnóstico del conflicto de puerto 5432 con un Postgres nativo de
  Windows
- El descubrimiento de que la meta `400kcal/200g` era matemáticamente
  inalcanzable, no un problema de prompt

Incluye el diagrama de arquitectura (usa el diagrama ya generado que
muestra: Cliente → Next.js App Router → {Rutas de negocio → Prisma →
PostgreSQL} y {Motor de IA → Gemini API} — captúralo como imagen si hace
falta insertarlo en un archivo .tex). Deja el espacio para colocar el diagrama.

### 5. Defensa y Justificación (10%)

No es una sección de "cierre" genérica — prepara 3-4 puntos concretos donde
puedas explicar una decisión de diseño con seguridad si te preguntan "¿por
qué así y no de otra forma?":

- Por qué el LLM no calcula gramos exactos (limitaciones de aritmética en
  LLMs)
- Por qué se validó la factibilidad matemática antes de llamar al LLM
  (ahorro de costo/latencia, mejor UX, no es un problema de "mal prompt")
- Por qué se migró de NestJS a Next.js a mitad de proyecto (restricción real
  de la plataforma de despliegue, no un cambio de opinión arbitrario)
- Por qué el hash de refresh tokens usa SHA-256 y no bcrypt (limitación real
  de bcrypt con inputs largos como JWTs — bug encontrado y corregido con
  evidencia)

## Verificación antes de entregar

1. Cada afirmación técnica del informe debe poder señalarse a un archivo o
   resultado de prueba real del proyecto — si no puedes señalarlo, no lo
   incluyas.
2. No copies contenido de `docs/prompts-ia-generacion.md` verificando
   primero que las entradas ahí sean reales (formato `## Log de Generación
IA — <timestamp> (Intento #N)`), no las secciones de "Ejemplo
   Representativo" fabricadas de una versión anterior — confirma cuáles
   quedaron en el archivo antes de citarlas.
3. Entrega el archivo final y un resumen de qué sección cubre qué peso de
   la rúbrica, para revisión antes de la entrega definitiva.
