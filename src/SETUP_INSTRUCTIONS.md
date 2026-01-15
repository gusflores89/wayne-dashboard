# RetainPlayers Dashboard - Setup Guide

## 📁 Archivos incluidos

| Archivo | Descripción |
|---------|-------------|
| `App.jsx` | Componente principal (maneja auth) |
| `LoginScreen.jsx` | Pantalla de login |
| `WayneDashboardDark.jsx` | Dashboard con dark mode |

---

## 🚀 Instalación

### 1. Copia los archivos a tu proyecto

Coloca los 3 archivos `.jsx` en tu carpeta `src/`:

```
src/
├── App.jsx              (reemplaza el existente)
├── LoginScreen.jsx      (nuevo)
├── WayneDashboardDark.jsx (nuevo - reemplaza WayneDashboard.jsx)
└── main.jsx             (ya existente, no cambiar)
```

### 2. Actualiza tu `.env`

Agrega la contraseña del dashboard:

```env
# Contraseña para acceder al dashboard (cámbiala!)
VITE_DASHBOARD_PASSWORD="tu_contraseña_segura_aqui"

# URLs de Google Sheets (ya las tienes)
VITE_SHEET_KPIS_GENDER_CSV="https://..."
VITE_SHEET_PROGRAMS_CSV="https://..."
VITE_SHEET_AGE_CSV="https://..."
VITE_SHEET_TEAMS_CSV="https://..."
VITE_SHEET_PLAYERS_CSV="https://..."
```

### 3. Reinicia Vite

```bash
# Para el servidor
Ctrl + C

# Reinicia
npm run dev
```

---

## 🔐 Cómo funciona el Login

1. El usuario ve la pantalla de login
2. Ingresa la contraseña definida en `VITE_DASHBOARD_PASSWORD`
3. Si es correcta, se guarda sesión en localStorage (24 horas)
4. El usuario puede hacer logout con el botón en el header

### Contraseña por defecto

Si no defines `VITE_DASHBOARD_PASSWORD`, la contraseña será: `demo123`

**⚠️ Cambia esto antes de hacer deploy a producción!**

---

## 🎨 Colores del Dark Mode

El dashboard usa estos colores (estilo RetainPlayers):

| Elemento | Color |
|----------|-------|
| Fondo principal | `#0a1628` |
| Cards | `#111827` |
| Bordes | `rgba(51, 65, 85, 0.5)` |
| Acento azul | `#3b82f6` |
| Texto primario | `#ffffff` |
| Texto secundario | `#94a3b8` |

---

## 🚀 Deploy a Vercel

1. Asegúrate de agregar `VITE_DASHBOARD_PASSWORD` en Vercel:
   - Settings → Environment Variables
   - Agrega: `VITE_DASHBOARD_PASSWORD` = `tu_contraseña`

2. Haz commit y push:
   ```bash
   git add .
   git commit -m "Add login + dark mode"
   git push
   ```

3. Vercel detectará los cambios y hará deploy automático

---

## ❓ Troubleshooting

### "No se ve el dashboard después del login"
- Verifica que `WayneDashboardDark.jsx` existe
- Revisa la consola del navegador por errores

### "La contraseña no funciona"
- Reinicia Vite después de cambiar `.env`
- Verifica que la variable se llama exactamente `VITE_DASHBOARD_PASSWORD`

### "Los datos no cargan"
- Limpia las primeras filas de los Google Sheets (quita emojis)
- Verifica que cada hoja empieza con los headers
