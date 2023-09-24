import { SearchIcon } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@/components/Atoms/Button";
import { removeQueryParamsFromRouter } from "@/lib/utils";
import { Input } from "../Atoms/Input";

function Search(props: { search: string; path: string; params: Record<string, unknown>; count: number; placeholder: string }) {
  const router = useRouter();
  const [intenalSearch, setIntenalSearch] = useState<string>(props.search === "undefined" ? "" : props.search);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        let query = props.params as Record<string, string | number>;
        if (intenalSearch !== "") {
          query.search = intenalSearch;
          query = removeQueryParamsFromRouter(router, ["page"]) as Record<string, string | number>;
        } else {
          query = removeQueryParamsFromRouter(router, ["search", "page"]) as Record<string, string | number>;
        }

        void router.push({ href: props.path, query });
      }}
      className="my-8 flex w-full flex-col items-center justify-center">
      <div className="flex w-full items-center justify-center gap-2">
        <Input
          name="search"
          className="h-"
          defaultValue={props.search}
          placeholder={props.placeholder}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIntenalSearch(e.currentTarget.value)}
        />
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
