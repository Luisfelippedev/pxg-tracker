import { AxiosError } from "axios";

/**
 * Extrai e exibe a mensagem retornada pelo backend.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Ocorreu um erro inesperado. Tente novamente.";
  }

  const axiosError = error as AxiosError<{ message?: string | string[] }>;
  const message = axiosError.response?.data?.message;

  if (!axiosError.response) {
    return "Não foi possível conectar. Verifique sua internet e tente novamente.";
  }

  if (typeof message === "string") return message;
  if (Array.isArray(message) && message.length > 0) return message.join(" ");

  return "Não foi possível completar a operação. Tente novamente.";
}
