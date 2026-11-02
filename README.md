# UniFi Ingress CFM

Add-on experimental para abrir la interfaz de una consola UniFi OS local dentro de Home Assistant mediante Ingress. UniFi continúa ejecutándose en el router.

[Agregar repositorio a Home Assistant](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2Fcarferrer%2Funifi-ingress-cfm)

## Instalación

1. Añade https://github.com/carferrer/unifi-ingress-cfm a los repositorios de la tienda de add-ons.
2. Instala **UniFi Ingress Preview**. La imagen se compila localmente; puede tardar varios minutos.
3. Configura la URL HTTPS de tu consola y la huella SHA-256 de su certificado.
4. Inicia el add-on, pulsa **Abrir interfaz web** e inicia sesión con tu cuenta local de UniFi.

[Configuración y límites](unifi-ingress-preview/DOCS.md)

## Estado

Basado en la preview 0.0.2, validada por su usuario con UCG Ultra, UniFi OS 5.1.19 y Network 10.4.57: acceso local, navegación, selector de iconos y reconexión de dispositivos. No implica compatibilidad con todos los modelos, versiones o funciones de UniFi.

Versión 0.0.3: preparación para distribución, valores de conexión vacíos y documentación. El puente conserva el comportamiento de 0.0.2.

## Migración desde el ZIP local

Home Assistant considera la instalación desde este repositorio un add-on distinto del local. No es una actualización directa de la instalación ZIP.

Conserva tu URL y huella, detén el add-on local e instala el del repositorio con esos valores. Comprueba el acceso antes de borrar la prueba local. No se migra ni modifica la configuración del router. Tendrás que iniciar sesión de nuevo.

## Desarrollo

El proxy usa Node.js, Acorn y Magic String. No incluye ni redistribuye el JavaScript de UniFi: adapta las respuestas del router en memoria. No es un producto oficial de Ubiquiti ni de Home Assistant.

Las futuras actualizaciones se reciben al subir la versión del add-on en este repositorio. Las actualizaciones de UniFi no se incorporan automáticamente: requieren comprobar la compatibilidad del puente.
