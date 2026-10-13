"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { SearchInput } from "@/components/search/SearchInput";
import { buttonClass } from "@/components/ui/styles";
import { exploreHref } from "@/lib/catalog/query";

/** A real GET form to /explore: it works without JavaScript and is enhanced with it. */
export function HomeSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(exploreHref({ q: value.trim() }));
  }

  return (
    <form action="/explore" method="get" role="search" onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <SearchInput value={value} onChange={setValue} size="lg" className="flex-1" />
      <button type="submit" className={buttonClass("primary", "lg", "h-12")}>
        Search setups
      </button>
    </form>
  );
}
