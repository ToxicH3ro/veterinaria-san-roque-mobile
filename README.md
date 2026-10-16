<<<<<<< HEAD

# 🐾 Veterinaria San Roque

Aplicación móvil para la gestión de una clínica veterinaria, desarrollada con React Native, Expo, TypeScript y Firebase.
El proyecto busca facilitar la administración de mascotas, citas veterinarias, pacientes, inventario y facturación, mediante interfaces diferenciadas para clientes y personal veterinario.

# 👩‍💻 Integrante

**Mariana Beatriz González López**

Proyecto desarrollado de manera individual.

## 📋 Características

### 👤 Módulo de clientes
- Registro e inicio de sesión.
- Gestión de mascotas.
- Consulta y gestión de citas veterinarias.
- Consulta del historial de atención.
- Consulta de pagos.
- Gestión del perfil de usuario.

### 🩺 Módulo administrativo y veterinario
- Panel de inicio.
- Gestión de citas.
- Administración de pacientes.
- Gestión de inventario.
- Administración de facturación.
- Seguimiento del estado de las facturas.
- Confirmación de pagos registrados.
- Gestión de usuarios.

### 💳 Facturación y pagos
- Registro de facturas.
- Asociación de facturas con usuarios.
- Gestión de estados de facturación.
- Simulación del proceso de pago dentro de la aplicación.
- Confirmación del pago por parte del personal autorizado.

> Los pagos son simulados con fines demostrativos. La aplicación no procesa transacciones bancarias reales.

## 🛠️ Tecnologías utilizadas

- React Native
- Expo
- TypeScript
- Firebase Authentication
- Cloud Firestore
- Expo Router
- JavaScript / Node.js
- Git y GitHub

## 📁 Estructura del proyecto

```text
src/
├── app/
│   ├── (auth)/
│   ├── (user)/
│   ├── (admin)/
│   ├── _layout.tsx
│   ├── index.tsx
│   └── dashboard.tsx
├── components/
│   └── ui/
├── services/
├── hooks/
├── context/
├── lib/
├── types/
├── constants/
└── utils/

assets/
├── images/
├── icons/
└── fonts/
```

## ⚙️ Requisitos previos

Antes de ejecutar el proyecto, instala:

- Node.js en una versión compatible con el SDK de Expo utilizado.
- npm.
- Expo Go o un entorno de ejecución compatible con Expo.
- Una cuenta y un proyecto de Firebase configurado para la aplicación.

## 🚀 Instalación

1. Clona el repositorio:

   ```bash
   git clone https://github.com/ToxicH3ro/veterinaria-san-roque-mobile.git
   ```

2. Entra en la carpeta:

   ```bash
   cd veterinaria-san-roque-mobile
   ```

3. Instala las dependencias:

   ```bash
   npm install
   ```

4. Configura Firebase según los requisitos del proyecto.

5. Inicia la aplicación:

   ```bash
   npx expo start
   ```

Sigue las instrucciones que aparecen en la terminal para ejecutar la aplicación en un dispositivo o emulador compatible.

## 🔥 Configuración de Firebase

La aplicación utiliza Firebase para los servicios de autenticación y almacenamiento de información.

Para ejecutar el proyecto, debes disponer de una configuración válida de Firebase y habilitar los servicios requeridos por la aplicación.

No publiques claves privadas, contraseñas, archivos de cuentas de servicio ni otros secretos en el repositorio.

Las reglas de seguridad de Firestore deben configurarse de acuerdo con los permisos que necesita cada tipo de usuario.

## 🧪 Estado del proyecto

Proyecto académico en desarrollo.

La versión actual incluye los módulos principales de gestión veterinaria y facturación implementados para la entrega. Algunas funciones auxiliares y mejoras de arquitectura quedan pendientes para futuras etapas.

## 👨‍💻 Repositorio

GitHub: https://github.com/ToxicH3ro/veterinaria-san-roque-mobile
=======
# veterinaria-san-roque-mobile
>>>>>>> origin/main
