import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ZONA_LINE_COLORS,
  ZONAS_ORDEN,
  coordsToLatLngs,
  deleteZonaDivision,
  divisionLabel,
  fetchZonaDivisiones,
  insertZonaDivision,
  renderZonaDivisionesOnMap,
  snapToDivisiones,
  updateZonaDivision,
  type ZonaDivisionRow,
  type ZonaTipo,
} from "@/lib/zona-limites";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, Magnet, Pencil, Plus, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: L.LatLngExpression = [-10.996, -66.062];
const DEFAULT_ZOOM = 13;
const SNAP_THRESHOLD_M = 40;

function safeInvalidate(map: L.Map) {
  try {
    map.invalidateSize({ animate: false });
  } catch {
    /* */
  }
}

export function ZonaLimitesEditor() {
  const { user } = useAuth();
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const savedLayerRef = useRef<L.LayerGroup | null>(null);
  const draftLayerRef = useRef<L.LayerGroup | null>(null);
  const draftMarkersRef = useRef<L.LayerGroup | null>(null);
  const snapPreviewRef = useRef<L.CircleMarker | null>(null);

  const [zonaLadoA, setZonaLadoA] = useState<ZonaTipo>("B");
  const [zonaLadoB, setZonaLadoB] = useState<ZonaTipo>("A");
  const [draftPoints, setDraftPoints] = useState<[number, number][]>([]);
  const [guardados, setGuardados] = useState<ZonaDivisionRow[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [magnetizar, setMagnetizar] = useState(true);

  const draftPointsRef = useRef(draftPoints);
  draftPointsRef.current = draftPoints;
  const guardadosRef = useRef(guardados);
  guardadosRef.current = guardados;
  const magnetizarRef = useRef(magnetizar);
  magnetizarRef.current = magnetizar;
  const editIdRef = useRef(editId);
  editIdRef.current = editId;

  const applySnap = useCallback((lat: number, lng: number): [number, number] => {
    if (!magnetizarRef.current) return [lat, lng];
    const snap = snapToDivisiones(lat, lng, guardadosRef.current, {
      draftPoints: draftPointsRef.current,
      thresholdMeters: SNAP_THRESHOLD_M,
    });
    return [snap.lat, snap.lng];
  }, []);

  const redrawDraft = useCallback(
    (map: L.Map, points: [number, number][]) => {
      const draftLayer = draftLayerRef.current;
      const markersLayer = draftMarkersRef.current;
      if (!draftLayer || !markersLayer) return;
      draftLayer.clearLayers();
      markersLayer.clearLayers();
      if (points.length === 0) return;

      const color = ZONA_LINE_COLORS[zonaLadoA];
      L.polyline(coordsToLatLngs(points), { color, weight: 5, dashArray: "10 6" }).addTo(draftLayer);

      points.forEach(([la, ln], idx) => {
        const marker = L.circleMarker([la, ln], {
          radius: 7,
          color: "#fff",
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
          draggable: true,
        });
        marker.bindTooltip(`Punto ${idx + 1}`, { direction: "top" });
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          const [sLat, sLng] = applySnap(pos.lat, pos.lng);
          marker.setLatLng([sLat, sLng]);
          setDraftPoints((prev) => {
            const next = [...prev];
            next[idx] = [sLat, sLng];
            redrawDraft(map, next);
            return next;
          });
        });
        marker.addTo(markersLayer);
      });
    },
    [applySnap, zonaLadoA],
  );

  const loadGuardados = useCallback(async () => {
    const rows = await fetchZonaDivisiones(true);
    setGuardados(rows);
    const layer = savedLayerRef.current;
    if (layer) renderZonaDivisionesOnMap(layer, rows, { showLabels: true });
  }, []);

  const nuevaLinea = () => {
    setEditId(null);
    setDraftPoints([]);
  };

  const cargarParaEditar = (div: ZonaDivisionRow) => {
    setEditId(div.id);
    setZonaLadoA(div.zona_lado_a);
    setZonaLadoB(div.zona_lado_b);
    setDraftPoints([...div.coordenadas]);
  };

  useEffect(() => {
    const el = mapElRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el).setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    savedLayerRef.current = L.layerGroup().addTo(map);
    draftLayerRef.current = L.layerGroup().addTo(map);
    draftMarkersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on("click", (e) => {
      const [sLat, sLng] = applySnap(e.latlng.lat, e.latlng.lng);
      setDraftPoints((prev) => {
        const next: [number, number][] = [...prev, [sLat, sLng]];
        redrawDraft(map, next);
        return next;
      });
    });

    map.on("mousemove", (e) => {
      if (!magnetizarRef.current) {
        snapPreviewRef.current?.remove();
        snapPreviewRef.current = null;
        return;
      }
      const snap = snapToDivisiones(e.latlng.lat, e.latlng.lng, guardadosRef.current, {
        draftPoints: draftPointsRef.current,
        thresholdMeters: SNAP_THRESHOLD_M,
      });
      if (!snap.snapped) {
        snapPreviewRef.current?.remove();
        snapPreviewRef.current = null;
        return;
      }
      if (!snapPreviewRef.current) {
        snapPreviewRef.current = L.circleMarker([snap.lat, snap.lng], {
          radius: 8,
          color: "#0f172a",
          weight: 2,
          fillColor: "#fbbf24",
          fillOpacity: 0.85,
          interactive: false,
        }).addTo(map);
      } else {
        snapPreviewRef.current.setLatLng([snap.lat, snap.lng]);
      }
    });

    requestAnimationFrame(() => safeInvalidate(map));
    window.setTimeout(() => safeInvalidate(map), 300);

    void (async () => {
      try {
        await loadGuardados();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudieron cargar las líneas.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      map.remove();
      mapRef.current = null;
      savedLayerRef.current = null;
      draftLayerRef.current = null;
      draftMarkersRef.current = null;
      snapPreviewRef.current = null;
    };
  }, [applySnap, loadGuardados, redrawDraft]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    redrawDraft(map, draftPoints);
  }, [draftPoints, redrawDraft, zonaLadoA]);

  const deshacerPunto = () => setDraftPoints((prev) => prev.slice(0, -1));
  const limpiarBorrador = () => {
    setDraftPoints([]);
    setEditId(null);
  };

  const guardar = async () => {
    if (!user) return;
    if (zonaLadoA === zonaLadoB) {
      toast.error("Elija dos zonas distintas para cada lado de la línea.");
      return;
    }
    if (draftPoints.length < 2) {
      toast.error("La línea divisoria necesita al menos 2 puntos.");
      return;
    }
    setSaving(true);
    try {
      if (editIdRef.current) {
        await updateZonaDivision(editIdRef.current, draftPoints, zonaLadoA, zonaLadoB, user.id);
        toast.success("Línea divisoria actualizada.");
      } else {
        await insertZonaDivision(draftPoints, zonaLadoA, zonaLadoB, user.id);
        toast.success(`Línea Zona ${zonaLadoA} | Zona ${zonaLadoB} guardada.`);
      }
      setDraftPoints([]);
      setEditId(null);
      await loadGuardados();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id: string) => {
    setSaving(true);
    try {
      await deleteZonaDivision(id);
      if (editId === id) limpiarBorrador();
      toast.success("Línea eliminada.");
      await loadGuardados();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Dibuje <strong>líneas divisorias</strong> entre dos zonas. Al recorrer la línea del primer punto al
          último, a su <strong>izquierda</strong> queda la zona del selector izquierdo y a su{" "}
          <strong>derecha</strong> la del selector derecho. Use magnetizar para unir líneas en las esquinas.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 max-w-md">
          <div>
            <Label className="text-xs text-muted-foreground">Lado izquierdo</Label>
            <Select value={zonaLadoA} onValueChange={(v) => setZonaLadoA(v as ZonaTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZONAS_ORDEN.map((z) => (
                  <SelectItem key={z} value={z} disabled={z === zonaLadoB}>
                    Zona {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Lado derecho</Label>
            <Select value={zonaLadoB} onValueChange={(v) => setZonaLadoB(v as ZonaTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZONAS_ORDEN.map((z) => (
                  <SelectItem key={z} value={z} disabled={z === zonaLadoA}>
                    Zona {z}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <Switch id="zona-magnetizar" checked={magnetizar} onCheckedChange={setMagnetizar} />
            <Label htmlFor="zona-magnetizar" className="text-sm font-normal flex items-center gap-1.5">
              <Magnet className="h-4 w-4" />
              Magnetizar ({SNAP_THRESHOLD_M} m)
            </Label>
          </div>
          {editId ? (
            <span className="text-xs text-primary font-medium flex items-center gap-1">
              <Pencil className="h-3.5 w-3.5" />
              Editando línea
            </span>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Plus className="h-3.5 w-3.5" />
              Nueva línea
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={deshacerPunto} disabled={!draftPoints.length}>
            <Undo2 className="h-4 w-4 mr-1" />
            Deshacer punto
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={limpiarBorrador}
            disabled={!draftPoints.length && !editId}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Limpiar borrador
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={nuevaLinea}>
            <Plus className="h-4 w-4 mr-1" />
            Nueva línea
          </Button>
          <Button type="button" size="sm" onClick={() => void guardar()} disabled={saving || draftPoints.length < 2}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {editId ? "Actualizar línea" : "Guardar línea"}
          </Button>
          {guardados.length === 1 ? (
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={saving}
              onClick={() => void eliminar(guardados[0].id)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar línea guardada
            </Button>
          ) : null}
        </div>

        {guardados.length > 0 ? (
          <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
            <h2 className="text-sm font-medium">
              Líneas en el mapa ({guardados.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              «Limpiar borrador» no quita líneas ya guardadas. Use <strong>Eliminar</strong> en cada fila o el
              botón rojo si solo hay una.
            </p>
            <ul className="space-y-2">
              {guardados.map((div) => (
                <li
                  key={div.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm",
                    editId === div.id && "border-primary bg-primary/5",
                  )}
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span
                      className="h-0.5 w-8 shrink-0 rounded"
                      style={{ backgroundColor: ZONA_LINE_COLORS[div.zona_lado_a] }}
                    />
                    <span className="truncate">{divisionLabel(div)}</span>
                    <span className="text-xs text-muted-foreground shrink-0">({div.coordenadas.length} pts)</span>
                  </span>
                  <span className="flex gap-1 shrink-0">
                    <Button type="button" size="sm" variant="secondary" onClick={() => cargarParaEditar(div)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={saving}
                      onClick={() => void eliminar(div.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Eliminar
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <div className="relative rounded-lg border overflow-hidden" style={{ height: "min(60vh, 480px)" }}>
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/40 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Cargando mapa…
          </div>
        ) : null}
        <div ref={mapElRef} className="h-full w-full min-h-[280px]" />
      </div>
    </div>
  );
}
