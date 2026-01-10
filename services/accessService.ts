
import { AccountStatus, UserRole } from "../types";

/**
 * Definição dos códigos válidos e as suas propriedades.
 * No futuro, isto pode ser movido para uma coleção no Firestore.
 */
const ACCESS_KEYS: Record<string, { status: AccountStatus; role: UserRole; label: string }> = {
  "BRUNO_MASTER": { status: "admin", role: "owner", label: "Sistema Master" },
  "BRUNO_VIP": { status: "active", role: "user", label: "VIP Bruno" },
  "PROMO2025": { status: "active", role: "user", label: "Campanha 2025" },
  "BETA_TESTER": { status: "trial", role: "user", label: "Beta Test Group" },
  "MASTER_KEY": { status: "active", role: "user", label: "Chave Geral" },
};

export const accessService = {
  /**
   * Valida um código de entrada
   */
  validateCode: (code: string) => {
    const cleanCode = code.toUpperCase().trim();
    const config = ACCESS_KEYS[cleanCode];
    
    if (!config) return null;
    
    return {
      isValid: true,
      ...config
    };
  },

  /**
   * Verifica se um email específico tem privilégios de Admin
   * Podes adicionar aqui o teu email pessoal para segurança extra.
   */
  isAdmin: (email: string) => {
    const admins = ["bruno@admin.com", "teu-email@gmail.com"]; // Configura aqui
    return admins.includes(email.toLowerCase());
  }
};
