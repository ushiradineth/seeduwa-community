import React, { useCallback, useEffect, useRef, useState } from "react";

import useWindowDimensions from "@/hooks/useWindowDimensions";

type Props = {
  children: React.ReactNode[];
  autoScroll?: boolean;
  navButtons?: boolean;
  indicators?: boolean;
  delay?: number;
  activeIndex?: number;
};

export default function Carousel({ children, activeIndex: activeIndexProp = 0, indicators }: Props) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(activeIndexProp);

  useEffect(() => {
    gridRef.current && gridRef.current.children[0] instanceof HTMLElement && setWidth(gridRef.current.children[0].offsetWidth);
  }, [windowWidth]);

  // const handleScrollRight = useCallback(() => {
  //   if (gridRef.current) {
  //     if (gridRef.current.scrollLeft + 48 + width > gridRef.current.scrollWidth) {
  //       gridRef.current.scrollTo({
  //         left: 0,
  //         behavior: "smooth",
  //       });
  //     } else {
  //       gridRef.current.scrollTo({
  //         left: gridRef.current.scrollLeft + width,
  //         behavior: "smooth",
  //       });
  //     }
  //   }
  // }, [width]);

  // const handleScrollLeft = useCallback(() => {
  //   if (gridRef.current) {
  //     if (gridRef.current.scrollLeft === 0) {
  //       gridRef.current.scrollTo({
  //         left: gridRef.current.scrollWidth,
  //         behavior: "smooth",
  //       });
  //     } else {
  //       gridRef.current.scrollTo({
  //         left: gridRef.current.scrollLeft - width,
  //         behavior: "smooth",
  //       });
  //     }
  //   }
  // }, [width]);

  const scrollTo = useCallback(
    (to: number, behavior: ScrollBehavior = "smooth") => {
      if (gridRef.current && gridRef.current.children[0] instanceof HTMLElement) {
        gridRef.current.scrollTo({
          left: width * to,
          behavior,
        });
      }
    },
    [width],
  );

  useEffect(() => {
    activeIndexProp !== 0 && scrollTo(activeIndexProp, "instant");
  }, [activeIndexProp, scrollTo]);

  const Indicators = useCallback(() => {
    return (
      <div className="absolute bottom-2 left-0 right-0 hidden justify-center gap-2 group-hover:flex">
        {children.map((_, index) => {
          return (
            <button
              key={index}
              type="button"
              onClick={() => scrollTo(index)}
              className={`h-2 w-2 rounded-full bg-gray-300/30 hover:bg-gray-300/60 ${
                activeIndex === index && "outline-none ring-1 ring-gray-300/70 ring-offset-1 ring-offset-gray-300/30"
              }`}
            />
          );
        })}
      </div>
    );
  }, [activeIndex, children, scrollTo]);

  // const NavButtons = useCallback(() => {
  //   return (
  //     <>
  //       <button
  //         type="button"
  //         className="eft-0 group absolute top-0 z-30 hidden h-full cursor-default items-center justify-center px-4 opacity-50 focus:outline-none group-hover:flex">
  //         <span
  //           onClick={handleScrollLeft}
  //           className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-300/30 group-hover:bg-gray-300/60 group-focus:outline-none group-focus:ring-4 group-focus:ring-gray-300/70">
  //           <svg className="h-4 w-4 text-gray-800" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
  //             <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 1 1 5l4 4" />
  //           </svg>
  //           <span className="sr-only">Previous</span>
  //         </span>
  //       </button>
  //       <button
  //         type="button"
  //         className="group absolute right-0 top-0 z-30 hidden h-full cursor-default items-center justify-center px-4 opacity-50 focus:outline-none group-hover:flex">
  //         <span
  //           onClick={handleScrollRight}
  //           className="inline-flex h-10 w-10 cursor-pointer  items-center justify-center rounded-full bg-gray-300/10 group-hover:bg-gray-300/60 group-focus:outline-none group-focus:ring-4 group-focus:ring-gray-300/70">
  //           <svg className="h-4 w-4 text-gray-800" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
  //             <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 9 4-4-4-4" />
  //           </svg>
  //           <span className="sr-only">Next</span>
  //         </span>
  //       </button>
  //     </>
  //   );
  // }, [handleScrollLeft, handleScrollRight]);

  return (
    <div className={`no-scrollbar group relative flex overflow-scroll`}>
      {/* {navButtons && <NavButtons />} */}
      <div
        style={{ width }}
        ref={gridRef}
        onScroll={(e) => setActiveIndex(Math.round(e.currentTarget.scrollLeft / width))}
        className={`no-scrollbar relative flex snap-x snap-mandatory gap-2 overflow-scroll rounded-lg`}>
        {children.map((item, index) => (
          <div className="snap-center" id={index.toString()} key={index}>
            {item}
          </div>
        ))}
      </div>
      {indicators && <Indicators />}
    </div>
  );
}
