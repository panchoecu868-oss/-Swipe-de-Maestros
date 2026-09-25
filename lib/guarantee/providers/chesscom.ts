/**
 * Chess.com — PENDIENTE DE VERIFICAR.
 * Documentación oficial: https://www.chess.com/news/view/published-data-api
 * No se pudo leer desde el entorno de desarrollo (dominio bloqueado) y la regla del proyecto
 * prohíbe asumir formatos. Hasta leerla y cablear el parser, este proveedor falla explícitamente
 * y la UI muestra el seguimiento como "pendiente" en lugar de un dato inventado.
 */
import { ProviderError, type RatingProvider } from "./types";

export function chesscomProvider(): RatingProvider {
  return {
    platform: "chesscom",
    verified: false,
    async fetchRating() {
      throw new ProviderError("Integración con Chess.com pendiente de verificar su documentación oficial", "not_verified");
    },
  };
}
