import studios from "../src/Data/studios.json" with { type: "json" };

for (const studio of studios) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(studio.image, { signal: controller.signal });
    clearTimeout(timer);
    console.log(`${studio._id} ${res.status} ${res.headers.get("content-type")} ${studio.image}`);
    await res.body?.cancel();
  } catch (error) {
    console.log(`${studio._id} ERROR ${error.message} ${studio.image}`);
  }
}
