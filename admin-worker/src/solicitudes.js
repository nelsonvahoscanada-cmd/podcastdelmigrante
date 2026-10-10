/*
  solicitudes.js — Solicitudes del Directorio Empresarial (panel privado)
  ======================================================================
  Lee y actualiza la base D1 «podcastdelmigrante-directorio» (binding
  DIRECTORIO_DB) y sirve las imágenes privadas del bucket R2 (binding
  SOLICITUDES). Todo pasa por Cloudflare Access + verificación del JWT en
  src/index.js antes de llegar aquí.

  Flujo de estados (nunca se publica nada automáticamente):
    pendiente → en_revision → aprobada → publicada
                       ↘ rechazada / duplicada
    · «aprobada» exige que el empresario haya aprobado la vista previa.
    · «publicada» exige el BIZ-id y el slug del perfil ya publicado (el
      perfil se publica con un Pull Request: ver «Preparar publicación»).
*/
import { categoryLabel, CATEGORIES, REQUEST_ID_RE, IMAGE_KINDS } from "../../js/directorio/solicitud-core.js";

export const STATUSES = ["pendiente", "en_revision", "aprobada", "publicada", "rechazada", "duplicada"];
const TRANSITIONS = {
  pendiente: ["en_revision", "rechazada", "duplicada"],
  en_revision: ["pendiente", "aprobada", "rechazada", "duplicada"],
  aprobada: ["en_revision", "publicada", "rechazada"],
  publicada: [],
  rechazada: ["en_revision"],
  duplicada: ["en_revision"],
};

const PUBLIC_COLUMNS = `id, created_at, updated_at, status, name, category, category_other, city, province, representative, title, summary,
  email, phone, whatsapp, website, address, instagram, facebook, tiktok, linkedin, image_kind, image_type, image_bytes, image_width, image_height,
  consent_version, consent_at, internal_email_status, confirmation_email_status, email_error, reviewed_by, reviewed_at, review_notes,
  owner_approved, business_id, business_slug`;

export async function listApplications(db, status) {
  const where = STATUSES.includes(status) ? "WHERE status = ?" : "";
  const stmt = db.prepare(
    `SELECT id, created_at, status, name, category, category_other, city, province, image_kind, internal_email_status, confirmation_email_status
     FROM business_applications ${where} ORDER BY created_at DESC LIMIT 200`
  );
  const { results } = await (where ? stmt.bind(status) : stmt).all();
  const counts = await db.prepare("SELECT status, COUNT(*) AS n FROM business_applications GROUP BY status").all();
  return {
    applications: results.map((r) => Object.assign(r, { category_label: categoryLabel({ category: r.category, categoryOther: r.category_other }) })),
    counts: Object.fromEntries(counts.results.map((c) => [c.status, c.n])),
  };
}

export async function getApplication(db, id) {
  if (!REQUEST_ID_RE.test(id || "")) return null;
  const row = await db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM business_applications WHERE id = ?`).bind(id).first();
  if (!row) return null;
  row.category_label = categoryLabel({ category: row.category, categoryOther: row.category_other });
  row.transitions = TRANSITIONS[row.status] || [];
  return row;
}

export async function applicationImage(env, id) {
  if (!REQUEST_ID_RE.test(id || "")) return null;
  const row = await env.DIRECTORIO_DB.prepare("SELECT image_key, image_type FROM business_applications WHERE id = ?").bind(id).first();
  if (!row) return null;
  const obj = await env.SOLICITUDES.get(row.image_key);
  if (!obj) return null;
  return new Response(obj.body, {
    headers: {
      "Content-Type": row.image_type,
      "Content-Disposition": `inline; filename="${id}.${row.image_type.split("/")[1].replace("jpeg", "jpg")}"`,
    },
  });
}

/* Cambia el estado aplicando las reglas. Devuelve { ok, row } o { ok:false, error } */
export async function updateApplication(db, id, input, identity) {
  const row = await getApplication(db, id);
  if (!row) return { ok: false, status: 404, error: "Solicitud no encontrada" };
  const next = String(input.status || row.status);
  const notes = String(input.notes == null ? row.review_notes || "" : input.notes).slice(0, 2000);
  const ownerApproved = input.ownerApproved == null ? row.owner_approved : input.ownerApproved ? 1 : 0;
  const businessId = String(input.businessId == null ? row.business_id || "" : input.businessId).trim();
  const businessSlug = String(input.businessSlug == null ? row.business_slug || "" : input.businessSlug).trim();

  if (!STATUSES.includes(next)) return { ok: false, status: 400, error: "Estado no válido" };
  if (next !== row.status && !TRANSITIONS[row.status].includes(next)) {
    return { ok: false, status: 409, error: `No se puede pasar de «${row.status}» a «${next}».` };
  }
  if (next === "aprobada" && !ownerApproved) {
    return { ok: false, status: 409, error: "Antes de aprobar, marca que el empresario aprobó la vista previa del perfil." };
  }
  if (next === "publicada") {
    if (!/^BIZ-\d{3,6}$/.test(businessId) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(businessSlug)) {
      return { ok: false, status: 409, error: "Para marcar como publicada indica el BIZ-id y el slug del perfil ya publicado." };
    }
  }
  /* Qué cambia (para el historial). Sin cambios no se escribe nada. */
  const changes = [];
  if (ownerApproved !== row.owner_approved) changes.push(`Aprobación del empresario: ${ownerApproved ? "sí" : "no"}`);
  if (businessId !== (row.business_id || "")) changes.push(`BIZ-id: ${businessId || "—"}`);
  if (businessSlug !== (row.business_slug || "")) changes.push(`Slug: ${businessSlug || "—"}`);
  if (notes !== (row.review_notes || "")) changes.push(notes ? `Notas: ${notes.slice(0, 300)}` : "Notas borradas");
  const statusChanged = next !== row.status;
  if (!statusChanged && !changes.length) return { ok: true, row };

  /* Cambio + historial en una sola transacción (todo o nada). */
  const now = new Date().toISOString();
  try {
    await db.batch([
      db
        .prepare(
          `UPDATE business_applications SET status = ?, review_notes = ?, owner_approved = ?, business_id = ?, business_slug = ?,
            reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?`
        )
        .bind(next, notes || null, ownerApproved, businessId || null, businessSlug || null, identity.email, now, now, id),
      db
        .prepare("INSERT INTO application_events (application_id, at, actor, action, from_status, to_status, detail) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(id, now, identity.email, statusChanged ? "estado" : "revision", row.status, next, changes.join(" · ") || null),
    ]);
  } catch (e) {
    console.error("No se pudo guardar la revisión", id, e && e.message);
    return /application_events/.test(String(e && e.message))
      ? { ok: false, status: 503, error: "Falta aplicar la migración db/directorio/0002_historial.sql en D1. No se guardó ningún cambio." }
      : { ok: false, status: 500, error: "No se pudo guardar el cambio. No se modificó la solicitud." };
  }
  return { ok: true, row: await getApplication(db, id) };
}

/* Historial de la solicitud, del más reciente al más antiguo. Devuelve null
   si la tabla aún no existe (migración 0002 sin aplicar). */
export async function applicationHistory(db, id) {
  if (!REQUEST_ID_RE.test(id || "")) return [];
  try {
    const { results } = await db
      .prepare("SELECT at, actor, action, from_status, to_status, detail FROM application_events WHERE application_id = ? ORDER BY id DESC LIMIT 200")
      .bind(id)
      .all();
    return results;
  } catch (e) {
    return null;
  }
}

/* ---------- Paquete de publicación (para el Pull Request) ---------- */
export function slugify(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { givenName: parts[0] || "", familyName: parts[0] || "" };
  return { givenName: parts[0], familyName: parts.slice(1).join(" ") };
}

/* Ficha de texto para pegar en js/businesses.js dentro de un Pull Request:
   el perfil solo aparece en el sitio cuando ese PR se fusiona (el panel no
   escribe en el sitio ni en GitHub). El correo privado NUNCA se incluye. */
export function publicationPackage(row) {
  const isPerson = row.image_kind === "foto" && row.representative && row.representative.toLowerCase() !== row.name.toLowerCase();
  const name = isPerson ? row.representative : row.name;
  const company = isPerson ? row.name : "";
  const slug = slugify(name);
  const ext = row.image_type === "image/png" ? "png" : row.image_type === "image/webp" ? "webp" : "jpg";
  const imagePath = `assets/directorio/perfiles/${slug}.${ext}`;
  const known = CATEGORIES.some((c) => c.id === row.category && c.id !== "otra");
  const label = row.title || categoryLabel({ category: row.category, categoryOther: row.category_other });
  const j = JSON.stringify;
  const I = "    ";
  const lines = [
    `  /* ${row.id} — aprobada por el empresario. Revisar antes de publicar. */`,
    "  {",
    `${I}id: "BIZ-000",                 /* asignar el siguiente número */`,
    `${I}slug: ${j(slug)},`,
    `${I}published: true,`,
    `${I}featured: false,`,
    `${I}foundingProfile: false,`,
    "",
    `${I}name: ${j(name)},`,
    `${I}shortName: ${j(name.split(/\s+/)[0])},`,
    `${I}professionalTitle: ${j(row.title || "")},`,
    `${I}company: ${j(company)},`,
    `${I}category: ${j(known ? row.category : "")},${known ? "" : `   /* categoría nueva: ${j(row.category_other || "")} → crearla en BUSINESS_CATEGORIES */`}`,
    "",
    `${I}city: ${j(row.city)},`,
    `${I}province: ${j(row.province)},`,
    `${I}country: "Canadá",`,
    `${I}address: ${j(row.address || "")},`,
    `${I}postalCode: "",`,
    `${I}mapUrl: "",`,
    "",
    `${I}languages: [],`,
    `${I}shortDescription: ${j(row.summary)},`,
    `${I}longDescription: ${j(row.summary)},`,
    `${I}services: [],`,
    "",
    `${I}phone: ${j(row.phone || "")},`,
    `${I}whatsapp: ${j(row.whatsapp || "")},`,
    `${I}email: "",                     /* el correo de la solicitud es PRIVADO */`,
    `${I}website: ${j(row.website || "")},`,
    `${I}inventoryUrl: "",`,
    `${I}bookingUrl: "",`,
    "",
    `${I}instagram: ${j(row.instagram || "")},`,
    `${I}tiktok: ${j(row.tiktok || "")},`,
    `${I}facebook: ${j(row.facebook || "")},`,
    `${I}linkedin: ${j(row.linkedin || "")},`,
    "",
    `${I}youtubeVideoId: "",`,
    `${I}profileImage: ${j(imagePath)},`,
    `${I}profileImageKind: ${j(row.image_kind === "logo" ? "logo" : "foto")},`,
    `${I}ogImage: ${j(imagePath)},`,
    `${I}coverImage: "",`,
    `${I}gallery: [],`,
    `${I}hours: [],`,
    `${I}testimonials: [],`,
    "",
    `${I}connect: {`,
    `${I}  profileQr: true,`,
    `${I}  contactCard: ${j(splitName(row.representative))},`,
    `${I}},`,
    "",
    `${I}seo: {`,
    `${I}  title: ${j(`${name} | ${label} en ${row.city} | El Podcast del Migrante`)},`,
    `${I}  description: ${j(row.summary.replace(/\s+/g, " ").slice(0, 160))},`,
    `${I}},`,
    "  },",
  ];
  return {
    id: row.id,
    slug,
    imageFile: imagePath,
    imageKind: IMAGE_KINDS[row.image_kind],
    entry: lines.join("\n"),
    steps: [
      `Descargar la imagen y guardarla como ${imagePath}.`,
      "Pegar la ficha al final de BUSINESSES en js/businesses.js y asignar el siguiente BIZ-id.",
      "Ejecutar: node scripts/build-profile-pages.mjs && python3 scripts/build-qr-images.py",
      "Abrir el Pull Request, revisar la vista previa del despliegue y fusionar.",
      "Marcar la solicitud como «publicada» con el BIZ-id y el slug.",
    ],
  };
}
