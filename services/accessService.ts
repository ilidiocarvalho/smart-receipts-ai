
import { AccountStatus, UserRole } from "../types";

/**
 * Definição dos códigos válidos e as suas propriedades.
 * Versão 1.2.0: Removidos códigos que atribuem privilégios de Admin diretamente.
 * O privilégio 'owner' deve ser atribuído manualmente na Consola do Firebase.
 */
const ACCESS_KEYS: Record<string, { status: AccountStatus; role: UserRole; label: string }> = {
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
  }
};
