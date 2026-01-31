# Pong Arena (Replit)

Proyecto completo de Pong con autenticación, sesiones, SQLite y leaderboard.

## Requisitos
- Node.js 18+

## Cómo correr en Replit
1. Abre este repo en Replit.
2. En la consola ejecuta:
   ```bash
   npm install
   npm start
   ```
3. Replit abrirá el servidor en el puerto asignado.

## Scripts
- `npm start`: inicia el servidor en producción.
- `npm run dev`: inicia con nodemon.

## Estructura
- `server.js`: servidor Express y rutas API.
- `db.js`: inicialización de SQLite.
- `middleware/`: auth y rate limit.
- `public/`: frontend (HTML/CSS/JS).

## Notas
- La base de datos se crea automáticamente en `data.sqlite`.
- El juego permite jugar como invitado (sin guardar puntajes) o con login para guardar resultados.
