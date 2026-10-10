# Conservación de datos del Directorio Empresarial — PROPUESTA

> **Estado: propuesta para aprobación. No está vigente, no se publica y no se
> aplica automáticamente.** Ningún plazo de este documento se ha programado
> en el código. Revisar con asesoría legal antes de aprobarlo.

Principio (PIPA Alberta, art. 35): conservar la información personal solo
mientras sea razonablemente necesaria para el fin con que se recogió o por
motivos legales o comerciales, y destruirla o anonimizarla después.

## Plazos propuestos por tipo de información

| # | Información | Dónde está | Propuesta | Por qué |
|---|---|---|---|---|
| 1 | Solicitud **rechazada o duplicada** (fila completa, incluido el correo) | D1 `business_applications` | **6 meses** desde el cierre | Responder consultas o reclamos y detectar reenvíos abusivos |
| 2 | Solicitud **sin respuesta del empresario** (pendiente o en revisión) | D1 | Cerrarla a los **90 días** sin respuesta; luego aplicar el plazo 1 | Evitar solicitudes abiertas indefinidamente |
| 3 | Solicitud **aprobada o publicada** | D1 | Mientras el perfil esté publicado y **12 meses** después de retirarlo | Gestión de la relación y del perfil; consultas posteriores |
| 4 | **Imagen original** enviada | R2 (privado) | Rechazadas: con su solicitud (plazo 1). Publicadas: **30 días** después de publicar (la imagen publicada ya está en el sitio) | Minimizar copias |
| 5 | **Huella de la IP** (`ip_hash`) | D1 | Borrarla (dejarla vacía) a los **30 días** | Solo sirve para el límite de envíos y para detectar abusos recientes |
| 6 | **Historial y notas internas** (`application_events`, `review_notes`) | D1 | Igual que su solicitud (se borran con ella) | Forman parte del expediente |
| 7 | **Avisos internos en Gmail** (datos + imagen adjunta) | Gmail | Borrar **30 días** después de cerrar o publicar la solicitud | Los datos ya están en D1; Gmail es una copia |
| 8 | **Correos enviados por Resend** (registro del envío) | Resend | Según el plan de Resend **[VERIFICAR: periodo de retención de registros del plan]** | Lo fija el proveedor; documentarlo |
| 9 | **Registro de eliminaciones** (`deletion_requests`: n.º SOL, huella del correo, fechas, quién) | D1 | **2 años** desde la ejecución **[VERIFICAR con asesoría legal]** | Acreditar que se atendió el pedido ante un reclamo |
| 10 | **Copias de seguridad** (exportaciones `.sql` de D1 antes de una migración) | Almacenamiento privado del administrador | **30 días**, guardadas cifradas y fuera del repositorio | Solo para revertir una migración |
| 11 | **Time Travel de D1** (restauración automática de Cloudflare) | Cloudflare | Automático: 7 días (plan gratuito) o 30 días (plan de pago) **[VERIFICAR plan]** | No se puede acortar; un dato eliminado sigue ahí hasta que vence |
| 12 | **Registros de Functions/Workers** | Cloudflare | No se guardan salvo que se active Logpush (no activado). No incluyen datos de contacto | — |

## Para decidir

1. ¿Aprueban los plazos 1–7 tal cual o con otros valores?
2. Plazo del registro de eliminaciones (9): ¿2 años?
3. ¿Quién revisa cada mes los pasos manuales (Gmail, copias de seguridad)?
4. Cuando estén aprobados:
   - añadir una línea de conservación al aviso del formulario y cambiar la
     versión del consentimiento (`CONSENT_VERSION`);
   - programar las depuraciones automáticas (1, 2, 4, 5) en una fase
     posterior, con su propia prueba y autorización;
   - incluirlos en la Política de privacidad cuando se publique.

Mientras no se aprueben, el aviso del formulario **no menciona plazos** y las
eliminaciones se hacen a pedido, con el procedimiento del panel
(`docs/directorio-solicitudes.md`, sección «Pedidos de eliminación»).
