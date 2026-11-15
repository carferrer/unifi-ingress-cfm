## Cambios
- Inicio automático opcional con una cuenta local de UniFi al caducar la sesión de Ingress.
- Las cookies y el token CSRF se mantienen dentro de la ruta de Ingress; los intentos fallidos se espacian para evitar bloqueos.
- El acceso manual sigue disponible si se dejan vacías las credenciales.

La renovación de sesión se ha probado automáticamente; su funcionamiento con el UCG Ultra se comprobará tras instalar esta versión.

**Cambios completos**: https://github.com/carferrer/unifi-ingress-cfm/compare/2026.11.03...2026.11.04
