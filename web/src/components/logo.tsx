import Image from "next/image";

export function LogoImage({ src = "/logo.png", w = 600, h = 600 }) {
  return <Image src={src} width={w} height={h} alt="Cosmopilos logo" />;
}
