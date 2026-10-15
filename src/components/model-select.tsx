"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { shortModel } from "@/lib/format";

export function ModelSelect({ models, value }: { models: string[]; value: string | null }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <select
      aria-label="Model"
      className="num h-8 max-w-56 rounded-md border border-line bg-card px-2 text-xs"
      value={value ?? ""}
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value) next.set("model", e.target.value);
        else next.delete("model");
        router.push(`/?${next}`);
      }}
    >
      <option value="">All models</option>
      {models.map((m) => (
        <option key={m} value={m}>
          {shortModel(m)}
        </option>
      ))}
    </select>
  );
}
