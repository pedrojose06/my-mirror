# Formulário "Segurança dos dados" (Data Safety) — respostas sugeridas

O Play Console faz um questionário sobre coleta/uso de dados. Abaixo, o que
declarar com base no que o app realmente faz.

## Visão geral
- **O app coleta ou compartilha dados do usuário?** Sim (coleta).
- **Todos os dados em trânsito são criptografados?** Sim (HTTPS).
- **O usuário pode pedir exclusão dos dados?** Sim (por e-mail de suporte).

## Tipos de dados — declarar como COLETADOS

| Tipo | Coletado | Compartilhado | Finalidade | Obrigatório? |
|---|---|---|---|---|
| **E-mail** | Sim | Não | Gerenciamento da conta; autenticação | Opcional (só se criar conta) |
| **Fotos** | Sim | Não* | Funcionalidade do app (avaliar o look) | Obrigatório para avaliar |
| **IDs do dispositivo** | Sim | Não | Controle do limite gratuito / antifraude | Obrigatório |
| **Preferências do app** (estilo/cores) | Sim | Não | Personalização | Opcional |

\* As fotos são enviadas a um provedor de IA (Google) apenas para processar a
avaliação e **não são armazenadas**. No formulário, marque "Processada
efemeramente" (processed ephemerally) para Fotos, se disponível.

## Pontos importantes a marcar
- **Fotos → "Os dados são processados de forma efêmera"**: SIM (não armazenamos).
- **E-mail → finalidade**: "Gerenciamento de conta".
- **IDs do dispositivo → finalidade**: "Prevenção de fraudes/segurança" e/ou
  "Funcionalidade do app".
- **Criptografia em trânsito**: SIM.
- **Métodos de exclusão**: o usuário pode solicitar exclusão (e-mail de suporte).

## Não declarar (porque não usamos)
- Localização
- Contatos / agenda
- Mensagens / SMS
- Dados financeiros
- Rastreamento para publicidade de terceiros / SDKs de anúncios

## Observação
A camada "ADS" do Luxai é **interna** (produtos patrocinados que combinam com o
look) — **não** é uma rede de anúncios de terceiros nem rastreia o usuário,
então não conta como "publicidade" no formulário.
