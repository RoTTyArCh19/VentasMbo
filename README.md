# APP WEB VENTAS

Aplicación local React + Node.js para SAP Business One sobre HANA. Incluye resumen, ranking de todas las tiendas, ventas por vendedor, evolución diaria, documentos, filtros y exportación CSV compatible con Excel. El navegador consulta Node.js; solo Node.js se conecta a SAP a través de la VPN del equipo.

## Inicio rápido en Windows

1. Instala Node.js 22 o superior (versión LTS) desde https://nodejs.org/ .
2. Descomprime esta carpeta y ábrela en VS Code. Abre una terminal dentro de `app-web-ventas`.
3. Ejecuta:

```powershell
npm install
Copy-Item .env.example .env
npm run build
npm start
```

4. Abre http://localhost:3001 . Mantén la terminal abierta. Para detener, Ctrl+C.

La configuración inicial usa **datos ficticios**. No necesita VPN y permite probar filtros, gráficas y navegación. `dist` ya está incluido como conveniencia; reconstruye después de editar la interfaz. Las dependencias se instalan con Internet y no están incluidas en el ZIP.

## Conectar tus datos reales

Conecta la VPN **en el mismo PC donde se ejecuta Node.js**. Edita `.env`:

```dotenv
DATA_MODE=hana
HANA_SERVER=tu_servidor:30015
HANA_USER=tu_usuario
HANA_PASSWORD=tu_clave
HANA_SCHEMA=CLPRDCOMERVESTUARIO
HANA_ENCRYPT=false
PORT=3001
```

Usa el mismo servidor, puerto, usuario y clave que funcionan en tu código de consola. Si tu instalación exige TLS, cambia `HANA_ENCRYPT=true`; se valida el certificado. No desactives esa validación para resolver errores: instala la confianza requerida por tu organización. Para contraseñas con # usa comillas en `.env`.

Reinicia `npm start` cada vez que edites `.env`. La etiqueta superior debe mostrar SAP HANA. Si la conexión falla, la aplicación presenta un error; **no reemplaza datos reales por datos de ejemplo**. No envíes tu `.env` ni contraseñas por chat.

Permisos necesarios: SELECT sobre OINV, INV1, ORIN, RIN1, OWHS, OSLP y OADM. Todas las consultas son de lectura. Los filtros de fecha se parametrizan y el identificador del esquema se valida. Se permite hasta 366 días por consulta; empieza con una semana si hay mucho volumen. Una sola consulta de ventas a la vez evita saturación desde esta app.

## Criterio de cálculo (leer antes de comparar con SAP)

- Facturas OINV/INV1 con CANCELED = N suman. N/C ORIN/RIN1 con CANCELED = N restan. Se excluyen cancelados y documentos de cancelación.
- La fecha es DocDate del documento, inclusiva. Una devolución emitida hoy descuenta hoy, aunque la venta sea anterior. Un cambio queda como factura nueva menos N/C.
- Se mantiene el criterio solicitado: `signo × DocTotal × LineTotal / suma(LineTotal del documento)`; luego se suma por tienda y vendedor. El reparto siempre se calcula con todas las líneas, antes de aplicar el filtro de tienda o vendedor.
- **DocTotal incluye impuestos**. “Ventas después de N/C” NO significa venta contable sin IVA; es el total facturado menos notas de crédito, siguiendo el criterio de tu código. Gastos, descuentos globales y redondeos incluidos en DocTotal se distribuyen proporcionalmente. No es un reporte de caja ni de pagos cobrados.
- Se utiliza la moneda local de la sociedad (OADM.MainCurncy). No se etiqueta DocTotal con DocCur: para documentos extranjeros se conserva DocCur como referencia en los datos, pero los importes del tablero son locales. No se suman importes en monedas distintas.
- La clave de cada documento es **Tipo + DocEntry**. Nunca se unen las líneas de OINV y ORIN solo por DocEntry: los números pueden coincidir entre tablas.
- Vendedor: SlpCode de INV1/RIN1; si está vacío o es -1, SlpCode de OINV/ORIN. Nombre desde OSLP. Las N/C se atribuyen al vendedor registrado en la propia N/C, no automáticamente al de la venta original. Si el TPV de tu empresa guarda vendedores en un campo personalizado U_..., adapta `server/query.js` una vez identificado ese campo.
- Bodega: WhsCode de las líneas. “Todas las tiendas” incluye **todas las bodegas**; si SAP incluye CD u otras bodegas, también aparecerán. Bodegas sin movimientos están disponibles en el selector, pero no en el ranking de resultados.
- Si la suma de LineTotal es cero, el importe completo se muestra como “Sin bodega / no asignable” y “Sin vendedor”, con advertencia. No se pierde ni se asigna arbitrariamente a una tienda. Los registros sin WhsCode también se mantienen en la vista general.
- Cantidad de facturas: DocEntry únicos dentro del filtro. Una factura con varias tiendas puede aparecer en cada tienda, pero cuenta una sola vez en el indicador general. No sumes cantidades de tiendas para obtener el total de documentos únicos.
- Ticket de facturación: importe facturado asignado al filtro / facturas únicas; no descuenta N/C.
- La vista Documentos tiene una fila por documento, tienda y vendedor. Un mismo folio puede ocupar varias filas. Es correcto; cada fila contiene solo su importe asignado. DocEntry ayuda a distinguir folios repetidos.
- Se conserva precisión durante el reparto y se redondea únicamente al mostrar. Puede haber diferencias de un peso al sumar importes visibles frente al total, por redondeo.

## Uso

1. Elige fechas, tienda y vendedor; pulsa Consultar. Los resultados muestran el período efectivamente consultado.
2. Resumen: indicadores, evolución y top 5 tiendas.
3. Tiendas/Vendedores: top 10 gráfico y tabla completa paginada ordenada por ventas después de N/C.
4. Documentos: busca folio, tienda o vendedor. Las N/C aparecen negativas.
5. Exportar CSV: exporta el detalle del último filtro aplicado y la búsqueda actual, no solo la página visible. Excel puede abrirlo; está codificado UTF-8, separado por punto y coma. No es un archivo XLSX. Los campos de texto se protegen contra fórmulas de hoja de cálculo.

## Desarrollo y pruebas

```powershell
npm run dev
# Abre la URL local mostrada por Vite (normalmente http://localhost:5173)
npm test
npm run build
```

Archivos principales:
- `server/query.js`: consulta SAP y reglas de reparto.
- `server/index.js`: API, conexión y archivos de la interfaz.
- `server/metrics.js`: agregación de indicadores y rankings.
- `server/demo.js`: datos de ejemplo deterministas.
- `src/main.jsx`: interfaz React y gráficos Recharts.
- `src/styles.css`: estilos adaptables a escritorio y móvil.
- `server/metrics.test.js`: casos de regresión de cálculo.

## Alcance y validación

Servidor restringido a 127.0.0.1, uso individual en tu PC, sin login. No está preparado para exponerse a Internet ni para acceso de toda la empresa. Para desplegarlo multiusuario hacen falta autenticación, autorización, HTTPS, acceso privado a SAP y una estrategia de consultas/caché para el volumen real. No se necesita abrir puertos de SAP a Internet.

La interfaz, compilación, API demo y casos de cálculo se pueden probar sin SAP. La consulta HANA y los nombres de vendedores deben verificarse con tu instancia real; no se dispone de tus credenciales ni de tu VPN aquí. Contrasta primero un día, una tienda y algunos folios contra SAP, incluyendo una N/C y una factura con varias bodegas. Confirma que SlpCode sea el vendedor usado por tu TPV.

Referencias SAP:
- SlpCode por línea: https://help.sap.com/doc/089315d8d0f8475a9fc84fb919b501a3/10.0/en-US/SDKHelp/SAPbobsCOM~Document_Lines~SalesPersonCode.html
- Vendedores OSLP: https://help.sap.com/doc/089315d8d0f8475a9fc84fb919b501a3/10.0/en-US/SDKHelp/OSLP.html
