import type {
  Motorcycle,
  MaintenanceRecord,
  Document,
  UUID,
} from "@/types/domain";
import { addDays } from "../rng";
import { NOW } from "./people";

interface BikeSeed {
  id: UUID;
  ownerId: UUID;
  kind?: "moto" | "auto";
  brand: string;
  model: string;
  name: string;
  year: number;
  engineCc: number;
  color?: string;
  totalKm: number;
  isPrimary: boolean;
}

const BIKES: BikeSeed[] = [
  // Ray (moto + 1 auto, per testare anche il caso quattro ruote)
  { id: "m1",    ownerId: "u0",        brand: "Ducati",   model: "Panigale V4 S",         name: "Panigale",   year: 2022, engineCc: 1103, color: "Rosso Ducati",   totalKm: 12840, isPrimary: true  },
  { id: "m2",    ownerId: "u0",        brand: "Honda",    model: "Africa Twin Adv Sports", name: "Africa",    year: 2020, engineCc: 1084, color: "Tricolore",       totalKm: 34210, isPrimary: false },
  { id: "m3",    ownerId: "u0", kind: "auto", brand: "Alfa Romeo", model: "Giulia Veloce", name: "Giulia",  year: 2021, engineCc: 1995, color: "Rosso Alfa",     totalKm: 38450, isPrimary: false },
  // Altri rider — 1 moto primaria a testa
  { id: "b_mar", ownerId: "u_marco",   brand: "Ducati",   model: "Panigale V4 S",         name: "V4S",        year: 2023, engineCc: 1103, color: "Rosso",           totalKm:  8100, isPrimary: true  },
  { id: "b_giu", ownerId: "u_giulia",  brand: "Yamaha",   model: "MT-09 SP",              name: "MT",         year: 2022, engineCc:  889, color: "Icon blu",        totalKm: 14300, isPrimary: true  },
  { id: "b_luc", ownerId: "u_luca",    brand: "BMW",      model: "R 1250 GS",             name: "GS",         year: 2021, engineCc: 1254, color: "Rallye",          totalKm: 42100, isPrimary: true  },
  { id: "b_and", ownerId: "u_andrea",  brand: "Suzuki",   model: "V-Strom 1050 XT",       name: "V-Strom",    year: 2020, engineCc: 1037, color: "Giallo",          totalKm: 36780, isPrimary: true  },
  { id: "b_sar", ownerId: "u_sara",    brand: "Kawasaki", model: "Z650",                   name: "Z650",      year: 2022, engineCc:  649, color: "Verde Kawa",      totalKm:  9400, isPrimary: true  },
  { id: "b_pao", ownerId: "u_paolo",   brand: "Yamaha",   model: "Tracer 900",             name: "Tracer",    year: 2019, engineCc:  847, color: "Grigio",          totalKm: 52000, isPrimary: true  },
  { id: "b_ele", ownerId: "u_elena",   brand: "Honda",    model: "CB500F",                 name: "CB",        year: 2024, engineCc:  471, color: "Nero opaco",      totalKm:  2300, isPrimary: true  },
  { id: "b_ann", ownerId: "u_anna",    brand: "BMW",      model: "R 1250 GS Adventure",    name: "GSA",       year: 2022, engineCc: 1254, color: "Ice grey",        totalKm: 28900, isPrimary: true  },
  { id: "b_dav", ownerId: "u_davide",  brand: "Honda",    model: "Africa Twin Adv Sports", name: "Africa",    year: 2023, engineCc: 1084, color: "Tricolore",       totalKm: 18400, isPrimary: true  },
  { id: "b_sof", ownerId: "u_sofia",   brand: "Yamaha",   model: "Tenerè 700",             name: "Tenerè",   year: 2023, engineCc:  689, color: "Ceramic Ice",     totalKm: 21500, isPrimary: true  },
  { id: "b_mat", ownerId: "u_matteo",  brand: "KTM",      model: "890 Adventure",          name: "890",       year: 2022, engineCc:  889, color: "Arancio KTM",     totalKm: 17200, isPrimary: true  },
  { id: "b_gio", ownerId: "u_giorgio", brand: "Yamaha",   model: "XT 660 Z Ténéré",         name: "XT",       year: 2016, engineCc:  660, color: "Bianco",          totalKm: 68000, isPrimary: true  },
  { id: "b_fed", ownerId: "u_fede",    brand: "Ducati",   model: "Panigale V4 R",          name: "V4R",       year: 2024, engineCc:  998, color: "Rosso",           totalKm:  4100, isPrimary: true  },
  { id: "b_lor", ownerId: "u_loris",   brand: "Yamaha",   model: "YZF-R1M",                name: "R1M",       year: 2023, engineCc:  998, color: "Carbon",          totalKm:  3200, isPrimary: true  },
  { id: "b_max", ownerId: "u_max",     brand: "Ducati",   model: "Panigale V4",            name: "V4",        year: 2022, engineCc: 1103, color: "Rosso",           totalKm:  7800, isPrimary: true  },
  { id: "b_dan", ownerId: "u_dani",    brand: "Ducati",   model: "Scrambler Icon",         name: "Scr",       year: 2019, engineCc:  803, color: "Giallo",          totalKm: 24000, isPrimary: true  },
];

export function seedMotorcycles(): Record<UUID, Motorcycle> {
  const out: Record<UUID, Motorcycle> = {};
  for (const b of BIKES) {
    out[b.id] = {
      id: b.id,
      ownerId: b.ownerId,
      kind: b.kind,
      name: b.name,
      brand: b.brand,
      model: b.model,
      year: b.year,
      engineCc: b.engineCc,
      color: b.color,
      totalKm: b.totalKm,
      isPrimary: b.isPrimary,
      purchasedAt: addDays(NOW, -((new Date().getUTCFullYear() - b.year) * 365 + 120)),
    };
  }
  return out;
}

export function seedMaintenance(): Record<UUID, MaintenanceRecord> {
  const out: Record<UUID, MaintenanceRecord> = {};
  const mk = (id: string, kind: MaintenanceRecord["kind"], daysAgo: number, km: number, notes: string, cost?: number) => {
    out[id] = {
      id,
      motorcycleId: "m1",
      kind,
      date: addDays(NOW, -daysAgo),
      kmAtService: km,
      notes,
      costEur: cost,
    };
  };
  mk("mn1", "tagliando", 30,  12500, "Tagliando 12k — filtri, olio, controllo freni.", 420);
  mk("mn2", "gomme",     95,  11200, "Pilot Power 6 montate.", 380);
  mk("mn3", "olio",     210,   9800, "Cambio olio extra — viaggio in Dolomiti imminente.", 60);
  mk("mn4", "catena",   280,   9100, "Tensionamento + lubrifica.", 0);
  mk("mn5", "pastiglie",420,   6800, "Anteriori cambiate.", 95);
  mk("mn6", "tagliando",500,   6000, "Tagliando 6k — primo ufficiale.", 380);
  return out;
}

export function seedDocuments(): Record<UUID, Document> {
  const out: Record<UUID, Document> = {};
  const mk = (id: string, kind: Document["kind"], daysFromNow: number, motorcycleId?: UUID, notes?: string) => {
    out[id] = {
      id,
      ownerId: "u0",
      motorcycleId,
      kind,
      expiresAt: addDays(NOW, daysFromNow),
      notes,
    };
  };
  mk("d1", "assicurazione",  180, "m1", "Moto primaria — RC + furto/incendio.");
  mk("d2", "bollo",           95, "m1");
  mk("d3", "revisione",       22, "m1", "Attenzione: scade a breve.");
  mk("d4", "patente",        920, undefined, "Scadenza lunga.");
  return out;
}
