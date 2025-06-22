import { OrderSearchButton } from "@/components/order-search-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import Form from "next/form";

export function SearchForm({ query }: { query: string | null }) {
  return (
    <Form action={"/orders"}>
      <div className="relative flex items-center gap-2">
        <Label htmlFor="search" className="sr-only">
          Search
        </Label>
        <Input
          id="search"
          placeholder="Type to search..."
          className="h-8 pl-7"
          name="query"
          defaultValue={query ?? ""}
        />
        <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
        <OrderSearchButton />
      </div>
    </Form>
  );
}
