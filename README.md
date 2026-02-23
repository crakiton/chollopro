# CholloPro Personal 🔥🤖

CholloPro es una herramienta personal que extrae chollos de Wallapop cada 15 minutos, los evalúa utilizando Inteligencia Artificial (Gemini 1.5 Flash-Lite) y los muestra en un dashboard moderno. Todo usando servicios 100% gratuitos.

## Arquitectura del Proyecto

- **Backend (Scraper)**: Escrito en Python 3.11. Utiliza `wallapy` para interactuar con Wallapop de forma indirecta. Corre como un **cron job en GitHub Actions** cada 15 minutos.
- **Base de Datos**: **Supabase** (PostgreSQL) almacena los chollos y las configuraciones de búsqueda dinámicas.
- **Frontend (Dashboard)**: **React, Vite y Tailwind CSS**. Lee la base de datos de Supabase y te permite modificar los ajustes (ej: precio, ciudad) dinámicamente. Alojado gratis en **Vercel**.
- **Alertas**: Te avisa a través de **Telegram** por cada chollo nuevo y su puntuación de la IA.

---

## 🚀 Guía de Instalación Paso a Paso

Sigue estos pasos cuidadosamente para poner a funcionar tu proyecto.

### Paso 1: Configurar Supabase (Base de Datos)
1. Ve a [Supabase](https://supabase.com/) y crea una cuenta/proyecto nuevo (es gratis).
2. Entra al editor SQL en el dashboard de Supabase (menú lateral izquierdo).
3. Copia el contenido del archivo `supabase/schema.sql` que se encuentra en este repositorio y ejecútalo. Esto creará las tablas `deals` y `config`.
4. Ve a **Project Settings -> API** para obtener:
   - **URL del proyecto** (SUPABASE_URL)
   - **anon / public key** (SUPABASE_KEY)

### Paso 2: Crear el bot de Telegram
1. Abre Telegram y busca a **@BotFather**.
2. Escribe `/newbot` y sigue los pasos para darle nombre a tu bot.
3. Copia el **Token del Bot** (TELEGRAM_BOT_TOKEN).
4. Crea un **Canal de Telegram** (o grupo) e invita a tu nuevo bot como **Administrador**.
5. Escribe algo en ese canal.
6. Ve a la URL `https://api.telegram.org/bot<TU_BOT_TOKEN>/getUpdates` y busca el `id` numérico del `chat` (puede empezar por `-100...`). Ese será tu **TELEGRAM_CHANNEL_ID**.

### Paso 3: Obtener Api Key de Gemini AI
1. Ve a [Google AI Studio](https://aistudio.google.com/).
2. Inicia sesión y haz clic en "Get API key".
3. Crea una API key para un proyecto nuevo y cópiala (GEMINI_API_KEY).

### Paso 4: Desplegar en GitHub Actions (El Scraper)
1. Sube este código a tu propio repositorio de GitHub (debe ser privado).
2. Ve a la pestaña **Settings > Secrets and variables > Actions**.
3. Haz clic en **New repository secret** y añade todas estas variables una a una (puedes dejarlas sin valor por defecto si vas a usar el Dashboard para configurarlo, pero la KEY es esencial):
   - `SUPABASE_URL` (Tu URL de Supabase del Paso 1)
   - `SUPABASE_KEY` (Tu clave anónima de Supabase del Paso 1)
   - `GEMINI_API_KEY` (Tu clave de Google AI del Paso 3)
   - `TELEGRAM_BOT_TOKEN` (Del Paso 2)
   - `TELEGRAM_CHANNEL_ID` (Del Paso 2)
   - Opcionales de backup: `SEARCH_KEYWORD`, `SEARCH_CATEGORY`, `MAX_PRICE`, `MIN_PRICE`, `LOCATION_MODE` (shipping/city_radius), `CITY`, `RADIUS_KM`, `MIN_SCORE`.
4. El scraper correrá automáticamente cada 15 minutos (o puedes lanzarlo manualmente desde la pestaña **Actions**).

### Paso 5: Desplegar Frontend en Vercel
1. Ve a [Vercel](https://vercel.com/) y crea una cuenta.
2. Inicia un nuevo proyecto y conéctalo a tu repositorio de GitHub.
3. Al configurar el despliegue de Vercel:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - Expande "Environment Variables" y añade:
     - `VITE_SUPABASE_URL` = (Tu URL de Supabase)
     - `VITE_SUPABASE_ANON_KEY` = (Tu clave de Supabase)
4. Dale a **Deploy**. En un minuto tendrás una URL pública para acceder a tu CholloPro Dashboard.

---

## 🛠️ Uso
Entra a la URL de Vercel que has creado. Puedes usar el botón **Ajustes** para cambiar los parámetros del robot. Cuando los guardes, el siguiente `cron job` de GitHub Actions los leerá y buscará acordemente. 

Si el IA encuentra un chollo igual o superior a tu "Score Min", ¡lo guardará en el Dashboard y te enviará un Telegram!

*Elaborado para automatización de chollos sin coste monetario.*
