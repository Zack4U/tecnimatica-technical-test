Sistema de Monitoreo Industrial - TecnimáticaEste repositorio contiene la solución a la prueba técnica para la gestión y asignación de sensores en zonas de monitoreo industrial de una planta de producción.El sistema permite rastrear qué sensores están asignados a qué zonas de la planta, registrando metadatos cruciales de la asignación como la fecha de instalación, tipo de lectura (temperatura, presión, vibración, flujo), valor umbral para alertas y el estado actual del monitoreo (activo o pausado).🛠️ Stack TecnológicoEl proyecto está construido bajo una arquitectura moderna, escalable y de alto rendimiento:Backend: Node.js con Fastify (framework de alto rendimiento y bajo overhead) y TypeScript.ORMy Base de Datos: Drizzle ORM junto a PostgreSQL para un tipado de extremo a extremo y consultas SQL eficientes.Frontend: React (con Vite para un desarrollo ágil) y Tailwind CSS para una UI limpia y responsiva.Contenedores: Docker y Docker Compose para asegurar un entorno de ejecución local idéntico y portable.📁 Estructura del ProyectoEl repositorio está organizado de forma clara dividiendo las responsabilidades del sistema:├── backend/                # API REST construida con Fastify + TypeScript
│   ├── src/
│   │   ├── controllers/    # Controladores de las rutas del API
│   │   ├── db/             # Conexión, esquema de Drizzle y migraciones
│   │   ├── interfaces/     # Definiciones de tipos y contratos (TypeScript)
│   │   ├── routes/         # Definición de rutas y esquemas de validación
│   │   ├── services/       # Lógica de negocio reusable
│   │   └── app.ts          # Configuración e inicialización del servidor
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/               # Cliente web SPA construido con React + Vite
│   ├── src/
│   │   ├── components/     # Componentes visuales reutilizables (Tarjetas, Formularios, Modales)
│   │   ├── hooks/          # Hooks personalizados para llamadas de API y estados
│   │   ├── types/          # Interfaces compartidas para el tipado de componentes
│   │   ├── App.jsx         # Componente principal y enrutado básico/vistas
│   │   └── main.jsx
│   ├── package.json
│   └── tailwind.config.js
│
├── docker-compose.yml      # Orquestación de contenedores (App, API, DB)
├── schema.sql              # Definición de tablas en SQL puro + 10 registros semilla
├── DECISIONS.md            # Respuestas a las preguntas técnicas obligatorias
└── README.md               # Este archivo de documentación
🚀 Instrucciones de EjecuciónPara facilitar la revisión del proyecto, se ofrecen dos formas de ejecución: mediante Docker (recomendada) o de forma manual paso a paso.Requisitos PreviosDocker y Docker Compose instalados.Opcional para modo manual: Node.js (v18 o superior) y una base de datos PostgreSQL local.Método 1: Ejecución Rápida con Docker (Recomendado)Este método levantará de forma automática la base de datos PostgreSQL, ejecutará el script de migración con los datos semilla (schema.sql), iniciará el backend en Fastify y servirá el frontend de React.Clonar el repositorio:git clone [https://github.com/tu-usuario/tecnimatica-monitoreo.git](https://github.com/tu-usuario/tecnimatica-monitoreo.git)
cd tecnimatica-monitoreo
Iniciar el entorno completo:docker-compose up --build
Acceder a las aplicaciones:Frontend (React Web App): http://localhost:5173Backend (API REST): http://localhost:3000Método 2: Ejecución Manual para DesarrolloSi deseas ejecutar cada capa de manera independiente durante la fase de desarrollo, sigue estos pasos:1. Configurar la Base de DatosAsegúrate de tener un servidor PostgreSQL activo y crea una base de datos llamada tecnimatica_db. Ejecuta el archivo de la raíz schema.sql en tu gestor de base de datos para crear la estructura e insertar los datos semilla iniciales.2. Levantar el Backend (API)Navega al directorio del backend:cd backend
Instala las dependencias:npm install
Configura tus variables de entorno creando un archivo .env en la raíz de la carpeta backend:DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/tecnimatica_db
PORT=3000
HOST=0.0.0.0
Inicia el servidor de desarrollo:npm run dev
3. Levantar el Frontend (React)Abre una nueva terminal y navega al directorio del frontend:cd frontend
Instala las dependencias:npm install
Inicia el servidor de Vite:npm run dev
Abre http://localhost:5173 en tu navegador.📡 Endpoints del Backend (API REST)MétodoRutaDescripciónGET/sensorsRetorna la lista completa de sensores en la plantaGET/sensors/:id/zonesRetorna las zonas asociadas a un sensor específicoGET/zones/:id/sensorsRetorna los sensores asignados y activos en una zona específicaPOST/monitoringsAsigna un sensor a una zona (crea un nuevo registro de monitoreo)PATCH/monitorings/:idActualiza de manera parcial el umbral o el estado (activo/pausado) de un monitoreoGET/monitoringsLista todos los monitoreos (soporta filtro opcional ?status=activo o ?status=pausado)📝 Documentación de Decisiones de DiseñoPara conocer en detalle el razonamiento técnico detrás de la estructura de la base de datos, el flujo de backend y el manejo de estados en el frontend, consulta el archivo obligatorio DECISIONS.md ubicado en la raíz de este repositorio.