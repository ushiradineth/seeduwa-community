import { SearchIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@/components/Atoms/Button";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { Input } from "../Atoms/Input";

function Search(props: { search: string; path: string; params: Record<string, unknown>; count: number; placeholder: string }) {
  const router = useRouter();
  const [internalSearch, setInternalSearch] = useState<string>(props.search === "undefined" ? "" : props.search);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        let query = props.params as Record<string, string | number>;
        if (internalSearch !== "") {
          query.search = internalSearch;
          query = removeQueryParamsFromRouter(router, ["page"]) as Record<string, string | number>;
        } else {
          query = removeQueryParamsFromRouter(router, ["search", "page"]) as Record<string, string | number>;
        }

        void router.push({ href: props.path, query });
      }}
      className="my-8 flex w-full flex-col items-center justify-center">
      <div className="flex w-full items-center justify-center gap-2">
        <div className="flex h-fit w-full items-center justify-center gap-x-2 rounded-md border border-input bg-background">
          <Input
            name="search"
            className="border-0"
            defaultValue={props.search}
            placeholder={props.placeholder}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInternalSearch(e.currentTarget.value)}
            value={internalSearch}
          />
          {typeof internalSearch !== "undefined" && internalSearch !== "" && (
            <div onClick={() => setInternalSearch("")} className="mr-2 cursor-pointer">
              {<XIcon />}
            </div>
          )}
        </div>
        <Button type="submit" className="h-8">
          <SearchIcon className="h-4 w-4 text-black" />
        </Button>
      </div>
      {!(props.search === "" || typeof props.search === "undefined") && (
        <p className="mt-4 text-sm text-muted-foreground">
          Found {props.count} result{props.count === 1 ? "" : "s"} for &quot;{props.search}&quot;
        </p>
      )}
    </form>
  );
}

export default Search;
