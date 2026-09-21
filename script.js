const SUPABASE_URL = "https://mlagnpmvvzylbuzrwfiy.supabase.co";
const SUPABASE_KEY = "sb_publishable_a5RH6hlBT6C6GkBn8T0pEg_lhqWkx0p";
const BUCKET = "user-files";
const { createClient } = window.supabase;
const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("PEGA_AQUI") && !SUPABASE_KEY.includes("PEGA_AQUI");
const supabaseClient = configured ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const LOCAL_USERS_KEY = "mi-espacio-usuarios";

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const authForm = document.getElementById("authForm");
const authButton = document.getElementById("authButton");
const authMessage = document.getElementById("authMessage");
const toggleAuth = document.getElementById("toggleAuth");
let registering = false;

function identityFor(username) {
    return `${username.trim().toLowerCase()}@mi-espacio.invalid`;
}

function validUsername(username) {
    return /^[a-z0-9._-]{3,30}$/.test(username);
}

async function hashPassword(password) {
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function localUsers() {
    const saved = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || "null");
    if (saved) return saved;
    const users = { demo: await hashPassword("demo123") };
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    return users;
}

async function localAuth(username, password) {
    const users = await localUsers();
    const passwordHash = await hashPassword(password);
    if (registering) {
        if (users[username]) return { error: true };
        users[username] = passwordHash;
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        return { user: { id: `local-${username}`, user_metadata: { username } } };
    }
    return users[username] === passwordHash
        ? { user: { id: `local-${username}`, user_metadata: { username } } }
        : { error: true };
}

function showMessage(message, error = true) {
    authMessage.textContent = message;
    authMessage.className = `form-message${error ? " error" : ""}`;
}

async function enterApp(user) {
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    document.getElementById("userLabel").textContent = user.user_metadata?.username || "tu espacio";
    await mostrarArchivos(user.id);
}

authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    if (!validUsername(username)) {
        showMessage("El usuario debe tener entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.");
        return;
    }
    authButton.disabled = true;
    showMessage("Comprobando acceso...", false);

    let result;
    try {
        result = configured
            ? (registering
                ? await supabaseClient.auth.signUp({ email: identityFor(username), password, options: { data: { username } } })
                : await supabaseClient.auth.signInWithPassword({ email: identityFor(username), password }))
            : await localAuth(username, password);
    } catch {
        result = { error: true };
    }

    authButton.disabled = false;
    if (result.error) {
        const errorMessage = result.error.message || "";
        if (registering && (result.error.code === "over_email_send_rate_limit" || errorMessage.toLowerCase().includes("email rate limit"))) {
            showMessage("Supabase está limitando los registros porque la confirmación por correo está activa. Desactiva Confirm email en Authentication y vuelve a intentarlo.");
        } else {
            showMessage(registering ? "No se pudo crear la cuenta." : "Usuario o contraseña incorrectos.");
        }
        return;
    }
    if (!configured) {
        showMessage("Acceso local correcto. Conecta Supabase para usar tus archivos online.", false);
        await enterApp(result.user);
        return;
    }
    if (registering && !result.data.session) {
        showMessage("Cuenta creada. Desactiva la confirmación de correo en Supabase para entrar directamente.", false);
        return;
    }
    showMessage("");
    await enterApp(result.data.user);
});

toggleAuth.addEventListener("click", () => {
    registering = !registering;
    authButton.textContent = registering ? "Crear cuenta" : "Iniciar sesión";
    toggleAuth.textContent = registering ? "Ya tengo una cuenta" : "Crear una cuenta nueva";
    document.getElementById("password").autocomplete = registering ? "new-password" : "current-password";
    showMessage("");
});

document.getElementById("logoutButton").addEventListener("click", async () => {
    if (supabaseClient) await supabaseClient.auth.signOut();
    appView.classList.add("hidden");
    authView.classList.remove("hidden");
    authForm.reset();
});

async function guardarArchivos(files, userId) {
    for (const file of files) {
        const path = `${userId}/${crypto.randomUUID()}-${file.name}`;
        const { error } = await supabaseClient.storage.from(BUCKET).upload(path, file);
        if (error) throw error;
    }
    await mostrarArchivos(userId);
}

async function borrarArchivo(path, userId) {
    if (!window.confirm("¿Quieres borrar este archivo? Esta acción no se puede deshacer.")) return;

    const { error } = await supabaseClient.storage.from(BUCKET).remove([path]);
    if (error) {
        alert("No se pudo borrar el archivo.");
        return;
    }
    await mostrarArchivos(userId);
}

async function mostrarArchivos(userId) {
    const lista = document.getElementById("fileList");
    if (!supabaseClient) {
        document.getElementById("count").textContent = "0 archivos";
        lista.innerHTML = '<div class="empty">Conecta Supabase para guardar archivos online.</div>';
        return;
    }
    const { data: archivos, error } = await supabaseClient.storage.from(BUCKET).list(userId, { sortBy: { column: "created_at", order: "desc" } });
    if (error) {
        lista.innerHTML = '<div class="empty">No se pudo cargar el archivo online.</div>';
        return;
    }
    const validFiles = archivos.filter((file) => file.name !== ".emptyFolderPlaceholder");
    document.getElementById("count").textContent = `${validFiles.length} archivo${validFiles.length === 1 ? "" : "s"}`;
    lista.innerHTML = validFiles.length ? "" : '<div class="empty">Todavía no has guardado ningún archivo.</div>';
    for (const archivo of validFiles) {
        const { data } = await supabaseClient.storage.from(BUCKET).createSignedUrl(`${userId}/${archivo.name}`, 300);
        const elemento = document.createElement("div");
        elemento.className = "file";
        const texto = document.createElement("span");
        texto.textContent = archivo.name.replace(/^[a-f0-9-]+-/, "");
        const enlace = document.createElement("a");
        enlace.textContent = "Descargar";
        enlace.className = "button";
        enlace.href = data?.signedUrl || "#";
        enlace.target = "_blank";
        enlace.rel = "noopener";
        const borrar = document.createElement("button");
        borrar.type = "button";
        borrar.textContent = "Borrar";
        borrar.className = "danger";
        borrar.addEventListener("click", () => borrarArchivo(`${userId}/${archivo.name}`, userId));
        elemento.append(texto, enlace, borrar);
        lista.appendChild(elemento);
    }
}

const input = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
input.addEventListener("change", async () => {
    if (!supabaseClient) {
        alert("Conecta Supabase para guardar archivos online.");
        input.value = "";
        return;
    }
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || !input.files.length) return;
    try { await guardarArchivos(input.files, user.id); } catch { alert("No se pudo guardar el archivo online."); }
    input.value = "";
});
dropZone.addEventListener("dragover", (event) => { event.preventDefault(); dropZone.classList.add("dragover"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
    if (!supabaseClient) {
        alert("Conecta Supabase para guardar archivos online.");
        return;
    }
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user || !event.dataTransfer.files.length) return;
    try { await guardarArchivos(event.dataTransfer.files, user.id); } catch { alert("No se pudo guardar el archivo online."); }
});

if (supabaseClient) {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
        if (session) enterApp(session.user);
    });
}