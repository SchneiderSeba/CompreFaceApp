<div align="center">

# 🧠 FaceApp

<p align="center">
   <img src="https://img.shields.io/badge/Node.js-22.5+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
   <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
   <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React"/>
   <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
   <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
   <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
   <img src="https://img.shields.io/badge/CompreFace-FF6F61?style=for-the-badge" alt="CompreFace"/>
</p>

<p align="center">
   <strong>Reconocimiento facial asistido por IA y CompreFace</strong><br/>
   Captura, almacena y reconoce rostros en tiempo real desde la web
</p>

<p align="center">
   <a href="https://comprefacefront-production.up.railway.app/" target="_blank">
      <img src="https://img.shields.io/badge/🧪_Demo_Online-Probar_App-10B981?style=for-the-badge" alt="Demo Online"/>
   </a>
</p>

</div>

---

## 📌 Características principales

<table>
<tr>
<td width="50%" valign="top">

### 🖼️ Para Usuarios

- 📷 **Captura facial desde webcam**  
   Toma de imágenes en tiempo real desde el navegador
- 🆕 **Inscripción de nuevos rostros**  
   Guarda y asocia nombre a cada rostro
- 🔍 **Reconocimiento facial instantáneo**  
   Compara y detecta coincidencias en la galería
- 📊 **Resultados detallados**  
   Similitud, probabilidad y metadatos
- 🔄 **Interfaz reactiva**  
   Cambia entre modos "Nuevo" y "Reconocer"
- 🖥️ **UI responsiva**  
   Adaptada a móviles y desktop

</td>
<td width="50%" valign="top">

### ⚙️ Para Desarrolladores

- 🚀 **Backend Node.js + Express**  
   Endpoints `/capture` y `/recognize` para la API
- 🧠 **Integración con CompreFace**  
   Orquestación vía Docker Compose
- 🗂️ **Almacenamiento temporal**  
   Manejo de imágenes en carpetas locales
- 🧪 **API documentada**  
   Fácil de consumir desde cualquier frontend
- 🛠️ **Configuración sencilla**  
   Variables `.env` y scripts listos
- 🧩 **Extensible**  
   Pensado para agregar nuevas features

</td>
</tr>
</table>

---

<div align="center">

## 🛠️ Stack Tecnológico

</div>

<table align="center">
<tr>
<td align="center" width="96">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="48" height="48" alt="Node.js" />
<br>Node.js 22.5+
</td>
<td align="center" width="96">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" width="48" height="48" alt="Express" />
<br>Express
</td>
<td align="center" width="96">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="48" height="48" alt="React" />
<br>React 19
</td>
<td align="center" width="96">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="48" height="48" alt="TypeScript" />
<br>TypeScript
</td>
<td align="center" width="96">
<img src="https://vitejs.dev/logo.svg" width="48" height="48" alt="Vite" />
<br>Vite
</td>
<td align="center" width="96">
<img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" width="48" height="48" alt="Docker" />
<br>Docker
</td>
<td align="center" width="96">
<img src="https://raw.githubusercontent.com/exadel-inc/CompreFace/master/docs/images/logo.png" width="48" height="48" alt="CompreFace" />
<br>CompreFace
</td>
</tr>
</table>

<div align="center">

| Tecnología | Uso |
|:----------:|:---:|
| **Node.js + Express** | Backend y API REST |
| **CompreFace** | Motor de reconocimiento facial con IA |
| **React 19 + Vite** | Interfaz de usuario moderna y rápida |
| **TypeScript** | Tipado estricto en frontend |
| **Docker Compose** | Orquestación de servicios |
| **React Webcam** | Captura de imágenes desde navegador |
| **SQLite** | Usuarios, roles y sesiones administrativas |

</div>

---

## 📂 Estructura del proyecto

```
FaceApp/
├── index.js                    # Entry point del backend
├── clientCompreFace.js         # Cliente para consumir CompreFace API
├── database.js                 # SQLite: administradores, empleados y sesiones
├── auth.js                     # Cookies de sesión y autorización por rol
├── faceRecognice.js            # Lógica de reconocimiento facial
├── package.json                # Dependencias del backend
├── railway.toml                # Configuración de despliegue
├── CompreFaceDok/              # Stack Docker de CompreFace
│   └── docker-compose.yml      # Orquestación de servicios ML
├── FrontEnd/faceApp/           # Frontend React + Vite + TS
│   ├── src/
│   │   ├── App.tsx             # Componente principal
│   │   ├── main.tsx            # Entry point del frontend
│   │   ├── components/
│   │   │   ├── WebCapture.tsx  # Captura webcam y modos
│   │   │   └── AddManually.tsx # Agregar rostros manualmente
│   │   └── types/
│   │       └── index.ts        # Tipos TypeScript
│   ├── public/                 # Recursos estáticos
│   ├── package.json            # Dependencias del frontend
│   └── vite.config.ts          # Configuración Vite
├── image/                      # Imágenes almacenadas
├── TempImage/                  # Imágenes temporales
└── README.md                   # Este archivo
```

---

## 🔐 Seguridad y Privacidad

### Procesamiento de imágenes
FaceApp envía las capturas al CompreFace auto-hosteado del proyecto:

- **CompreFace auto-hosteado** - Motor de IA desplegado en el VPS privado del proyecto
- **Sin proveedores biométricos externos** - Las imágenes solo se procesan en la infraestructura configurada
- **Almacenamiento temporal** - Las imágenes se guardan localmente

### Configuración
- **Variables de entorno** - Claves y endpoints configurables en `.env`
- **Clave aislada** - La credencial de CompreFace permanece en el backend y no se envía al navegador
- **Acceso por rol** - Solo administradores autenticados pueden registrar o listar empleados
- **Sesiones seguras** - Cookies HTTP-only con vencimiento y contraseñas derivadas mediante scrypt
- **Control total** - Tú decides dónde y cómo se almacenan los datos

---

## 🧮 Funcionalidades técnicas destacadas

### API Endpoints
- **POST `/api/auth/login`** - Inicia una sesión administrativa
- **GET `/api/auth/me`** - Recupera la sesión activa
- **POST `/api/auth/logout`** - Cierra e invalida la sesión
- **GET `/api/employees`** - Lista empleados (solo admin)
- **POST `/api/employees`** / **POST `/capture`** - Registra empleado y rostro (solo admin)
  - Body: `{ image: string (base64), name: string, employeeCode: string }`
  - Response: Detalles del rostro agregado con `image_id`
  
- **POST `/recognize`** - Busca coincidencias en la galería de rostros
  - Body: `{ image: string (base64) }`
  - Response: Lista de sujetos con similitud, probabilidad y bounding box

### Arquitectura de Datos
```mermaid
flowchart LR
    A[WebCam en navegador] -->|Foto base64| B[Backend Node.js]
    B -->|Forwarding| C[CompreFace API]
    C -->|Resultado JSON| B -->|Payload normalizado| A
    B <-->|Usuarios, roles y sesiones| D[(SQLite)]
```

### Captura de Imágenes
- **React Webcam** captura imágenes a 1280×720
- **Base64 encoding** para transferencia segura
- **Espejo activado** para mejor experiencia de usuario
- **Soporte multi-navegador** (Chrome, Firefox, Edge, Safari)

### Procesamiento ML
- **Modelos pre-entrenados** incluidos en CompreFace
- **Detección de rostros** con bounding boxes
- **Reconocimiento facial** con porcentaje de similitud
- **Múltiples algoritmos** disponibles (FaceNet, MobileNet, SubCenter-ArcFace)

---

<div align="center">

## 🚧 Estado del Proyecto

<img src="https://img.shields.io/badge/Estado-Activo-10B981?style=for-the-badge" alt="Estado"/>
<img src="https://img.shields.io/badge/Versión-1.0-3B82F6?style=for-the-badge" alt="Versión"/>
<img src="https://img.shields.io/badge/Licencia-MIT-F59E0B?style=for-the-badge" alt="Licencia"/>

</div>

**✅ Versión 1.0 - MVP Funcional**  
Sistema completo de captura, inscripción y reconocimiento facial en tiempo real.

> 🔮 Mejoras y nuevas features planificadas en el roadmap.

---

<div align="center">

## 🎯 Casos de Uso

</div>

<table>
<tr>
<td width="50%" valign="top">

### 🆕 Flujo de Inscripción

```mermaid
graph TD
    A[Abre la app] --> B[Selecciona modo Nuevo]
    B --> C[Permite acceso a webcam]
    C --> D[Captura foto del rostro]
    D --> E[Ingresa nombre de la persona]
    E --> F[Envía a /capture]
    F --> G[CompreFace procesa y almacena]
    G --> H[Recibe confirmación con image_id]
    H --> I[Puede agregar más rostros]
```

</td>
<td width="50%" valign="top">

### 🔍 Flujo de Reconocimiento

```mermaid
graph TD
    A[Abre la app] --> B[Selecciona modo Reconocer]
    B --> C[Permite acceso a webcam]
    C --> D[Captura foto del rostro]
    D --> E[Envía a /recognize]
    E --> F[CompreFace busca coincidencias]
    F --> G{Encontró match?}
    G -->|Sí| H[Muestra nombre y similitud]
    G -->|No| I[Indica que no se reconoció]
    H --> J[Puede intentar con otro rostro]
    I --> J
```

</td>
</tr>
</table>

---

## ⚡ Instalación y configuración

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/SchneiderSeba/CompreFaceApp.git
cd CompreFaceApp
```

### 2️⃣ Configurar variables de entorno

Crear archivo `.env` en la raíz:

```env
PORT=3000
COMPREFACE_URL=https://compreface.schneidersebastian.com
COMPREFACE_PORT=443
COMPRE_FACE_API_KEY=tu_api_key_aqui
COMPREFACE_API_KEY_ENV=COMPRE_FACE_API_KEY
CLIENT_ORIGIN=http://localhost:3000,http://localhost:5173,https://comprefacefront-production.up.railway.app
DATABASE_PATH=./data/faceapp.sqlite
ADMIN_USERNAME=admin
ADMIN_PASSWORD=una_contraseña_segura_de_12_caracteres_o_más
ADMIN_DISPLAY_NAME=Administrador
```

> En producción, configura `DATABASE_PATH` dentro de un volumen persistente (por ejemplo `/data/faceapp.sqlite`). Si cambias `ADMIN_USERNAME`, `ADMIN_PASSWORD` o `ADMIN_DISPLAY_NAME`, el administrador se actualiza en el siguiente arranque; cambiar la contraseña invalida sus sesiones existentes.

### Variables del backend en Railway

Railway no lee el archivo `.env` local. Configura estas variables en el servicio del backend:

- `ADMIN_USERNAME`: nombre de acceso del administrador.
- `ADMIN_PASSWORD`: contraseña de al menos 12 caracteres.
- `ADMIN_DISPLAY_NAME`: nombre que se muestra en la interfaz.
- `COMPRE_FACE_API_KEY`: clave del servicio de reconocimiento.
- `COMPREFACE_URL`: `https://compreface.schneidersebastian.com`.
- `COMPREFACE_PORT`: `443`.
- `CLIENT_ORIGIN`: URL pública del frontend (se pueden separar varias con comas).

Para conservar usuarios y sesiones entre despliegues, monta un volumen de Railway. La aplicación usa automáticamente `RAILWAY_VOLUME_MOUNT_PATH`; también se puede definir `DATABASE_PATH` de forma explícita, por ejemplo `/data/faceapp.sqlite`.

Si faltan las credenciales administrativas o la clave de CompreFace, el proceso permanece activo y la funcionalidad afectada responde con `503`. El endpoint `/api/health/live` comprueba únicamente que el backend esté funcionando; `/api/health` informa además el estado de CompreFace y del administrador.

Crear archivo `FrontEnd/faceApp/.env`:

```env
VITE_API_URL=http://localhost:3000
```

Crear archivo `CompreFaceDok/.env` (opcional, tiene valores por defecto):

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=facerecognition
```

### 3️⃣ Comprobar CompreFace

El despliegue principal usa el CompreFace del VPS configurado arriba. Para ejecutar un stack local alternativo:

```bash
cd CompreFaceDok
docker compose up -d
```

> ⏳ Primera ejecución puede tardar varios minutos descargando imágenes (>5GB)

### 4️⃣ Instalar y ejecutar backend

```bash
npm install
npm run dev
```

### 5️⃣ Instalar y ejecutar frontend

```bash
cd FrontEnd/faceApp
npm install
npm run dev
```

### 6️⃣ Acceder a la aplicación

<div align="center">

**🎉 ¡Listo! La aplicación estará corriendo en `http://localhost:5173`**

</div>

---

## 📝 Uso de la aplicación

1. **Permitir acceso a la cámara** cuando el navegador lo solicite
2. **Modo Nuevo**: Captura y registra rostros nuevos con nombre
3. **Modo Reconocer**: Identifica rostros previamente registrados
4. **Resultados**: Visualiza similitud, probabilidad y metadatos

---

<div align="center">

## 🚀 Roadmap - Próximas Mejoras

</div>

<table>
<tr>
<td align="center" width="33%">

### 🔔 Notificaciones
- Push notifications
- Alertas en tiempo real
- Integración con apps móviles

</td>
<td align="center" width="33%">

### 🗂️ Perfiles avanzados
- Metadatos externos
- Historial de reconocimientos
- Exportación de datos

</td>
<td align="center" width="33%">

### 🧪 Tests y QA
- Tests e2e para UI
- Cobertura de backend
- Validaciones automáticas

</td>
</tr>
<tr>
<td align="center">

### 🖼️ Mejoras de UI
- WebGL para filtros
- Animaciones fluidas
- Mejoras de accesibilidad

</td>
<td align="center">

### ⚡ Rendimiento
- Optimización de inferencias
- Caching inteligente
- Soporte GPU

</td>
<td align="center">

### 🌐 Despliegue
- Deploy one-click
- Plantillas Docker
- Integración CI/CD

</td>
</tr>
</table>

---

<div align="center">

## 🤝 Contribuciones

<img src="https://img.shields.io/badge/Contribuciones-Bienvenidas-10B981?style=for-the-badge" alt="Contribuciones"/>

</div>

¿Quieres colaborar? ¡Genial! Sigue estos pasos:

<table>
<tr>
<td align="center" width="20%">

### 1️⃣
**Fork**  
🍴 Haz fork del proyecto

</td>
<td align="center" width="20%">

### 2️⃣
**Branch**  
🌿 Crea tu rama  
`feature/NuevaFeature`

</td>
<td align="center" width="20%">

### 3️⃣
**Commit**  
💾 Guarda cambios  
`git commit -m 'Add: nueva feature'`

</td>
<td align="center" width="20%">

### 4️⃣
**Push**  
🚀 Sube tu rama  
`git push origin feature/NuevaFeature`

</td>
<td align="center" width="20%">

### 5️⃣
**PR**  
📬 Abre Pull Request

</td>
</tr>
</table>

---

## 📄 Licencia

Este proyecto está bajo licencia MIT.  
Puedes usarlo, modificarlo y distribuirlo libremente.

---

<div align="center">

## 📧 Contacto

<p align="center">
  <a href="https://github.com/SchneiderSeba" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-SchneiderSeba-181717?style=for-the-badge&logo=github" alt="GitHub"/>
  </a>
  <a href="https://github.com/SchneiderSeba/FaceApp" target="_blank">
    <img src="https://img.shields.io/badge/Repositorio-FaceApp-10B981?style=for-the-badge&logo=github" alt="Repo"/>
  </a>
</p>

**Desarrollador**: Schneider Sebastian

</div>

---

<div align="center">

### 💚 Gracias por utilizar **FaceApp**

*Hecha con dedicación para facilitar la integración de IA en proyectos reales* 🧠

<br/>

**⭐ Si te gusta el proyecto, no olvides dejar una estrella en GitHub!**

<br/>

[![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

</div>

---
