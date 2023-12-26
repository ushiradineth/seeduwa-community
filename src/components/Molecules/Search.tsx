import { SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@/components/Atoms/Button";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { Input } from "../Atoms/Input";

function Search({
  count,
  path,
  params,
  placeholder,
  search,
  classname,
}: {
  classname?: string;
  search: string;
  path: string;
  params: Record<string, unknown>;
  count: number;
  placeholder: string;
}) {
  const router = useRouter();
  const [internalSearch, setInternalSearch] = useState<string>(search === "undefined" ? "" : typeof search === "undefined" ? "" : search);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        let query = params as Record<string, string | number>;
        if (internalSearch !== "") {
          query.search = internalSearch.trim();
          query = removeQueryParamsFromRouter(router, ["page"]) as Record<string, string | number>;
        } else {
          query = removeQueryParamsFromRouter(router, ["search", "page"]) as Record<string, string | number>;
        }

        void router.push({ href: path, query });
      }}
      className={`flex w-full flex-col items-center justify-center ${classname}`}>
      <div className="flex w-full items-center justify-center gap-2">
        <div className="flex h-fit w-full items-center justify-center gap-x-2 rounded-md border border-input bg-background">
          <Input
            name="search"
            className="border-0"
            defaultValue={search}
            placeholder={placeholder}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInternalSearch(e.currentTarget.value)}
            value={internalSearch}
          />
          {typeof internalSearch !== "undefined" && internalSearch !== "" && (
            <div
              onClick={() => {
                setInternalSearch("");
                void router.push({ href: path, query: removeQueryParamsFromRouter(router, ["search", "page"]) });
              }}
              className="mr-2 cursor-pointer">
              {<XIcon />}
            </div>
          )}
        </div>
        <Button type="submit" className="h-8">
          <SearchIcon className="h-4 w-4 text-black" />
        </Button>
      </div>
      {!(search === "" || typeof search === "undefined") && (
        <p className="mt-4 text-sm text-muted-foreground">
          Found {count} result{count === 1 ? "" : "s"} for &quot;{search}&quot;
        </p>
      )}
    </form>
  );
}

export default Search;
