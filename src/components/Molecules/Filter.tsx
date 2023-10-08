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
    <div className={`flex flex-col gap-2 ${classname}`}>
      <Label>{label}</Label>
      <Select
        defaultValue={String(value)}
        onValueChange={(value) => {
          const obj: Record<string, string | number | boolean> = {};
          obj[paramKey] = value;
          void router.push({ query: { ...router.query, ...obj } });
        }}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="dark z-[250] w-max">
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
