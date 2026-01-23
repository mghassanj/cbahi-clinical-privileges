"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BentoGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const BentoGrid: React.FC<BentoGridProps> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "grid auto-rows-[minmax(180px,auto)] gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface BentoGridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: 1 | 2 | 3 | 4;
  rowSpan?: 1 | 2 | 3;
  children: React.ReactNode;
}

const BentoGridItem: React.FC<BentoGridItemProps> = ({
  className,
  colSpan = 1,
  rowSpan = 1,
  children,
  ...props
}) => {
  const colSpanClasses = {
    1: "col-span-1",
    2: "col-span-1 sm:col-span-2",
    3: "col-span-1 sm:col-span-2 lg:col-span-3",
    4: "col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4",
  };

  const rowSpanClasses = {
    1: "row-span-1",
    2: "row-span-1 sm:row-span-2",
    3: "row-span-1 sm:row-span-2 lg:row-span-3",
  };

  return (
    <div
      className={cn(colSpanClasses[colSpan], rowSpanClasses[rowSpan], className)}
      {...props}
    >
      {children}
    </div>
  );
};

export { BentoGrid, BentoGridItem };
