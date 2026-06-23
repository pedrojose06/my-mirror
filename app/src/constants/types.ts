// Espelha o schema do backend — manter em sincronia

export interface StyleProfile {
  // presets (trabalho/casual/evento/esporte) ou texto livre quando "Outra"
  ocasiao: string;
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
  descricao_look?: string;
}

export type AdequacaoOcasiao = EvaluationResult["adequacao_ocasiao"];

export interface SuggestionItem {
  nome: string;
  descricao: string;
  loja: string;
  preco?: string;
  url?: string;
  imagem?: string;
  patrocinado: boolean;
}
