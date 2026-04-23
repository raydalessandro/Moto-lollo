import type { Profile, Motorcycle } from "@/types/domain";

export const currentUser: Profile = {
  id: "u0",
  username: "ray",
  displayName: "Ray",
  bio: "Touring / passi alpini / colazioni lunghe.",
  initials: "RY",
  accentColor: "#ff6a1f",
  role: "user",
  isPublic: true,
  city: "Brescia",
  createdAt: "2024-05-01T00:00:00Z",
};

export const myMotorcycles: Motorcycle[] = [
  {
    id: "m1",
    ownerId: "u0",
    name: "Panigale",
    brand: "Ducati",
    model: "Panigale V4 S",
    year: 2022,
    engineCc: 1103,
    color: "Rosso Ducati",
    totalKm: 12840,
    isPrimary: true,
  },
  {
    id: "m2",
    ownerId: "u0",
    name: "Africa",
    brand: "Honda",
    model: "Africa Twin Adventure Sports",
    year: 2020,
    engineCc: 1084,
    color: "Tricolore",
    totalKm: 34210,
    isPrimary: false,
  },
];
