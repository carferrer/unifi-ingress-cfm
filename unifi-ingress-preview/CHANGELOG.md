# Versión 2026.11.04

## Cambios
- Inicio automático opcional con una cuenta local de UniFi al caducar la sesión de Ingress.
- Las cookies y el token CSRF se mantienen dentro de la ruta de Ingress; los intentos fallidos se espacian para evitar bloqueos.
- El acceso manual sigue disponible si se dejan vacías las credenciales.

La renovación de sesión se ha probado automáticamente; su funcionamiento con el UCG Ultra se comprobará tras instalar esta versión.

**Cambios completos**: https://github.com/carferrer/unifi-ingress-cfm/compare/2026.11.03...2026.11.04

# Versión 2026.11.03

## What's Changed
* ⬆️ Update ghcr.io/hassio-addons/base Docker tag to v21.0.11 by @renovate[bot] in https://github.com/carferrer/unifi-ingress-cfm/pull/4


**Full Changelog**: https://github.com/carferrer/unifi-ingress-cfm/compare/2026.11.02...2026.11.03

# Versión 2026.11.02

## What's Changed
* ⬆️ Update ubuntu to v26 by @renovate[bot] in https://github.com/carferrer/unifi-ingress-cfm/pull/1

## New Contributors
* @renovate[bot] made their first contribution in https://github.com/carferrer/unifi-ingress-cfm/pull/1

**Full Changelog**: https://github.com/carferrer/unifi-ingress-cfm/compare/2026.11.01...2026.11.02

# Changelog

## 2026.11.01
- Numeración por fecha, release e imágenes amd64/aarch64 en GHCR.
- Home Assistant descarga la imagen precompilada.

## 0.0.3
- Preparación del repositorio instalable desde Home Assistant.
- URL y huella vacías por defecto; sin datos de instalaciones particulares.
- Documentación de configuración, límites y migración desde el ZIP local.

## 0.0.2
- Adaptación de imágenes srcset y determinadas rutas CSS.
- Corrección del cuerpo de peticiones fetch construidas como Request.
- Diagnóstico de errores internos de tareas de Network.
- Selector de iconos y reconexión confirmados por el usuario en UCG Ultra.

## 0.0.1
- Primera prueba del puente Ingress.

