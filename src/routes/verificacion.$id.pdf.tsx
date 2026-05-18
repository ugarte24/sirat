import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseVerificacionSearch } from "@/lib/verificacion-notificacion";

/** QRs antiguos con /pdf redirigen a la vista con descarga automática. */
export const Route = createFileRoute("/verificacion/$id/pdf")({
  validateSearch: (search) => parseVerificacionSearch(search),
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/verificacion/$id",
      params: { id: params.id },
      search,
    });
  },
});
