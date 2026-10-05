# Verificación de tasa por préstamo en QA

Ejecutar `004_add_tasa_interes_prestamos.sql` en el SQL Editor de Supabase QA antes de desplegar. El script es transaccional; ante una tasa general inválida, corregirla y ejecutar nuevamente. No se puede recuperar la tasa histórica de un préstamo: se copia la tasa general actual de su usuario.

## Migración

- Antes de ejecutar, registrar cantidades de préstamos y las últimas tasas de dos usuarios con tasas diferentes y de un usuario sin configuración.
- Después, verificar que cada préstamo tenga la tasa de su propio usuario y que el usuario sin configuración tenga 0%.
- Editar una tasa, ejecutar otra vez la migración y verificar que conserve el valor editado y las cantidades de registros.
- Verificar que inserciones sin tasa y tasas negativas, no finitas o con tres decimales sean rechazadas por la base.

## Aplicación

- Crear desde dashboard y desde detalle de cliente, con cliente existente y nuevo. La tasa de Ajustes debe aparecer y ser editable; escribir antes de que termine la carga no debe sobrescribirse.
- Sin configuración, comprobar que aparece 0%. Si falla la consulta, comprobar que se permite ingreso manual.
- Borrar el campo y comprobar que no se crea el préstamo ni el cliente nuevo. Repetir con tasa negativa y tres decimales. Aceptar 0%, 20,25% y 150%.
- Con capital $10.000 y tasa 20%, comprobar interés $2.000 y total $12.000. Guardar, recargar y comprobar persistencia.
- Crear otro préstamo de $10.000 al 30% y comprobar ganancia proyectada conjunta de $5.000. Si ambos vencen en los próximos siete días, comprobar próximos cobros de $25.000.
- Cambiar Ajustes al 40%: los préstamos anteriores deben conservar sus tasas; el siguiente formulario nuevo debe mostrar 40%.
- Editar la tasa de un préstamo pendiente y luego de uno pagado: comprobar detalle, tarjeta, ganancias cobradas e histórico.
- Comprobar que capital colocado, indicadores de riesgo y acceso por plan mantienen su significado y comportamiento.
- Repetir con otra sesión: nunca debe cargar la tasa de otro usuario.

Ejecutar `npm run test:interest`, `npm run test:features`, `npx tsc --noEmit` y `npm run build` desde `src/`.
