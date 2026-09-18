import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function Home() {
  const jar = await cookies();
  const hasToken = jar.get("ravaa_token")?.value || jar.get("token")?.value;
  if (hasToken) redirect("/notes");
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0A0A0A] text-white">
      <h1 className="text-3xl font-bold">Ravaa Notes</h1>
      <p className="text-zinc-400 mt-2">Personal notes — one Ravaa account</p>
      <div className="mt-6">
        <a href="/login" className="px-6 py-3 bg-blue-600 rounded-xl hover:bg-blue-700 font-medium">Masuk untuk mulai</a>
      </div>
    </div>
  );
}
