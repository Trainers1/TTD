import { cookies } from "next/headers";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "ttd-secret-key-change-in-production";
const COOKIE_NAME = "ttd_admin_session";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey);
}

async function isAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const expected = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update("ttd-admin-authenticated")
    .digest("hex");
  return token === expected;
}

export async function POST(request) {
  if (!(await isAuthenticated())) {
    return Response.json({ success: false, message: "인증이 필요합니다." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return Response.json({ success: false, message: "Supabase가 설정되지 않았습니다." }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return Response.json({ success: false, message: "파일이 없습니다." }, { status: 400 });
    }

    const ext = file.name.split(".").pop().toLowerCase();
    const imageExts = ["jpg", "jpeg", "png", "gif", "webp"];
    const videoExts = ["mp4", "webm", "mov"];
    const allowed = [...imageExts, ...videoExts];
    if (!allowed.includes(ext)) {
      return Response.json(
        { success: false, message: "jpg, png, gif, webp, mp4, webm, mov 파일만 업로드 가능합니다." },
        { status: 400 }
      );
    }
    const mediaType = videoExts.includes(ext) ? "video" : "image";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const filePath = `admin/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("images")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return Response.json({ success: false, message: "업로드에 실패했습니다." }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    return Response.json({ success: true, url: urlData.publicUrl, mediaType });
  } catch (err) {
    console.error("Upload error:", err);
    return Response.json({ success: false, message: "업로드에 실패했습니다." }, { status: 500 });
  }
}
