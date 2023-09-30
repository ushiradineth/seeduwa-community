/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import Link from "next/link";

function PageNumbers(props: { pageNumber: number; count: number; itemsPerPage: number; path: string; params: Record<string, unknown> }) {
  const pageCount = Math.ceil(props.count / props.itemsPerPage);
  const startPage = Math.max(1, props.pageNumber - 5);
  const endPage = Math.min(pageCount + 1, props.pageNumber + 5);

  return (
    <div className="flex select-none justify-center">
      <div className="flex items-center justify-center">
        {props.pageNumber > 1 ? (
          <>
            <Link href={{ href: props.path, query: { ...props.params, page: 1 } }}>
              <ChevronsLeft className="hover:text-white" />
            </Link>
            <Link href={{ href: props.path, query: { ...props.params, page: props.pageNumber - 1 } }}>
              <ChevronLeft className="hover:text-white" size={20} />
            </Link>
          </>
        ) : (
          <p className="w-6"></p>
        )}

        {Array.from(new Array(endPage - startPage), (x, i) => i + startPage).map((page) => (
          <Link
            href={{ href: props.path, query: { ...props.params, page } }}
            style={{ color: props.pageNumber === page ? "white" : "gray" }}
            className="mx-2"
            key={page}>
            {page}
          </Link>
        ))}

        {props.pageNumber < Math.ceil(props.count / props.itemsPerPage) ? (
          <>
            <Link href={{ href: props.path, query: { ...props.params, page: props.pageNumber + 1 } }}>
              <ChevronRight className="hover:text-white" size={20} />
            </Link>
            <Link href={{ href: props.path, query: { ...props.params, page: pageCount } }}>
              <ChevronsRight className="hover:text-white" />
            </Link>
          </>
        ) : (
          <p className="w-6"></p>
        )}
      </div>
    </div>
  );
}

export default PageNumbers;
