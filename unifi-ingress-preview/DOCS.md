# UniFi Ingress CFM

Acceso a una consola UniFi OS local mediante Home Assistant Ingress. Proxy experimental; no instala UniFi Network ni sustituye el router.

## Configuración

- **router_url**: URL HTTPS de la consola, por ejemplo https://192.168.1.1. Sin usuario, contraseña, ruta ni parámetros.
- **certificate_fingerprint**: huella SHA-256 del certificado que presenta esa consola. Se admiten caracteres hexadecimales con o sin dos puntos.

Ambos valores son obligatorios. Obtén la huella desde el visor del certificado del navegador al abrir directamente tu consola, comprobando que se trata de tu equipo. No uses la huella del certificado de Home Assistant.

El puente compara la huella antes de enviar las peticiones. No usa la validación convencional de autoridades certificadoras: confía en el certificado exacto fijado por su SHA-256. Si el certificado cambia, hay que verificar el nuevo y actualizar la huella.

## Acceso

Abre la interfaz desde el add-on y utiliza tu cuenta local de UniFi. Activa Mostrar en el panel lateral si lo deseas. El panel se llama UniFi.

No se publican puertos del host. El puerto interno 8099 acepta al proxy Ingress del Supervisor. El router debe ser accesible por HTTPS desde Home Assistant.

## Funcionamiento y limitaciones

El proxy adapta navegación, peticiones HTTP, WebSocket y determinadas rutas de recursos al prefijo Ingress. Separa las cookies de UniFi mediante nombres y rutas propios y no reenvía las cookies de HA. No almacena la contraseña en las opciones del add-on.

Desactiva los service workers de UniFi y retira CSP de las respuestas proxificadas, conservando X-Frame-Options SAMEORIGIN. Esto cambia las protecciones de la interfaz dentro de Home Assistant: es una solución experimental, no una integración oficial ni una garantía de aislamiento equivalente a un origen separado.

Las asignaciones CSS directas como style.backgroundImage no se adaptan completamente. No se garantiza compatibilidad con todas las funciones de UniFi, aplicaciones distintas de Network, autenticación cloud ni futuras versiones.

Los errores 401 antes de iniciar sesión pueden ser normales. Para investigar acciones que no responden, revisa Consola en el navegador: el prefijo [UniFi Ingress] identifica el diagnóstico de tareas internas. Oculta contraseñas, tokens y cookies antes de compartir registros.

## Actualización y retirada

Las nuevas versiones del add-on se instalan desde la tienda. Una actualización del router puede requerir una nueva versión del puente. Conserva acceso directo al router para mantenimiento.

Detener o desinstalar este add-on no detiene UniFi ni borra sus datos del router.
