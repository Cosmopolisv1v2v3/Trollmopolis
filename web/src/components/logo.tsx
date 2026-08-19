import Image from "next/image";

export function LogoImage({ src = "/logo.png" }) {
  return <Image src={src} width={600} height={600} alt="Cosmopilos logo" />;
}
