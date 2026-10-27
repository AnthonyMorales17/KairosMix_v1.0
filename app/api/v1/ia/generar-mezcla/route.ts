import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/server-auth';
import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

const GenerarMezclaSchema = z.object({
  tipoDieta: z.enum(['KETO', 'VEGANA', 'DEPORTIVA', 'ESTANDAR', 'PALEO']),
  metaCalorias: z.number().positive({ message: 'Meta de calorías debe ser un número positivo' }),
  metaProteinaG: z.number().positive({ message: 'Meta de proteína debe ser un número positivo' }),
  alergenosExcluir: z.array(z.number()),
  ingredientesPreferidos: z.array(z.number()).optional(),
  pesoTotalGramos: z.number().positive({ message: 'Peso total en gramos debe ser un número positivo' }),
});

const MODEL_NAME = 'gemini-3.6-flash';

// Helper to log audit prompts to docs/prompts-ia-generacion.md
function logPromptToFile(attempt: number, systemInstruction: string, userPrompt: string, responseText: string) {
  try {
    const docsDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    const logFilePath = path.join(docsDir, 'prompts-ia-generacion.md');
    const timestamp = new Date().toISOString();

    const logEntry = `
## Log de Generación IA — ${timestamp} (Intento #${attempt})
**Modelo Gemini:** \`${MODEL_NAME}\`

### Prompt del Sistema (System Instruction):
\`\`\`
${systemInstruction}
\`\`\`

### Prompt de Usuario (User Prompt):
\`\`\`
${userPrompt}
\`\`\`

### Respuesta Estructurada de Gemini:
\`\`\`json
${responseText}
\`\`\`
---
`;
    fs.appendFileSync(logFilePath, logEntry, 'utf-8');
  } catch (err) {
    console.error('Error guardando prompt en docs/prompts-ia-generacion.md:', err);
  }
}

export async function POST(req: NextRequest) {
  const authUser = verifyAuthToken(req);
  if (!authUser) {
    return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parseResult = GenerarMezclaSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { message: 'Parámetros de entrada inválidos', errors: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      tipoDieta,
      metaCalorias,
      metaProteinaG,
      alergenosExcluir,
      ingredientesPreferidos = [],
      pesoTotalGramos,
    } = parseResult.data;
    const densidadCaloricaObjetivo = metaCalorias / pesoTotalGramos;
    const densidadProteicaObjetivo = metaProteinaG / pesoTotalGramos;
    const pesoCaloriasEnScore = densidadCaloricaObjetivo <= 2 ? 3.5 : 2.5;
    const pesoProteinaEnScore = densidadProteicaObjetivo >= 0.15 ? 3.0 : 2.0;

    // ----------------------------------------------------
    // Paso 1: Filtro determinista (código CERO alucinaciones LLM)
    // ----------------------------------------------------
    const todosIngredientes = await prisma.ingrediente.findMany({
      where: { activo: true },
      include: {
        stock: true,
        alergenos: {
          include: {
            alergeno: true,
          },
        },
      },
    });

    const setAlergenosExcluir = new Set(alergenosExcluir);

    const ingredientesFiltrados = todosIngredientes.filter((ing) => {
      // 1. Excluir ingredientes sin precioPorGramo o con precio <= 0 (Precio obligatorio sin fallback inventado)
      if (!ing.precioPorGramo || ing.precioPorGramo <= 0) return false;

      // 2. Excluir alérgenos en nivel CONTIENE o TRAZAS
      const tieneAlergenoProhibido = ing.alergenos.some((rel) => setAlergenosExcluir.has(rel.alergenoId));
      if (tieneAlergenoProhibido) return false;

      // 3. Excluir ingredientes sin stock disponible
      if (!ing.stock || ing.stock.gramosDisponibles <= 0) return false;

      // 4. Regla tipoDieta VEGANA -> excluir origen ANIMAL
      if (tipoDieta === 'VEGANA' && ing.origen === 'ANIMAL') return false;

      // 5. Regla tipoDieta KETO -> excluir carbohidratos > 20g/100g
      if (tipoDieta === 'KETO' && ing.carbohidratosG100g > 20) return false;

      return true;
    });

    if (ingredientesFiltrados.length < 5) {
      return NextResponse.json(
        {
          message: `No hay suficientes ingredientes disponibles en inventario (${ingredientesFiltrados.length} disponibles, mínimo 5 requeridos) que cumplan con la dieta ${tipoDieta} y las exclusiones de alérgenos/precio indicadas.`,
          disponibles: ingredientesFiltrados.length,
        },
        { status: 400 }
      );
    }

    // ----------------------------------------------------
    // Validación matemática de factibilidad antes de llamar a Gemini
    // ----------------------------------------------------
    const densidadesCal = ingredientesFiltrados.map((i) => i.caloriasPor100g);
    const densidadesProt = ingredientesFiltrados.map((i) => i.proteinasG100g);

    const minDensidadCal = Math.min(...densidadesCal);
    const maxDensidadCal = Math.max(...densidadesCal);
    const minDensidadProt = Math.min(...densidadesProt);
    const maxDensidadProt = Math.max(...densidadesProt);

    const minCaloriasPosibles = (pesoTotalGramos * minDensidadCal) / 100;
    const maxCaloriasPosibles = (pesoTotalGramos * maxDensidadCal) / 100;
    const minProteinasPosibles = (pesoTotalGramos * minDensidadProt) / 100;
    const maxProteinasPosibles = (pesoTotalGramos * maxDensidadProt) / 100;

    const toleranciaMinCal = metaCalorias * 0.85;
    const toleranciaMaxCal = metaCalorias * 1.15;
    const toleranciaMinProt = metaProteinaG * 0.85;
    const toleranciaMaxProt = metaProteinaG * 1.15;

    if (minCaloriasPosibles > toleranciaMaxCal) {
      return NextResponse.json(
        {
          message: `La meta de ${metaCalorias} kcal no es alcanzable con ${pesoTotalGramos}g de este catálogo. Prueba entre ${Math.round(minCaloriasPosibles)} y ${Math.round(maxCaloriasPosibles)} kcal, o ajusta el peso total.`,
          minCaloriasPosibles: Math.round(minCaloriasPosibles),
        },
        { status: 400 }
      );
    }

    if (maxCaloriasPosibles < toleranciaMinCal) {
      return NextResponse.json(
        {
          message: `La meta de ${metaCalorias} kcal requiere más peso total o ingredientes más calóricos de los disponibles (máximo posible: ~${Math.round(maxCaloriasPosibles)} kcal).`,
          maxCaloriasPosibles: Math.round(maxCaloriasPosibles),
        },
        { status: 400 }
      );
    }

    if (maxProteinasPosibles < toleranciaMinProt) {
      return NextResponse.json(
        {
          message: `La meta de ${metaProteinaG} g de proteína no es alcanzable con ${pesoTotalGramos}g de peso total usando el catálogo disponible (máximo posible: ~${maxProteinasPosibles.toFixed(1)} g). Aumenta el peso total o relaja las restricciones para incluir ingredientes más proteicos.`,
          maxProteinasPosibles: Number(maxProteinasPosibles.toFixed(1)),
        },
        { status: 400 }
      );
    }

    if (minProteinasPosibles > toleranciaMaxProt) {
      return NextResponse.json(
        {
          message: `La meta de ${metaProteinaG} g de proteína es demasiado baja para ${pesoTotalGramos}g de peso total con el catálogo disponible (mínimo posible: ~${minProteinasPosibles.toFixed(1)} g). Reduce el peso total o aumenta la meta proteica.`,
          minProteinasPosibles: Number(minProteinasPosibles.toFixed(1)),
        },
        { status: 400 }
      );
    }

    // ----------------------------------------------------
    // Paso 2: Invocación a Gemini con Salida Estructurada (@google/genai)
    // ----------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY || '';
    const ai = new GoogleGenAI({ apiKey });

    // Subconjunto formateado exclusivamente con datos reales y garantizados de la BD
    const ingredientesParaLLM = ingredientesFiltrados
      .map((ing) => {
        const caloriasPorGramo = ing.caloriasPor100g / 100;
        const proteinasPorGramo = ing.proteinasG100g / 100;
        const scoreAjusteObjetivo =
          Math.abs(caloriasPorGramo - densidadCaloricaObjetivo) * pesoCaloriasEnScore +
          Math.abs(proteinasPorGramo - densidadProteicaObjetivo) * pesoProteinaEnScore;

        return {
          id: ing.id,
          nombre: ing.nombre,
          categoria: ing.categoria,
          caloriasPor100g: ing.caloriasPor100g,
          caloriasPorGramo,
          proteinasG100g: ing.proteinasG100g,
          proteinasPorGramo,
          grasasG100g: ing.grasasG100g,
          carbohidratosG100g: ing.carbohidratosG100g,
          precioPorGramo: ing.precioPorGramo!,
          esPreferido: ingredientesPreferidos.includes(ing.id),
          scoreAjusteObjetivo: Number(scoreAjusteObjetivo.toFixed(4)),
        };
      })
      .sort((a, b) => a.scoreAjusteObjetivo - b.scoreAjusteObjetivo);

    const systemInstruction = `
Eres el motor nutricional inteligente de KairosMix.
Tu responsabilidad es seleccionar combinaciones armónicas de ingredientes y asignarles proporciones relativas.

REGLAS STRICTAS Y ARQUITECTURA DEL SISTEMA:
1. No calcules gramos ni calorías exactos. Tu única salida es la selección de ingredientes y su proporcionRelativa (números entre 5 y 50).
2. Selecciona únicamente entre 3 y 6 ingredientes utilizando EXCLUSIVAMENTE los IDs provistos en la propiedad 'id' del catálogo pre-filtrado.
3. Si el usuario marcó ingredientesPreferidos = true, intenta incluirlos en la mezcla siempre que respeten los objetivos.
4. Genera una justificación profesional y apetitosa en español explicando los beneficios y por qué la mezcla se ajusta al perfil seleccionado.
5. Antes de elegir las proporciones, razona sobre la densidad del objetivo:
   - Si la densidad calórica objetivo es baja, prioriza ingredientes con menor caloriasPor100g y evita combinar varios ingredientes densos en calorías.
   - Si la densidad proteica objetivo es alta, prioriza ingredientes con mayor proteinasG100g y dales más proporcionRelativa que al resto.
   - Es preferible una mezcla con menos variedad pero que cumpla las metas, a una mezcla más balanceada en tipos de ingrediente que no las cumpla.
`;

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        composicion: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              ingredienteId: { type: Type.INTEGER, description: 'ID del ingrediente existente en el catálogo pre-filtrado' },
              proporcionRelativa: { type: Type.NUMBER, description: 'Proporción relativa (peso relativo entre 5 y 50)' },
            },
            required: ['ingredienteId', 'proporcionRelativa'],
          },
        },
        justificacion: {
          type: Type.STRING,
          description: 'Explicación detallada en lenguaje natural del porqué de la mezcla y sus beneficios nutricionales',
        },
      },
      required: ['composicion', 'justificacion'],
    };

    let intento = 0;
    const maxIntentos = 3;
    let dentroDeTolerancia = false;
    let mejorResultado: any = null;
    let mejorDiferencia = Infinity;
    let feedbackFeedbackAdicional = '';
    let ultimoErrorGemini: any = null;

    while (intento < maxIntentos && !dentroDeTolerancia) {
      intento++;

      const userPrompt = `
Parámetros del usuario:
- Tipo de Dieta: ${tipoDieta}
- Meta de Calorías: ${metaCalorias} kcal
- Meta de Proteína: ${metaProteinaG} g
- Peso Total de la Mezcla: ${pesoTotalGramos} g
- Densidad Calórica Objetivo: ${densidadCaloricaObjetivo.toFixed(3)} kcal/g
- Densidad Proteica Objetivo: ${densidadProteicaObjetivo.toFixed(3)} g proteína/g

Catálogo de Ingredientes Disponibles (Pre-filtrado determinista):
Ordenado de mejor a peor ajuste respecto a la densidad calórica y proteica objetivo.
${JSON.stringify(ingredientesParaLLM, null, 2)}
${feedbackFeedbackAdicional ? `\nRetroalimentación de intento previo:\n${feedbackFeedbackAdicional}` : ''}
`;

      let responseText = '';
      let llmOutput: { composicion: Array<{ ingredienteId: number; proporcionRelativa: number }>; justificacion: string };

      try {
        const response = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2,
          },
        });

        responseText = response.text || '';
        llmOutput = JSON.parse(responseText);
      } catch (geminiErr: any) {
        console.error(`Error invocando Gemini (Intento ${intento}):`, geminiErr);
        ultimoErrorGemini = geminiErr;
        // SIN FALLBACK FABRICADO: Si Gemini falla, pasar al siguiente intento o reportar 503
        continue;
      }

      // Log auditable de prompts reales devueltos por Gemini
      logPromptToFile(intento, systemInstruction, userPrompt, responseText);

      // ----------------------------------------------------
      // Paso 2.1: Validación estricta de ingredienteId
      // ----------------------------------------------------
      const composicionValida = llmOutput.composicion.filter((item) => {
        const existe = ingredientesFiltrados.some((i) => i.id === item.ingredienteId);
        if (!existe) {
          console.warn(`[Intento ${intento}] Gemini devolvió ingredienteId ${item.ingredienteId} inexistente en el subconjunto. Descartando ítem.`);
        }
        return existe;
      });

      if (composicionValida.length < 2) {
        console.warn(`[Intento ${intento}] Composición contiene menos de 2 ingredientes válidos. Reintentando...`);
        feedbackFeedbackAdicional = `ADVERTENCIA DE REINTENTO: Algunos ingredienteId no pertenecían al catálogo. Usa exclusivamente los IDs numéricos provistos en el parámetro 'id'.`;
        continue;
      }

      // ----------------------------------------------------
      // Paso 3: Cálculo determinista (código, NO LLM)
      // ----------------------------------------------------
      const sumaProporciones = composicionValida.reduce((acc, item) => acc + (item.proporcionRelativa || 1), 0);

      let caloriasTotales = 0;
      let proteinasTotales = 0;
      let grasasTotales = 0;
      let carbohidratosTotales = 0;

      const itemsCalculados = composicionValida.map((item) => {
        const ingBD = ingredientesFiltrados.find((i) => i.id === item.ingredienteId)!;
        const proporcion = item.proporcionRelativa || 1;
        const gramos = Math.round(((proporcion / sumaProporciones) * pesoTotalGramos) * 10) / 10;

        const calorias = (gramos * ingBD.caloriasPor100g) / 100;
        const proteinas = (gramos * ingBD.proteinasG100g) / 100;
        const grasas = (gramos * ingBD.grasasG100g) / 100;
        const carbohidratos = (gramos * ingBD.carbohidratosG100g) / 100;

        caloriasTotales += calorias;
        proteinasTotales += proteinas;
        grasasTotales += grasas;
        carbohidratosTotales += carbohidratos;

        return {
          ingredienteId: ingBD.id,
          nombre: ingBD.nombre,
          categoria: ingBD.categoria,
          gramos,
          precioPorGramo: ingBD.precioPorGramo!,
          caloriasPor100g: ingBD.caloriasPor100g,
          proteinasG100g: ingBD.proteinasG100g,
          grasasG100g: ingBD.grasasG100g,
          carbohidratosG100g: ingBD.carbohidratosG100g,
          fibraG100g: ingBD.fibraG100g,
          sodioMg100g: ingBD.sodioMg100g,
        };
      });

      caloriasTotales = Math.round(caloriasTotales * 10) / 10;
      proteinasTotales = Math.round(proteinasTotales * 10) / 10;
      grasasTotales = Math.round(grasasTotales * 10) / 10;
      carbohidratosTotales = Math.round(carbohidratosTotales * 10) / 10;

      // ----------------------------------------------------
      // Paso 4: Validación y loop de reintento (±15% tolerancia)
      // ----------------------------------------------------
      const difCaloriasPct = Math.abs(caloriasTotales - metaCalorias) / metaCalorias;
      const difProteinaPct = Math.abs(proteinasTotales - metaProteinaG) / metaProteinaG;

      const toleraCalorias = difCaloriasPct <= 0.15;
      const toleraProteina = difProteinaPct <= 0.15;

      const difTotal = difCaloriasPct + difProteinaPct;
      console.log(
        `[Intento ${intento}] difCaloriasPct=${difCaloriasPct.toFixed(4)} difProteinaPct=${difProteinaPct.toFixed(4)} difTotal=${difTotal.toFixed(4)}`
      );

      if (difTotal < mejorDiferencia) {
        mejorDiferencia = difTotal;
        mejorResultado = {
          justificacion: llmOutput.justificacion,
          caloriasTotales,
          proteinasTotales,
          grasasTotales,
          carbohidratosTotales,
          itemsCalculados,
        };
      }

      if (toleraCalorias && toleraProteina) {
        dentroDeTolerancia = true;
      } else {
        feedbackFeedbackAdicional = `ADVERTENCIA DE REINTENTO: La propuesta anterior generó ${caloriasTotales} kcal (meta: ${metaCalorias} kcal) y ${proteinasTotales}g proteína (meta: ${metaProteinaG}g proteína). Por favor ajusta las proporciones relativas usando ingredientes con mayor o menor densidad según corresponda para aproximarte mejor a las metas.`;
      }
    }

    // ----------------------------------------------------
    // Manejo de Error en caso de que Gemini haya fallado en todos los intentos
    // ----------------------------------------------------
    if (!mejorResultado) {
      try {
        await prisma.eventoAuditoria.create({
          data: {
            usuarioId: authUser.id,
            accion: 'IA_GENERACION',
            entidad: 'Mezcla',
            entidadId: 'N/A',
            payload: {
              modelo: MODEL_NAME,
              intentos: intento,
              error: ultimoErrorGemini?.message || 'Error de servicio Gemini API',
              parametrosEntrada: body,
            },
            resultado: 'FALLO',
          },
        });
      } catch (auditErr) {
        console.error('Error registrando auditoría de fallo IA:', auditErr);
      }

      return NextResponse.json(
        {
          message: 'El motor de IA no está disponible en este momento. Por favor intenta nuevamente en unos minutos.',
          error: ultimoErrorGemini?.message || 'Servicio de IA no disponible',
        },
        { status: 503 }
      );
    }

    const resultadoFinal = mejorResultado;

    // ----------------------------------------------------
    // Paso 5: Persistencia y Respuesta
    // ----------------------------------------------------
    const mezcla = await prisma.mezcla.create({
      data: {
        usuarioId: authUser.id,
        parametrosEntrada: body,
        justificacionLlm: resultadoFinal.justificacion,
        caloriasTotales: resultadoFinal.caloriasTotales,
        proteinasTotales: resultadoFinal.proteinasTotales,
        grasasTotales: resultadoFinal.grasasTotales,
        carbohidratosTotales: resultadoFinal.carbohidratosTotales,
        estado: dentroDeTolerancia ? 'generada' : 'ajustada',
        items: {
          create: resultadoFinal.itemsCalculados.map((item: any) => ({
            ingredienteId: item.ingredienteId,
            gramos: item.gramos,
          })),
        },
      },
    });

    // Registro de Auditoría aislado en try/catch
    try {
      await prisma.eventoAuditoria.create({
        data: {
          usuarioId: authUser.id,
          accion: 'IA_GENERACION',
          entidad: 'Mezcla',
          entidadId: mezcla.id,
          payload: {
            modelo: MODEL_NAME,
            intentosRealizados: intento,
            cumplioTolerancia: dentroDeTolerancia,
            parametrosEntrada: body,
            totales: {
              calorias: resultadoFinal.caloriasTotales,
              proteinas: resultadoFinal.proteinasTotales,
              grasas: resultadoFinal.grasasTotales,
              carbohidratos: resultadoFinal.carbohidratosTotales,
            },
          },
          resultado: 'EXITO',
        },
      });
    } catch (auditErr) {
      console.error('Fallo no bloqueante al registrar evento de auditoría:', auditErr);
    }

    return NextResponse.json({
      mezclaId: mezcla.id,
      estado: mezcla.estado,
      justificacion: resultadoFinal.justificacion,
      totales: {
        pesoGramos: pesoTotalGramos,
        calorias: resultadoFinal.caloriasTotales,
        proteinaG: resultadoFinal.proteinasTotales,
        grasaG: resultadoFinal.grasasTotales,
        carbohidratosG: resultadoFinal.carbohidratosTotales,
      },
      items: resultadoFinal.itemsCalculados,
      metasCumplidas: dentroDeTolerancia,
      intentosRealizados: intento,
      modeloUsado: MODEL_NAME,
    });
  } catch (error: any) {
    console.error('Error en motor de IA de generación de mezclas:', error);
    return NextResponse.json(
      { message: 'Error en el servidor al generar la mezcla personalizada', error: error.message },
      { status: 500 }
    );
  }
}
