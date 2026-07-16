# Contexto del proyecto: family-app

## Resumen

Aplicación privada familiar para gestionar vehículos, mantenimientos, averías, costes, kilometraje y próximos vencimientos.

## Estado actual

- Git está inicializado en este directorio.
- Existe una aplicación con `package.json` basada en Next.js, React, TypeScript, Supabase y Vitest.
- El cambio activo es `openspec/changes/family-app-modularization/`.
- El contrato final de persistencia usa `fam_*` para el núcleo y `fam_ve_*` para vehículos.
- Las pruebas se ejecutan con `npm test`.
- Engram está disponible actualmente.

## Convenciones obligatorias

- Artefactos técnicos en español por decisión explícita del usuario.
- Documentación, comentarios, clases, funciones, variables y configuración generada en español.
- Tablas del núcleo de Supabase con prefijo `fam_` y tablas del módulo de vehículos con prefijo `fam_ve_` como contrato final.

## SDD

- Modo de ejecución: interactivo.
- Almacén de artefactos: OpenSpec y Engram, disponible actualmente.
- Estrategia de PR: auto-forecast.
- Presupuesto de revisión: 400 líneas cambiadas.
- TDD estricto: activo.
- Comando de tests configurado: `npm test`.

## Riesgos conocidos

- El contrato de persistencia actual todavía usa `mv_*`; el cambio activo planifica un corte atómico y coordinado al contrato final `fam_*`/`fam_ve_*`.
