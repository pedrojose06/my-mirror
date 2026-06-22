// Espelha o schema do backend — manter em sincronia

export interface StyleProfile {
  ocasiao: "trabalho" | "casual" | "evento" | "esporte";
  estilo: string;
  cores_que_gosta: string[];
  cores_que_evita: string[];
  formalidade: "baixa" | "média" | "alta";
  observacoes_extras?: string;
}

export interface EvaluationResult {
  nota: number;
  resumo_voz: string;
  pontos_fortes: string[];
  sugestoes: string[];
  adequacao_ocasiao: "ótimo" | "adequado" | "parcialmente adequado" | "inadequado";
}

export type AdequacaoOcasiao = EvaluationResult["adequacao_ocasiao"];
