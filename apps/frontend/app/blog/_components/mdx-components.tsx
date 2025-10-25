import Image from "next/image";

export const mdxComponents = {
  img: (props: any) => (
    <Image
      src={props.src}
      alt={props.alt ?? ""}
      width={1200}
      height={630}
      sizes="(max-width: 768px) 100vw, 800px"
      style={{ 
        width: "100%", 
        height: "auto", 
        borderRadius: "12px",
        margin: "1rem 0"
      }}
      className="blog-image"
    />
  ),
  h1: (props: any) => (
    <h1 className="text-4xl font-bold mb-6 text-primary" {...props} />
  ),
  h2: (props: any) => (
    <h2 className="text-3xl font-bold mb-4 text-primary mt-8" {...props} />
  ),
  h3: (props: any) => (
    <h3 className="text-2xl font-semibold mb-3 text-primary mt-6" {...props} />
  ),
  p: (props: any) => (
    <p className="text-base leading-relaxed mb-4 text-foreground" {...props} />
  ),
  ul: (props: any) => (
    <ul className="list-disc list-inside mb-4 space-y-2" {...props} />
  ),
  ol: (props: any) => (
    <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />
  ),
  li: (props: any) => (
    <li className="text-base leading-relaxed text-foreground" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4" {...props} />
  ),
  code: (props: any) => (
    <code className="bg-muted px-2 py-1 rounded text-sm font-mono" {...props} />
  ),
  pre: (props: any) => (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4" {...props} />
  ),
};
