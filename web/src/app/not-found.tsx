import { StatusScreen } from "@/components/StatusScreen";

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      title="No encontramos esa página"
      message="La dirección cambió o no existe. Volvé al inicio o revisá la URL."
      icon="search"
      action={{ label: "Volver al inicio", href: "/" }}
    />
  );
}