import Image from "next/image";

export const mdxComponents = {
  img: (props: any) => (
    <Image
      src={props.src}
      alt={props.alt ?? ""}
      width={1200}
      height={630}
      sizes="(max-width: 768px) 100vw, 800px"
      style={{ width: "100%", height: "auto", borderRadius: 12 }}
    />
  ),
};
