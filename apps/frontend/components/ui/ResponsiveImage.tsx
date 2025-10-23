"use client";
import Image, { ImageProps } from "next/image";

type Props = Omit<ImageProps, "fill"> & {
  rounded?: boolean;
};

export default function ResponsiveImage({ rounded = true, className, ...rest }: Props) {
  // Always pass width/height + sizes to avoid CLS and shrink on mobile
  return (
    <Image
      className={clsx(rounded && "rounded-2xl", className)}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 60vw, 800px"
      loading={rest.priority ? undefined : "lazy"}
      {...rest}
    />
  );
}

function clsx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}
