import { Label } from "@radix-ui/react-label";
import { useRouter } from "next/router";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";

export default function Filter({
  label,
  value,
  paramKey,
  filterItems,
  classname,
}: {
  label: string;
  value: string | number | boolean;
  paramKey: string;
  filterItems: string[] | number[];
  classname?: string;
}) {
  const router = useRouter();

  return (
    <div className={`flex w-full flex-col gap-2 ${classname}`}>
      <Label>{label}</Label>
      <Select
        defaultValue={String(value)}
        onValueChange={(value) => {
          const obj: Record<string, string | number | boolean> = {};
          obj[paramKey] = value;
          void router.push({ query: { ...router.query, ...obj, page: 1 } });
        }}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="dark z-[250] w-max max-h-72">
          {filterItems.map((year) => {
            return (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
