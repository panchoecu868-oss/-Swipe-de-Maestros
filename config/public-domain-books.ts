/**
 * Libros de ajedrez de dominio público (Project Gutenberg).
 * Cada entrada se verificó leyendo la cabecera del texto oficial (Title/Author/EBook #) y la página
 * de derechos del propio libro. Al descargar, el script vuelve a comprobar título y autor y aborta si no coinciden.
 *
 * Licencia: Project Gutenberg los distribuye como dominio público EN EE. UU. En otros países depende de la
 * fecha de muerte del autor (vida + 50/70/80 años según el país): verifícalo antes de vender allí.
 */
export interface PublicDomainBook {
  slug: string;
  gutenbergId: number;
  title: string;
  author: string;
  /** Año de la edición que reproduce el texto (según su página de derechos). */
  year: number;
  /** Tal como aparecen en la cabecera de Gutenberg (se usan para verificar la descarga). */
  headerTitle: string;
  headerAuthor: string;
  notation: "descriptiva" | "algebraica" | "sin partidas";
  /** Qué trae el texto que el pipeline puede usar para verificar posiciones. */
  positions: string;
  /** Recorta partes que no son de ajedrez (se corta en la última línea que cumpla la regex). */
  cutAtLastLine?: string;
  notes?: string;
}

export const PUBLIC_DOMAIN_BOOKS: PublicDomainBook[] = [
  {
    slug: "capablanca-chess-fundamentals",
    gutenbergId: 33870,
    title: "Chess Fundamentals",
    author: "José Raúl Capablanca",
    year: 1921,
    headerTitle: "Chess Fundamentals",
    headerAuthor: "Jose Raul Capablanca",
    notation: "descriptiva",
    positions: "Paginación original {n} (se cita por página real). Los diagramas son imágenes ([Illustration]): solo sirven las posiciones que el texto da como jugadas o lista de piezas.",
  },
  {
    slug: "lasker-chess-strategy",
    gutenbergId: 5614,
    title: "Chess Strategy (2.ª ed., trad. J. Du Mont)",
    author: "Edward Lasker",
    year: 1915,
    headerTitle: "Chess Strategy",
    headerAuthor: "Edward Lasker",
    notation: "descriptiva",
    positions: "167 diagramas en ASCII (^ blancas, # negras) que el parser convierte a FEN sin intervención del modelo.",
  },
  {
    slug: "lasker-chess-and-checkers",
    gutenbergId: 4913,
    title: "Chess and Checkers: The Way to Mastership (parte de ajedrez)",
    author: "Edward Lasker",
    year: 1918,
    headerTitle: "Chess and Checkers: The Way to Mastership",
    headerAuthor: "Edward Lasker",
    notation: "algebraica",
    positions: "Diagramas en ASCII y notación algebraica. Se excluye la Parte II (damas).",
    cutAtLastLine: "^PART II\\b",
  },
  {
    slug: "young-chess-generalship",
    gutenbergId: 55278,
    title: "Chess Generalship, Vol. I: Grand Reconnaissance",
    author: "Franklin K. Young",
    year: 1910,
    headerTitle: "Chess Generalship, Vol. I. Grand Reconnaissance",
    headerAuthor: "Franklin K. Young",
    notation: "sin partidas",
    positions: "Teoría en lenguaje militar, casi sin posiciones concretas: rendirá pocas lecciones verificables.",
    notes: "Prioridad baja.",
  },
];

/** Fuentes en orden: servidor oficial de Gutenberg y espejo GITenberg en GitHub (verificado). */
export function gutenbergSources(b: PublicDomainBook): string[] {
  const slugRepo: Record<number, string> = {
    33870: "Chess-Fundamentals_33870/master/33870.txt",
    5614: "Chess-Strategy_5614/master/5614.txt",
    4913: "Chess-and-Checkers-the-Way-to-Mastership_4913/master/4913.txt",
    55278: "Chess-Generalship-Vol-I-Grand-Reconnaissance_55278/master/55278-0.txt",
  };
  return [
    `https://www.gutenberg.org/cache/epub/${b.gutenbergId}/pg${b.gutenbergId}.txt`,
    ...(slugRepo[b.gutenbergId] ? [`https://raw.githubusercontent.com/GITenberg/${slugRepo[b.gutenbergId]}`] : []),
  ];
}

export const gutenbergPage = (id: number) => `https://www.gutenberg.org/ebooks/${id}`;

export function licenseNote(b: PublicDomainBook): string {
  return `Dominio público en EE. UU. (Project Gutenberg #${b.gutenbergId}). Fuera de EE. UU. verifica la ley local.`;
}
