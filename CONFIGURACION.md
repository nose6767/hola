# Configuracion online

La aplicacion usa Supabase para las cuentas y los archivos privados.

Mientras Supabase no este configurado, puedes probar la navegacion con `demo` y `demo123`. Las cuentas creadas en este modo se guardan localmente como hashes y sirven solo para la prueba del formulario.

## 1. Crear el proyecto

1. Crea un proyecto en https://supabase.com.
2. En **Authentication > Providers**, deja habilitado **Email**.
3. Desactiva **Confirm email** si quieres que el usuario entre inmediatamente despues de registrarse. No se usa correo visible: el nombre de usuario se transforma internamente en una identidad tecnica.

## 2. Preparar los archivos

1. Abre **SQL Editor** en Supabase.
2. Copia y ejecuta todo el contenido de `supabase-setup.sql`.
3. En `script.js`, sustituye `SUPABASE_URL` por la URL del proyecto.
4. Sustituye `SUPABASE_KEY` por la clave publica `anon` del proyecto. Nunca pegues aqui la clave `service_role`.

## 3. Publicar

Publica `index.html`, `script.js` y `styles.css` en un hosting estatico como GitHub Pages, Netlify o Vercel. La aplicacion necesita HTTPS para que el almacenamiento y la sesion funcionen correctamente.

Cada cuenta guarda sus archivos en una carpeta propia y las politicas de Storage impiden que otra cuenta los pueda listar o descargar.
