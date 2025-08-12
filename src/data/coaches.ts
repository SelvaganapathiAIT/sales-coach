import jackDalyImage from "/lovable-uploads/bfd00aef-a819-4ff4-9b0c-a5cf0fd019dd.png";

export interface CoachData {
  name: string;
  title: string;
  image: string;
  description: string;
  rating: number;
  reviews: number;
  specialties: string[];
  isLegend: boolean;
  price: string;
  email: string;
}

const emailFromName = (name: string) => {
  const clean = name.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return `${parts[0]}.${parts[parts.length - 1]}@salescoaches.ai`;
  return `${clean.replace(/\s+/g, ".")}@salescoaches.ai`;
};

export const salesLegends: CoachData[] = [
  {
    name: "Jack Daly",
    title: "Sales Legend & Best-Selling Author",
    image: jackDalyImage,
    description:
      "Former CEO of 6 companies, authored 8 books on sales and leadership. Known for aggressive sales strategies and team building excellence.",
    rating: 4.9,
    reviews: 127,
    specialties: ["Team Building", "Sales Leadership", "Prospecting", "Closing"],
    isLegend: true,
    price: "$497",
    email: emailFromName("Jack Daly"),
  },
  {
    name: "Bobby Hartline",
    title: "Sales Coach",
    image: "/api/placeholder/80/80",
    description: "Trusted sales coach focused on practical execution and consistent pipeline growth.",
    rating: 4.8,
    reviews: 64,
    specialties: ["Prospecting", "Coaching", "Accountability"],
    isLegend: true,
    price: "$297",
    email: "bobby.hartline@salescoaches.ai",
  },
];

export const industryCoaches: CoachData[] = [
  {
    name: "AutoGlass Pro Coach",
    title: "Autoglass Sales Specialist",
    image: "/api/placeholder/80/80",
    description:
      "Specialized AI coach trained on autoglass industry best practices, customer objections, and seasonal sales strategies.",
    rating: 4.8,
    reviews: 89,
    specialties: ["Insurance Claims", "B2B Sales", "Seasonal Strategy"],
    isLegend: false,
    price: "$197",
    email: emailFromName("AutoGlass Pro Coach"),
  },
  {
    name: "Industrial Gas Expert",
    title: "Industrial Gas Sales Manager",
    image: "/api/placeholder/80/80",
    description:
      "Expert in industrial gas sales, equipment leasing, and long-term contract negotiations with manufacturing clients.",
    rating: 4.7,
    reviews: 156,
    specialties: ["Contract Negotiation", "Equipment Sales", "Safety Compliance"],
    isLegend: false,
    price: "$197",
    email: emailFromName("Industrial Gas Expert"),
  },
  {
    name: "Building Supplies Champion",
    title: "Construction Sales Pro",
    image: "/api/placeholder/80/80",
    description:
      "Specialized in building supplies, contractor relationships, and large project bidding strategies.",
    rating: 4.8,
    reviews: 203,
    specialties: ["Contractor Relations", "Project Bidding", "Material Sourcing"],
    isLegend: false,
    price: "$197",
    email: emailFromName("Building Supplies Champion"),
  },
];
