import React, { useCallback, useEffect, useRef, useState } from "react";

import useWindowDimensions from "@/hooks/useWindowDimensions";

type Props = {
  children: React.ReactNode[];
  autoScroll?: boolean;
  navButtons?: boolean;
  delay?: number;
  activeIndex?: number;
};

export default function Carousel({ children, activeIndex: activeIndexProp = 0 }: Props) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const { width: windowWidth } = useWindowDimensions();

  useEffect(() => {
    gridRef.current && gridRef.current.children[0] instanceof HTMLElement && setWidth(gridRef.current.children[0].offsetWidth);
  }, [windowWidth]);

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

  return (
    <div className={`no-scrollbar group relative flex overflow-scroll`}>
      <div style={{ width }} ref={gridRef} className={`no-scrollbar relative flex snap-x snap-mandatory gap-2 overflow-scroll rounded-lg`}>
        {children.map((item, index) => (
          <div className="snap-center" id={index.toString()} key={index}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
